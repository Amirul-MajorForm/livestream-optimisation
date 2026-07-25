export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-border)',
      borderRadius: 8,
      padding: 20,
      flex: 1,
      minWidth: 0,
    }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ds-text-sec)', marginBottom: 8, fontFamily: 'var(--font-dm-sans)' }}>
        {label}
      </div>
      <div style={{ fontSize: 'clamp(1.1rem, 5vw, 2rem)', fontWeight: 700, color: 'var(--ds-accent)', letterSpacing: '-0.02em', lineHeight: 1, fontFamily: 'var(--font-space-grotesk)', wordBreak: 'break-word' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ds-text-sec)', marginTop: 4, fontFamily: 'var(--font-dm-sans)' }}>{sub}</div>}
    </div>
  )
}
