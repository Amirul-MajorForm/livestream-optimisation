import { fetchStreams } from '@/lib/sheets'
import { getCacheTimestamp } from '@/lib/cache'

export async function POST() {
  try {
    const data = await fetchStreams(true)
    return Response.json({
      success: true,
      data,
      count: data.length,
      cachedAt: new Date(getCacheTimestamp()).toISOString(),
    })
  } catch (err) {
    console.error('refresh error:', err)
    return Response.json({ error: 'Failed to refresh' }, { status: 500 })
  }
}
