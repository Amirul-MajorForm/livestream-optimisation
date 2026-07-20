import { fetchStreams } from '@/lib/sheets'

export async function POST() {
  try {
    const data = await fetchStreams(true)
    return Response.json({
      success: true,
      count: data.length,
      refreshedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('refresh error:', err)
    return Response.json({ error: 'Failed to refresh' }, { status: 500 })
  }
}
