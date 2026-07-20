import { fetchStreams, getCacheTimestamp } from '@/lib/sheets'

export async function GET() {
  try {
    const data = await fetchStreams()
    return Response.json({
      data,
      count: data.length,
      cachedAt: new Date(getCacheTimestamp()).toISOString(),
    })
  } catch (err) {
    console.error('fetchStreams error:', err)
    return Response.json({ error: 'Failed to fetch streams' }, { status: 500 })
  }
}
