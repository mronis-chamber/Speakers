const COLUMN_ALIASES = {
  role: ['Current Title', 'CURRENT TITLE', 'Current Tittle', 'CURRENT TITTLE'],
  bureau: ['SPEAKERS BUREAU', 'Speakers Bureau'],
  location: ['LOCATION', 'Location'],
  fee: ['FEE RANGE', 'Fee Range'],
  topics: ['KEYWORD TAGS', 'Keyword Tags'],
  notes: ['Notes', 'NOTES'],
}

function parseTopics(raw) {
  if (!raw) return []
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function parseFeeValue(feeText) {
  if (!feeText) return 999
  const match = feeText.match(/(\d+)(?:\s*-\s*\d+)?K/i)
  if (!match) return 999
  return Number(match[1]) || 999
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

function toSpeaker(item, valuesById, titleToId) {
  const roleId = findColumnId(titleToId, COLUMN_ALIASES.role)
  const bureauId = findColumnId(titleToId, COLUMN_ALIASES.bureau)
  const locationId = findColumnId(titleToId, COLUMN_ALIASES.location)
  const feeId = findColumnId(titleToId, COLUMN_ALIASES.fee)
  const notesId = findColumnId(titleToId, COLUMN_ALIASES.notes)
  const topicsId = findColumnId(titleToId, COLUMN_ALIASES.topics)

  const role = (roleId && valuesById[roleId]?.text) || ''
  const bureau = (bureauId && valuesById[bureauId]?.text) || ''
  const location = (locationId && valuesById[locationId]?.text) || ''
  const fee = (feeId && valuesById[feeId]?.text) || 'N/A'
  const notes = (notesId && valuesById[notesId]?.text) || ''
  const topicsText = (topicsId && valuesById[topicsId]?.text) || ''

  return {
    // Keep monday item IDs as strings to avoid precision loss and unstable React keys.
    id: String(item.id),
    name: item.name || '',
    role,
    bio: notes,
    fee,
    feeValue: parseFeeValue(fee),
    bureau,
    location,
    topics: parseTopics(topicsText),
  }
}

export async function handler() {
  const token = process.env.MONDAY_API_TOKEN
  const boardId = process.env.MONDAY_BOARD_ID || '5879530432'

  if (!token) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: 'Missing MONDAY_API_TOKEN in environment',
      }),
    }
  }

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        columns {
          id
          title
          type
        }
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              type
            }
          }
        }
      }
    }
  `

  try {
    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        query,
        variables: { boardId },
      }),
    })

    const payload = await mondayRes.json()
    if (payload?.errors?.length) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: payload.errors[0]?.message || 'Monday API error',
        }),
      }
    }

    const board = payload?.data?.boards?.[0]
    if (!board) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ok: false,
          error: `Board ${boardId} not found`,
        }),
      }
    }

    const titleToId = buildColumnTitleMap(board.columns || [])
    const items = board.items_page?.items || []

    const speakers = items.map((item) => {
      const valuesById = (item.column_values || []).reduce((acc, cv) => {
        acc[cv.id] = cv
        return acc
      }, {})
      return toSpeaker(item, valuesById, titleToId)
    })

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true, speakers }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: err?.message || 'Unknown error',
      }),
    }
  }
}

