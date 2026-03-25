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

  const payload = await res.json()
  return payload
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
      itemId,
      name = '',
      role = '',
      bureau = '',
      location = '',
      fee = '',
      bio = '',
      topics = [],
    } = body

    if (!itemId) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing itemId' }),
      }
    }

    // Resolve column IDs once per request so board title case/spelling variants are tolerated.
    const columnsQuery = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns { id title type }
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

    const updates = [
      { id: roleId, key: 'role', value: role },
      { id: bureauId, key: 'bureau', value: bureau },
      { id: locationId, key: 'location', value: location },
      { id: feeId, key: 'fee', value: fee },
      { id: notesId, key: 'notes', value: bio },
      { id: topicsId, key: 'topics', value: Array.isArray(topics) ? topics.join(', ') : String(topics || '') },
    ].filter((u) => Boolean(u.id))

    const errors = []
    for (const update of updates) {
      const columnType = typeById[update.id]
      let payload

      // Tags/dropdown/status-like columns often require label IDs.
      // Use simple value where possible; skip hard-fail for unsupported types.
      if (columnType === 'long_text') {
        payload = await updateJsonValue(token, boardId, itemId, update.id, { text: update.value || '' })
      } else if (columnType === 'tags') {
        // Write tags as plain text fallback; if board disallows this, we skip with warning.
        payload = await updateSimpleValue(token, boardId, itemId, update.id, update.value || '')
      } else {
        payload = await updateSimpleValue(token, boardId, itemId, update.id, update.value || '')
      }

      if (payload?.errors?.length) {
        errors.push(`${update.key}: ${payload.errors[0]?.message || 'Update failed'}`)
      }
    }

    if (errors.length) {
      return {
        statusCode: 207,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: true,
          warning: 'Saved with partial column errors',
          errors,
        }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message || 'Unknown error' }),
    }
  }
}

