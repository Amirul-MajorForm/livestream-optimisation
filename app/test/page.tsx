'use client'
import { useEffect, useState } from 'react'

export default function TestPage() {
  const [data, setData] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/streams')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return <div style={{ padding: 32, color: '#F0F0F0', background: '#0A0A0A', minHeight: '100vh' }}>Loading...</div>
  if (error) return <div style={{ padding: 32, color: '#F87171', background: '#0A0A0A', minHeight: '100vh' }}>Error: {error}</div>

  return (
    <div style={{ padding: 32, background: '#0A0A0A', minHeight: '100vh', color: '#F0F0F0' }}>
      <h1 style={{ color: '#C8F54A', marginBottom: 16 }}>API Test — /api/streams</h1>
      <pre style={{ fontSize: 12, overflowX: 'auto', background: '#111', padding: 16, borderRadius: 8 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
