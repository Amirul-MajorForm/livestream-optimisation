const STATUS_COLORS: Record<string, string> = {
  'Paid': '#4ADE80',
  'Scheduled': '#FBBF24',
  'Cancelled': '#F87171',
  'Invoice Pending': '#888888',
  'Invoice Sent': '#60A5FA',
  'Paid to Host, Pending Payment From Brand': '#60A5FA',
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const color = STATUS_COLORS[status] ?? '#888888'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color, fontSize: '0.75rem' }}>{status}</span>
    </span>
  )
}
