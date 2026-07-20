export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: '#111111',
      border: '1px solid #2A2A2A',
      borderRadius: 8,
      padding: 20,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888888', marginBottom: 8, fontFamily: 'var(--font-dm-sans)' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#C8F54A', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'var(--font-space-grotesk)' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#888888', marginTop: 4, fontFamily: 'var(--font-dm-sans)' }}>{sub}</div>}
    </div>
  )
}
