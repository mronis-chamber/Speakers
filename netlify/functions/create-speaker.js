const COLUMN_ALIASES = {
  role: ['Current Title', 'CURRENT TITLE', 'Current Tittle', 'CURRENT TITTLE'],
  bureau: ['SPEAKERS BUREAU', 'Speakers Bureau'],
  location: ['LOCATION', 'Location'],
  fee: ['FEE RANGE', 'Fee Range'],
  topics: ['KEYWORD TAGS', 'Keyword Tags'],
  notes: ['Notes', 'NOTES'],
}

function normalizeTitle(title) {
  return String(title || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function buildColumnTitleMap(columns) {
  return columns.reduce((acc, col) => {
    acc[normalizeTitle(col.title)] = col.id
    return acc
  }, {})
}

function findColumnId(titleToId, aliases) {
  for (const alias of aliases) {
    const id = titleToId[normalizeTitle(alias)]
    if (id) return id
  }
  return null
}

async function mondayRequest(token, query, variables) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

async function updateSimpleValue(token, boardId, itemId, columnId, value) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }
  `
  return mondayRequest(token, mutation, {
    boardId,
    itemId: String(itemId),
    columnId,
    value: value ?? '',
  })
}

async function updateJsonValue(token, boardId, itemId, columnId, valueObject) {
  const mutation = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }
  `
  return mondayRequest(token, mutation, {
    boardId,
    itemId: String(itemId),
    columnId,
    value: JSON.stringify(valueObject),
  })
}

function buildTagLabelIdMap(settingsStr) {
  try {
    const parsed = JSON.parse(settingsStr || '{}')
    const labels = parsed?.labels || {}
    const map = {}
    Object.entries(labels).forEach(([id, label]) => {
      map[String(label).trim().toLowerCase()] = Number(id)
    })
    return map
  } catch {
    return {}
  }
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    }
  }

  const token = process.env.MONDAY_API_TOKEN
  const boardId = process.env.MONDAY_BOARD_ID || '5879530432'
  if (!token) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Missing MONDAY_API_TOKEN' }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      name = '',
      role = '',
      bureau = '',
      location = '',
      fee = '',
      bio = '',
      topics = [],
    } = body

    if (!name.trim()) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Name is required' }),
      }
    }

    const columnsQuery = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type settings_str }
        }
      }
    `
    const columnsPayload = await mondayRequest(token, columnsQuery, { boardId })
    if (columnsPayload?.errors?.length) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: columnsPayload.errors[0]?.message || 'Failed to read board columns' }),
      }
    }

    const columns = columnsPayload?.data?.boards?.[0]?.columns || []
    const titleToId = buildColumnTitleMap(columns)
    const typeById = columns.reduce((acc, c) => {
      acc[c.id] = c.type
      return acc
    }, {})

    const roleId = findColumnId(titleToId, COLUMN_ALIASES.role)
    const bureauId = findColumnId(titleToId, COLUMN_ALIASES.bureau)
    const locationId = findColumnId(titleToId, COLUMN_ALIASES.location)
    const feeId = findColumnId(titleToId, COLUMN_ALIASES.fee)
    const notesId = findColumnId(titleToId, COLUMN_ALIASES.notes)
    const topicsId = findColumnId(titleToId, COLUMN_ALIASES.topics)

    const createMutation = `
      mutation ($boardId: ID!, $itemName: String!) {
        create_item(board_id: $boardId, item_name: $itemName) { id name }
      }
    `
    const createPayload = await mondayRequest(token, createMutation, {
      boardId,
      itemName: name.trim(),
    })

    if (createPayload?.errors?.length) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: createPayload.errors[0]?.message || 'Failed to create item' }),
      }
    }

    const item = createPayload?.data?.create_item
    const itemId = item?.id
    if (!itemId) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Monday did not return created item id' }),
      }
    }

    const updates = [
      { id: roleId, key: 'role', value: role },
      { id: bureauId, key: 'bureau', value: bureau },
      { id: locationId, key: 'location', value: location },
      { id: feeId, key: 'fee', value: fee },
      { id: notesId, key: 'notes', value: bio },
      { id: topicsId, key: 'topics', value: Array.isArray(topics) ? topics : [] },
    ].filter((u) => Boolean(u.id))

    const errors = []
    for (const update of updates) {
      const columnType = typeById[update.id]
      let payload

      if (update.key === 'topics') {
        if (columnType === 'tags') {
          const col = columns.find((c) => c.id === update.id)
          const labelToId = buildTagLabelIdMap(col?.settings_str)
          const tagIds = update.value
            .map((t) => labelToId[String(t).trim().toLowerCase()])
            .filter((v) => Number.isFinite(v))

          if (tagIds.length > 0) {
            payload = await updateJsonValue(token, boardId, itemId, update.id, { tag_ids: tagIds })
          } else {
            payload = await updateSimpleValue(token, boardId, itemId, update.id, update.value.join(', '))
          }
        } else {
          payload = await updateSimpleValue(token, boardId, itemId, update.id, update.value.join(', '))
        }
      } else if (columnType === 'long_text') {
        payload = await updateJsonValue(token, boardId, itemId, update.id, { text: update.value || '' })
      } else {
        payload = await updateSimpleValue(token, boardId, itemId, update.id, update.value || '')
      }

      if (payload?.errors?.length) {
        errors.push(`${update.key}: ${payload.errors[0]?.message || 'Update failed'}`)
      }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        itemId: String(itemId),
        warning: errors.length ? 'Created item with partial column errors' : null,
        errors,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message || 'Unknown error' }),
    }
  }
}

