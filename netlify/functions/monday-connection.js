export async function handler() {
  const token = process.env.MONDAY_API_TOKEN

  if (!token) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        connected: false,
        error: 'Missing MONDAY_API_TOKEN in environment',
      }),
    }
  }

  try {
    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        // Minimal token validity check.
        query: 'query { me { id account { id } } }',
      }),
    })

    const json = await mondayRes.json()
    const connected = Boolean(json?.data?.me?.id) && !(json?.errors?.length > 0)

    return {
      statusCode: connected ? 200 : 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        connected,
        accountId: json?.data?.me?.account?.id ?? null,
        error: json?.errors?.[0]?.message ?? null,
      }),
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        connected: false,
        error: err?.message ?? 'Unknown error',
      }),
    }
  }
}

