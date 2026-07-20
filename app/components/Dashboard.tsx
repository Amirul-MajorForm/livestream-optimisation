'use client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { KpiCard } from './KpiCard'
import { StatusBadge } from './StatusBadge'

interface Stream {
  flag: string | null
  amirulApproval: string | null
  date: string
  dayOfWeek: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  endIsNextDay: boolean
  talent: string
  brand: string | null
  account: string | null
  period: string | null
  platform: string | null
  status: string | null
  tiktokGmv: number
  shopeeGmv: number
  totalGmv: number
  hours: number
  gmvPerHour: number
  version: string | null
  method: string | null
  talentFee: number | null
  room: string | null
  notes: string | null
  eventId: string | null
}

const ACCENT = '#C8F54A'
const TIKTOK_COLOR = '#FF4D6D'
const SHOPEE_COLOR = '#EE4D2D'
const BORDER = '#2A2A2A'
const SURFACE = '#111111'
const SURFACE_RAISED = '#1A1A1A'
const TEXT_SEC = '#888888'
const TEXT_PRI = '#F0F0F0'

const fmt = (n: number) =>
  'SGD ' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtShort = (n: number) => {
  if (n >= 1000000) return `SGD ${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `SGD ${(n / 1000).toFixed(1)}K`
  return fmt(n)
}

type Page = 'overview' | 'streamers' | 'brands' | 'timeslots' | 'ask'

const STATUS_OPTIONS = ['Paid', 'Invoice Sent', 'Invoice Pending', 'Scheduled']
const TIME_BUCKETS = ['12–14', '14–16', '16–18', '18–20', '20–22', '22–00']
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getBucket(hour: number): string | null {
  if (hour >= 12 && hour < 14) return '12–14'
  if (hour >= 14 && hour < 16) return '14–16'
  if (hour >= 16 && hour < 18) return '16–18'
  if (hour >= 18 && hour < 20) return '18–20'
  if (hour >= 20 && hour < 22) return '20–22'
  if (hour >= 22 || hour === 0) return '22–00'
  return null
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: SURFACE_RAISED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
      <div style={{ color: TEXT_SEC, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: 8 }}>
          <span>{p.name}:</span>
          <span>{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [allStreams, setAllStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [page, setPage] = useState<Page>('overview')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Paid'])
  const [selectedMonth, setSelectedMonth] = useState<string>('All')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All')

  const [expandedTalent, setExpandedTalent] = useState<string | null>(null)
  const [brandAccountFilter, setBrandAccountFilter] = useState<string>('All')

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)

  const load = useCallback(async (force = false) => {
    try {
      if (force) {
        setRefreshing(true)
        await fetch('/api/refresh', { method: 'POST' })
      }
      const res = await fetch('/api/streams')
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAllStreams(json.data)
      setCachedAt(json.cachedAt)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const months = useMemo(() => {
    const set = new Set<string>()
    allStreams.forEach(s => {
      const d = new Date(s.date)
      set.add(`${d.toLocaleString('en-SG', { month: 'short' })} ${d.getFullYear()}`)
    })
    return ['All', ...Array.from(set).sort((a, b) => new Date(a) > new Date(b) ? 1 : -1)]
  }, [allStreams])

  const filtered = useMemo(() => {
    return allStreams.filter(s => {
      if (!selectedStatuses.includes(s.status ?? '')) return false
      if (selectedMonth !== 'All') {
        const d = new Date(s.date)
        const m = `${d.toLocaleString('en-SG', { month: 'short' })} ${d.getFullYear()}`
        if (m !== selectedMonth) return false
      }
      if (selectedPlatform !== 'All') {
        const p = s.platform ?? ''
        if (!p.toLowerCase().includes(selectedPlatform.toLowerCase())) return false
      }
      return true
    })
  }, [allStreams, selectedStatuses, selectedMonth, selectedPlatform])

  const askClaude = async () => {
    if (!question.trim() || streaming) return
    setAnswer('')
    setStreaming(true)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, streams: filtered }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAnswer(a => a + decoder.decode(value))
      }
    } finally {
      setStreaming(false)
    }
  }

  const toggleStatus = (s: string) => {
    setSelectedStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: TEXT_SEC }}>
      Loading streams...
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#F87171' }}>
      {error}
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0A' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`,
        display: 'flex', flexDirection: 'column', padding: '24px 0',
      }}>
        <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: ACCENT, letterSpacing: '-0.01em' }}>MAJORFORM</div>
          <div style={{ fontSize: '0.7rem', color: TEXT_SEC, marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Livestream Dashboard</div>
        </div>
        <nav style={{ padding: '16px 0', flex: 1 }}>
          {(['overview', 'streamers', 'brands', 'timeslots', 'ask'] as Page[]).map(p => {
            const labels: Record<Page, string> = {
              overview: 'Overview', streamers: 'Streamers', brands: 'Brands',
              timeslots: 'Timeslots', ask: 'Ask Claude',
            }
            const active = page === p
            return (
              <button key={p} onClick={() => setPage(p)} style={{
                width: '100%', textAlign: 'left', padding: '10px 20px',
                background: active ? SURFACE_RAISED : 'transparent',
                borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                color: active ? TEXT_PRI : TEXT_SEC,
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.1s',
              }}>
                {labels[p]}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}`, fontSize: '0.7rem', color: TEXT_SEC }}>
          {filtered.length} streams shown
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 32px', borderBottom: `1px solid ${BORDER}`, background: SURFACE,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10,
        }}>
          {/* Status toggles */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>Status</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => toggleStatus(s)} style={{
                padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer',
                border: `1px solid ${selectedStatuses.includes(s) ? ACCENT : BORDER}`,
                background: selectedStatuses.includes(s) ? 'rgba(200,245,74,0.1)' : 'transparent',
                color: selectedStatuses.includes(s) ? ACCENT : TEXT_SEC,
              }}>{s}</button>
            ))}
          </div>

          {/* Month */}
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{
            background: SURFACE_RAISED, border: `1px solid ${BORDER}`, color: TEXT_PRI,
            padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer',
          }}>
            {months.map(m => <option key={m}>{m}</option>)}
          </select>

          {/* Platform */}
          <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} style={{
            background: SURFACE_RAISED, border: `1px solid ${BORDER}`, color: TEXT_PRI,
            padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer',
          }}>
            {['All', 'TikTok', 'Shopee'].map(p => <option key={p}>{p}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {cachedAt && (
              <span style={{ fontSize: '0.7rem', color: TEXT_SEC }}>
                Synced {new Date(cachedAt).toLocaleTimeString('en-SG')}
              </span>
            )}
            <button onClick={() => load(true)} disabled={refreshing} style={{
              padding: '5px 14px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer',
              border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC,
              transition: 'border-color 0.1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: 32, flex: 1 }}>
          {page === 'overview' && <OverviewPage streams={filtered} />}
          {page === 'streamers' && <StreamersPage streams={filtered} expanded={expandedTalent} setExpanded={setExpandedTalent} />}
          {page === 'brands' && <BrandsPage streams={filtered} accountFilter={brandAccountFilter} setAccountFilter={setBrandAccountFilter} />}
          {page === 'timeslots' && <TimeslotsPage streams={filtered} />}
          {page === 'ask' && (
            <AskPage
              streams={filtered}
              question={question}
              setQuestion={setQuestion}
              answer={answer}
              streaming={streaming}
              onAsk={askClaude}
              onSuggest={setQuestion}
            />
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPage({ streams }: { streams: Stream[] }) {
  const totalGmv = streams.reduce((a, s) => a + s.totalGmv, 0)
  const totalStreams = streams.length
  const avgGmvHour = streams.length > 0
    ? streams.filter(s => s.hours > 0).reduce((a, s) => a + s.gmvPerHour, 0) /
      Math.max(1, streams.filter(s => s.hours > 0).length)
    : 0

  const talentGmv = useMemo(() => {
    const m: Record<string, number> = {}
    streams.forEach(s => { m[s.talent] = (m[s.talent] ?? 0) + s.totalGmv })
    return m
  }, [streams])
  const topTalent = Object.entries(talentGmv).sort((a, b) => b[1] - a[1])[0]

  const monthlyData = useMemo(() => {
    const m: Record<string, { tiktok: number; shopee: number }> = {}
    streams.forEach(s => {
      const d = new Date(s.date)
      const key = `${d.toLocaleString('en-SG', { month: 'short' })} ${d.getFullYear()}`
      if (!m[key]) m[key] = { tiktok: 0, shopee: 0 }
      m[key].tiktok += s.tiktokGmv
      m[key].shopee += s.shopeeGmv
    })
    return Object.entries(m)
      .sort((a, b) => new Date(a[0]) > new Date(b[0]) ? 1 : -1)
      .map(([name, v]) => ({ name, ...v }))
  }, [streams])

  const totalTiktok = streams.reduce((a, s) => a + s.tiktokGmv, 0)
  const totalShopee = streams.reduce((a, s) => a + s.shopeeGmv, 0)
  const pieData = [
    { name: 'TikTok', value: totalTiktok },
    { name: 'Shopee', value: totalShopee },
  ].filter(d => d.value > 0)

  const recent = [...streams]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 16 }}>
        <KpiCard label="Total GMV" value={fmtShort(totalGmv)} />
        <KpiCard label="Total Streams" value={String(totalStreams)} />
        <KpiCard label="Avg GMV / Hour" value={fmtShort(avgGmvHour)} />
        <KpiCard
          label="Top Streamer"
          value={topTalent ? topTalent[0] : '—'}
          sub={topTalent ? fmtShort(topTalent[1]) : undefined}
        />
      </div>

      {/* Charts */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 2, ...cardStyle }}>
          <SectionLabel>Monthly GMV</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: TEXT_SEC, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TEXT_SEC, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="tiktok" name="TikTok" stackId="a" fill={TIKTOK_COLOR} radius={[0,0,0,0]} />
              <Bar dataKey="shopee" name="Shopee" stackId="a" fill={SHOPEE_COLOR} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, ...cardStyle }}>
          <SectionLabel>Platform Split</SectionLabel>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.name === 'TikTok' ? TIKTOK_COLOR : SHOPEE_COLOR} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtShort(Number(v))} contentStyle={{ background: SURFACE_RAISED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem', color: TEXT_SEC }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent table */}
      <div style={cardStyle}>
        <SectionLabel>Recent Streams</SectionLabel>
        <Table
          headers={['Date', 'Day', 'Talent', 'Brand', 'Platform', 'TikTok GMV', 'Shopee GMV', 'Total GMV', 'Status']}
          rows={recent.map(s => [
            new Date(s.date).toLocaleDateString('en-SG'),
            s.dayOfWeek,
            s.talent,
            s.brand ?? '—',
            s.platform ?? '—',
            s.tiktokGmv > 0 ? fmt(s.tiktokGmv) : '—',
            s.shopeeGmv > 0 ? fmt(s.shopeeGmv) : '—',
            s.totalGmv > 0 ? fmt(s.totalGmv) : '—',
            <StatusBadge key="s" status={s.status} />,
          ])}
        />
      </div>
    </div>
  )
}

// ─── Streamers ────────────────────────────────────────────────────────────────

function StreamersPage({ streams, expanded, setExpanded }: { streams: Stream[]; expanded: string | null; setExpanded: (v: string | null) => void }) {
  const talentData = useMemo(() => {
    const m: Record<string, { streams: Stream[] }> = {}
    streams.forEach(s => {
      if (!m[s.talent]) m[s.talent] = { streams: [] }
      m[s.talent].streams.push(s)
    })
    return Object.entries(m).map(([talent, { streams: ss }]) => {
      const totalGmv = ss.reduce((a, s) => a + s.totalGmv, 0)
      const totalHours = ss.reduce((a, s) => a + s.hours, 0)
      const brandMap: Record<string, number> = {}
      ss.forEach(s => { if (s.brand) brandMap[s.brand] = (brandMap[s.brand] ?? 0) + s.totalGmv })
      const topBrand = Object.entries(brandMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      return {
        talent,
        count: ss.length,
        totalGmv,
        avgGmvStream: totalGmv / ss.length,
        avgGmvHour: totalHours > 0 ? totalGmv / totalHours : 0,
        topBrand,
        streams: ss,
      }
    }).sort((a, b) => b.totalGmv - a.totalGmv)
  }, [streams])

  const chartData = talentData.map(t => ({ name: t.talent, gmv: t.totalGmv }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <SectionLabel>GMV by Streamer</SectionLabel>
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 36)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 60 }}>
            <XAxis type="number" tick={{ fill: TEXT_SEC, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" tick={{ fill: TEXT_PRI, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="gmv" name="Total GMV" fill={ACCENT} radius={[0,3,3,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <SectionLabel>Streamer Rankings</SectionLabel>
        <Table
          headers={['Talent', 'Streams', 'Total GMV', 'Avg/Stream', 'Avg GMV/Hr', 'Top Brand', '']}
          rows={talentData.map(t => [
            <button key={t.talent} onClick={() => setExpanded(expanded === t.talent ? null : t.talent)}
              style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left', padding: 0 }}>
              {t.talent}
            </button>,
            t.count,
            fmt(t.totalGmv),
            fmt(t.avgGmvStream),
            fmt(t.avgGmvHour),
            t.topBrand,
            <span key="x" style={{ color: TEXT_SEC, fontSize: '0.75rem' }}>{expanded === t.talent ? '▲' : '▼'}</span>,
          ])}
          expandedRow={expanded}
          expandedContent={talentData.reduce((acc, t) => {
            acc[t.talent] = (
              <Table
                headers={['Date', 'Brand', 'Platform', 'TikTok GMV', 'Shopee GMV', 'Total GMV', 'Hours', 'Status']}
                rows={[...t.streams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => [
                  new Date(s.date).toLocaleDateString('en-SG'),
                  s.brand ?? '—',
                  s.platform ?? '—',
                  s.tiktokGmv > 0 ? fmt(s.tiktokGmv) : '—',
                  s.shopeeGmv > 0 ? fmt(s.shopeeGmv) : '—',
                  fmt(s.totalGmv),
                  s.hours.toFixed(1),
                  <StatusBadge key="s" status={s.status} />,
                ])}
                compact
              />
            )
            return acc
          }, {} as Record<string, React.ReactNode>)}
          expandKey={0}
        />
      </div>
    </div>
  )
}

// ─── Brands ────────────────────────────────────────────────────────────────

function BrandsPage({ streams, accountFilter, setAccountFilter }: { streams: Stream[]; accountFilter: string; setAccountFilter: (v: string) => void }) {
  const filtered = useMemo(() =>
    accountFilter === 'All' ? streams : streams.filter(s => s.account === accountFilter)
  , [streams, accountFilter])

  const brandData = useMemo(() => {
    const m: Record<string, { streams: Stream[] }> = {}
    filtered.forEach(s => {
      const key = s.brand ?? 'Unknown'
      if (!m[key]) m[key] = { streams: [] }
      m[key].streams.push(s)
    })
    return Object.entries(m).map(([brand, { streams: ss }]) => {
      const totalGmv = ss.reduce((a, s) => a + s.totalGmv, 0)
      const tiktokGmv = ss.reduce((a, s) => a + s.tiktokGmv, 0)
      const shopeeGmv = ss.reduce((a, s) => a + s.shopeeGmv, 0)
      const totalHours = ss.reduce((a, s) => a + s.hours, 0)
      const talentMap: Record<string, number> = {}
      ss.forEach(s => { talentMap[s.talent] = (talentMap[s.talent] ?? 0) + s.totalGmv })
      const topTalent = Object.entries(talentMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
      return { brand, count: ss.length, tiktokGmv, shopeeGmv, totalGmv, avgGmvHour: totalHours > 0 ? totalGmv / totalHours : 0, topTalent }
    }).sort((a, b) => b.totalGmv - a.totalGmv)
  }, [filtered])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['All', 'Brand', 'Creator'].map(f => (
          <button key={f} onClick={() => setAccountFilter(f)} style={{
            padding: '5px 14px', borderRadius: 4, fontSize: '0.8rem', cursor: 'pointer',
            border: `1px solid ${accountFilter === f ? ACCENT : BORDER}`,
            background: accountFilter === f ? 'rgba(200,245,74,0.1)' : 'transparent',
            color: accountFilter === f ? ACCENT : TEXT_SEC,
          }}>{f}</button>
        ))}
      </div>
      <div style={cardStyle}>
        <SectionLabel>Brand Rankings</SectionLabel>
        <Table
          headers={['Brand', 'Streams', 'TikTok GMV', 'Shopee GMV', 'Total GMV', 'Avg GMV/Hr', 'Top Streamer']}
          rows={brandData.map(b => [
            b.brand,
            b.count,
            b.tiktokGmv > 0 ? fmt(b.tiktokGmv) : '—',
            b.shopeeGmv > 0 ? fmt(b.shopeeGmv) : '—',
            fmt(b.totalGmv),
            fmt(b.avgGmvHour),
            b.topTalent,
          ])}
        />
      </div>
    </div>
  )
}

// ─── Timeslots ────────────────────────────────────────────────────────────────

function TimeslotsPage({ streams }: { streams: Stream[] }) {
  const heatmap = useMemo(() => {
    const cells: Record<string, Record<string, number[]>> = {}
    DAY_ORDER.forEach(d => {
      cells[d] = {}
      TIME_BUCKETS.forEach(b => { cells[d][b] = [] })
    })
    streams.forEach(s => {
      const bucket = getBucket(s.startHour)
      if (!bucket) return
      const day = s.dayOfWeek
      if (!DAY_ORDER.includes(day)) return
      cells[day][bucket].push(s.totalGmv)
    })
    return cells
  }, [streams])

  const allAvgs = DAY_ORDER.flatMap(d =>
    TIME_BUCKETS.map(b => {
      const vals = heatmap[d][b]
      return vals.length > 0 ? vals.reduce((a, v) => a + v, 0) / vals.length : 0
    })
  ).filter(v => v > 0)
  const maxAvg = Math.max(...allAvgs, 1)

  const bucketSummary = useMemo(() => {
    const m: Record<string, { gmvs: number[]; count: number }> = {}
    TIME_BUCKETS.forEach(b => { m[b] = { gmvs: [], count: 0 } })
    streams.forEach(s => {
      const b = getBucket(s.startHour)
      if (b) { m[b].gmvs.push(s.totalGmv); m[b].count++ }
    })
    return TIME_BUCKETS.map(b => ({
      bucket: b,
      count: m[b].count,
      avg: m[b].count > 0 ? m[b].gmvs.reduce((a, v) => a + v, 0) / m[b].count : 0,
    })).sort((a, b2) => b2.avg - a.avg)
  }, [streams])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <SectionLabel>Avg GMV Heatmap by Day & Time</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 500 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 60 }}></th>
                {TIME_BUCKETS.map(b => <th key={b} style={thStyle}>{b}</th>)}
              </tr>
            </thead>
            <tbody>
              {DAY_ORDER.map(day => (
                <tr key={day}>
                  <td style={{ ...tdStyle, color: TEXT_PRI, fontWeight: 600, fontSize: '0.8rem' }}>{day}</td>
                  {TIME_BUCKETS.map(bucket => {
                    const vals = heatmap[day][bucket]
                    const avg = vals.length > 0 ? vals.reduce((a, v) => a + v, 0) / vals.length : 0
                    const opacity = avg > 0 ? 0.1 + (avg / maxAvg) * 0.9 : 0
                    return (
                      <td key={bucket} style={{
                        ...tdStyle, textAlign: 'center',
                        background: avg > 0 ? `rgba(200,245,74,${opacity})` : 'transparent',
                        color: avg > 0 ? (opacity > 0.5 ? '#0A0A0A' : ACCENT) : TEXT_SEC,
                        fontSize: '0.7rem', fontWeight: avg > 0 ? 600 : 400,
                      }}>
                        {avg > 0 ? fmtShort(avg) : '—'}
                        {vals.length > 0 && <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{vals.length}x</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <SectionLabel>Timeslot Rankings</SectionLabel>
        <Table
          headers={['Time Slot', 'Streams', 'Avg GMV']}
          rows={bucketSummary.map(b => [b.bucket, b.count, b.count > 0 ? fmt(b.avg) : '—'])}
        />
      </div>
    </div>
  )
}

// ─── Ask Claude ────────────────────────────────────────────────────────────────

const SUGGESTED = [
  'Which streamer has the best GMV/hour?',
  'Which brand performs better on TikTok vs Shopee?',
  'Best day and time to schedule streams?',
  'Compare Zul vs Clarice performance',
  'Which streamer should I use for BLACKMORES mega campaigns?',
]

function AskPage({ streams, question, setQuestion, answer, streaming, onAsk, onSuggest }: {
  streams: Stream[]
  question: string
  setQuestion: (v: string) => void
  answer: string
  streaming: boolean
  onAsk: () => void
  onSuggest: (v: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: TEXT_PRI, marginBottom: 4 }}>Ask Claude</h2>
        <p style={{ color: TEXT_SEC, fontSize: '0.875rem' }}>
          Querying {streams.length} streams with your current filters.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SUGGESTED.map(s => (
          <button key={s} onClick={() => onSuggest(s)} style={{
            padding: '5px 12px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer',
            border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC,
            transition: 'all 0.1s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT_PRI }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SEC }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAsk() } }}
          placeholder="Ask anything about your streams..."
          rows={3}
          style={{
            flex: 1, background: SURFACE_RAISED, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '10px 14px', color: TEXT_PRI, fontSize: '0.875rem',
            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={onAsk} disabled={streaming || !question.trim()} style={{
          padding: '0 20px', background: ACCENT, color: '#0A0A0A', border: 'none',
          borderRadius: 6, fontWeight: 700, fontSize: '0.875rem', cursor: streaming ? 'not-allowed' : 'pointer',
          opacity: streaming || !question.trim() ? 0.5 : 1, alignSelf: 'stretch',
        }}>
          {streaming ? '...' : 'Ask'}
        </button>
      </div>

      {(answer || streaming) && (
        <div style={{
          ...cardStyle, fontFamily: 'inherit', fontSize: '0.875rem', lineHeight: 1.7,
          color: TEXT_PRI, whiteSpace: 'pre-wrap', minHeight: 80,
        }}>
          {answer}
          {streaming && <span className="cursor-blink" style={{ color: ACCENT }}>▋</span>}
        </div>
      )}
    </div>
  )
}

// ─── Shared ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 20,
}

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: TEXT_SEC,
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '9px 12px',
  borderBottom: `1px solid ${BORDER}`,
  fontSize: '0.8rem',
  color: TEXT_PRI,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC, marginBottom: 16 }}>
      {children}
    </div>
  )
}

function Table({
  headers, rows, compact = false, expandedRow, expandedContent, expandKey,
}: {
  headers: string[]
  rows: (React.ReactNode | string | number)[][]
  compact?: boolean
  expandedRow?: string | null
  expandedContent?: Record<string, React.ReactNode>
  expandKey?: number
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {headers.map((h, i) => <th key={i} style={compact ? { ...thStyle, padding: '6px 10px' } : thStyle}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const key = expandKey !== undefined ? String(row[expandKey]) : String(ri)
            const isExpanded = expandedRow !== undefined && expandedRow === key
            return (
              <>
                <tr key={ri} style={{ background: ri % 2 === 0 ? SURFACE : SURFACE_RAISED }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#222222')}
                  onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? SURFACE : SURFACE_RAISED)}
                >
                  {row.map((cell, ci) => (
                    <td key={ci} style={compact ? { ...tdStyle, padding: '6px 10px', fontSize: '0.75rem' } : tdStyle}>
                      {cell}
                    </td>
                  ))}
                </tr>
                {isExpanded && expandedContent && expandedContent[key] && (
                  <tr key={`${ri}-expanded`}>
                    <td colSpan={headers.length} style={{ padding: '0 0 0 32px', background: '#0D0D0D' }}>
                      {expandedContent[key]}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
