/** Subitem columns (same title matching as speakers.js) */
const SUBITEM_ALIASES = {
  label: ['Subitem', 'SUBITEM'],
  contactEmail: ['CONTACT EMAIL', 'Contact Email'],
  contactCell: ['CONTACT CELL', 'Contact Cell'],
  secondaryContact: ['SECONDARY CONTACT', 'Secondary Contact'],
  secondaryEmail: ['SECONDARY EMAIL', 'Secondary Email'],
  secondaryCell: ['SECONDARY CELL', 'Secondary Cell'],
  chamberContact: ['CHAMBER CONTACT', 'Chamber Contact'],
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
      subitemId,
      label = '',
      contactEmail = '',
      contactCell = '',
      secondaryContact = '',
      secondaryEmail = '',
      secondaryCell = '',
      chamberContact = '',
    } = body

    if (!subitemId) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing subitemId' }),
      }
    }

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
        body: JSON.stringify({
          ok: false,
          error: columnsPayload.errors[0]?.message || 'Failed to read board columns',
        }),
      }
    }

    const columns = columnsPayload?.data?.boards?.[0]?.columns || []
    const titleToId = buildColumnTitleMap(columns)
    const typeById = columns.reduce((acc, c) => {
      acc[c.id] = c.type
      return acc
    }, {})

    const fieldToAliases = {
      label: SUBITEM_ALIASES.label,
      contactEmail: SUBITEM_ALIASES.contactEmail,
      contactCell: SUBITEM_ALIASES.contactCell,
      secondaryContact: SUBITEM_ALIASES.secondaryContact,
      secondaryEmail: SUBITEM_ALIASES.secondaryEmail,
      secondaryCell: SUBITEM_ALIASES.secondaryCell,
      chamberContact: SUBITEM_ALIASES.chamberContact,
    }

    const values = {
      label,
      contactEmail,
      contactCell,
      secondaryContact,
      secondaryEmail,
      secondaryCell,
      chamberContact,
    }

    const updates = Object.entries(fieldToAliases)
      .map(([key, aliases]) => {
        const id = findColumnId(titleToId, aliases)
        return id ? { id, key, value: values[key] ?? '' } : null
      })
      .filter(Boolean)

    const errors = []
    for (const update of updates) {
      const columnType = typeById[update.id]
      let payload
      if (columnType === 'long_text') {
        payload = await updateJsonValue(token, boardId, subitemId, update.id, { text: update.value || '' })
      } else if (columnType === 'tags') {
        payload = await updateSimpleValue(token, boardId, subitemId, update.id, update.value || '')
      } else {
        payload = await updateSimpleValue(token, boardId, subitemId, update.id, update.value || '')
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
