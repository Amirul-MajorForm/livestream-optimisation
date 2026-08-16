'use client'
import React, { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ComposedChart, Line,
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

const ACCENT = 'var(--ds-accent)'
const TIKTOK_COLOR = '#FF4D6D'
const SHOPEE_COLOR = '#EE4D2D'
const BORDER = 'var(--ds-border)'
const SURFACE = 'var(--ds-surface)'
const SURFACE_RAISED = 'var(--ds-surface-raised)'
const TEXT_SEC = 'var(--ds-text-sec)'
const TEXT_PRI = 'var(--ds-text-pri)'

const DARK_VARS = {
  '--ds-bg': '#0A0A0A',
  '--ds-surface': '#111111',
  '--ds-surface-raised': '#1A1A1A',
  '--ds-border': '#2A2A2A',
  '--ds-accent': '#C8F54A',
  '--ds-text-pri': '#F0F0F0',
  '--ds-text-sec': '#888888',
  '--ds-accent-raw': '200,245,74',
  '--ds-hover': '#222222',
} as React.CSSProperties

const LIGHT_VARS = {
  '--ds-bg': '#F7F7F7',
  '--ds-surface': '#FFFFFF',
  '--ds-surface-raised': '#F0F0F0',
  '--ds-border': '#E2E2E2',
  '--ds-accent': '#2B3A55',
  '--ds-text-pri': '#111111',
  '--ds-text-sec': '#555555',
  '--ds-accent-raw': '43,58,85',
  '--ds-hover': '#E8EDF5',
} as React.CSSProperties

const fmt = (n: number) =>
  'SGD ' + n.toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const fmtShort = (n: number) => {
  if (n >= 1000000) return `SGD ${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `SGD ${(n / 1000).toFixed(1)}K`
  return fmt(n)
}

const fmt12 = (h: number, m = 0) => {
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`
}

type Page = 'overview' | 'streamers' | 'brands' | 'timeslots' | 'ask' | 'planning'

const STATUS_OPTIONS = ['All', 'Paid', 'Invoice Sent', 'Invoice Pending', 'Scheduled', 'Cancelled', 'Paid to Host, Pending Payment From Brand']
const TIME_BUCKETS = ['12pm–2pm', '2pm–4pm', '4pm–6pm', '6pm–8pm', '8pm–10pm', '10pm–12am']
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getBucket(hour: number): string | null {
  if (hour >= 12 && hour < 14) return '12pm–2pm'
  if (hour >= 14 && hour < 16) return '2pm–4pm'
  if (hour >= 16 && hour < 18) return '4pm–6pm'
  if (hour >= 18 && hour < 20) return '6pm–8pm'
  if (hour >= 20 && hour < 22) return '8pm–10pm'
  if (hour >= 22 || hour === 0) return '10pm–12am'
  return null
}

const BRAND_PALETTE = [
  { bg: 'rgba(99,102,241,0.18)', text: '#818CF8' },   // indigo
  { bg: 'rgba(236,72,153,0.18)', text: '#F472B6' },   // pink
  { bg: 'rgba(16,185,129,0.18)', text: '#34D399' },   // emerald
  { bg: 'rgba(245,158,11,0.18)', text: '#FCD34D' },   // amber
  { bg: 'rgba(239,68,68,0.18)',  text: '#F87171' },   // red
  { bg: 'rgba(6,182,212,0.18)',  text: '#22D3EE' },   // cyan
  { bg: 'rgba(168,85,247,0.18)', text: '#C084FC' },   // purple
  { bg: 'rgba(249,115,22,0.18)', text: '#FB923C' },   // orange
  { bg: 'rgba(20,184,166,0.18)', text: '#2DD4BF' },   // teal
  { bg: 'rgba(234,179,8,0.18)',  text: '#EAB308' },   // yellow
  { bg: 'rgba(59,130,246,0.18)', text: '#60A5FA' },   // blue
  { bg: 'rgba(132,204,22,0.18)', text: '#A3E635' },   // lime
]
const brandColorCache: Record<string, typeof BRAND_PALETTE[0]> = {}
let brandColorIndex = 0
function getBrandColor(brand: string | null): typeof BRAND_PALETTE[0] {
  if (!brand) return { bg: 'rgba(var(--ds-accent-raw),0.12)', text: 'var(--ds-accent)' }
  if (!brandColorCache[brand]) {
    brandColorCache[brand] = BRAND_PALETTE[brandColorIndex % BRAND_PALETTE.length]
    brandColorIndex++
  }
  return brandColorCache[brand]
}

// Mega day = double-digit day (day===month), mid-month (14/15), or payday (24/25) — and the day before each
function getDayType(dateStr: string): 'Mega' | 'BAU' {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.getMonth() + 1
  const isDoubleDigit = day === month || day === month - 1
  const isMidMonth = day === 15 || day === 14
  const isPayday = day === 25 || day === 24
  return (isDoubleDigit || isMidMonth || isPayday) ? 'Mega' : 'BAU'
}

function heatColor(ratio: number): string {
  // interpolate red (#F87171) → green (#4ADE80)
  if (ratio <= 0) return 'transparent'
  const r = Math.round(248 + (74 - 248) * ratio)
  const g = Math.round(113 + (222 - 113) * ratio)
  const b = Math.round(113 + (128 - 113) * ratio)
  return `rgb(${r},${g},${b})`
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

// ─── MultiSelect ─────────────────────────────────────────────────────────────

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  isMobile,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (vals: string[]) => void
  isMobile: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(v => v !== opt))
    else onChange([...selected, opt])
  }

  const display = selected.length === 0 ? 'All' : selected.length === 1 ? selected[0] : `${selected.length} selected`
  const active = selected.length > 0

  return (
    <div ref={ref} style={{ position: 'relative', width: isMobile ? '100%' : 'auto' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: active ? 'rgba(var(--ds-accent-raw),0.12)' : SURFACE_RAISED,
          border: `1px solid ${active ? ACCENT : BORDER}`,
          color: active ? ACCENT : TEXT_PRI,
          borderRadius: 4, padding: isMobile ? '7px 10px' : '4px 10px',
          fontSize: isMobile ? '0.875rem' : '0.75rem',
          cursor: 'pointer', whiteSpace: 'nowrap', width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'flex-start',
        }}
      >
        <span style={{ color: TEXT_SEC, fontSize: isMobile ? '0.8rem' : '0.7rem', marginRight: 2 }}>{label}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{display}</span>
        <span style={{ color: TEXT_SEC, fontSize: '0.7rem', marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 500, marginTop: 4,
          background: SURFACE_RAISED, border: `1px solid ${BORDER}`, borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', minWidth: 180, maxHeight: 260, overflowY: 'auto',
        }}>
          {selected.length > 0 && (
            <button
              onClick={() => { onChange([]); setOpen(false) }}
              style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: `1px solid ${BORDER}`, color: '#F87171', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Clear selection
            </button>
          )}
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', color: TEXT_PRI }}
              onMouseEnter={e => (e.currentTarget.style.background = SURFACE)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                style={{ accentColor: String(ACCENT), width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mobile context ──────────────────────────────────────────────────────────

const MobileCtx = createContext(false)
const useMobile = () => useContext(MobileCtx)

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const handler = () => setW(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return w
}

// ─── Floating Chat ────────────────────────────────────────────────────────────

function FloatingChat({ streams }: { streams: Stream[] }) {
  const isMobile = useMobile()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const ask = async () => {
    if (!question.trim() || streaming) return
    setAnswer('')
    setStreaming(true)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, streams }),
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

  // On mobile the button sits above the bottom nav bar
  const btnBottom = isMobile ? 76 : 28

  const panelStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, bottom: 56, zIndex: 300, background: SURFACE, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { position: 'fixed', bottom: 88, right: 28, zIndex: 300, width: 380, maxHeight: '70vh', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Ask Claude"
        style={{
          position: 'fixed', bottom: btnBottom, right: 20, zIndex: 300,
          width: 48, height: 48, borderRadius: '50%',
          background: ACCENT, color: '#0A0A0A',
          border: 'none', cursor: 'pointer',
          fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        {open ? '✕' : '✦'}
      </button>

      {open && (
        <div style={panelStyle}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: TEXT_PRI }}>Ask Claude</div>
            <div style={{ fontSize: '0.7rem', color: TEXT_SEC }}>{streams.length} streams</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {answer && (
              <div style={{ fontSize: '0.85rem', color: TEXT_PRI, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {answer}
                {streaming && <span className="cursor-blink" style={{ color: ACCENT }}>▋</span>}
              </div>
            )}
            {streaming && !answer && (
              <div style={{ fontSize: '0.85rem', color: TEXT_SEC }}>
                Thinking<span className="cursor-blink" style={{ color: ACCENT }}>▋</span>
              </div>
            )}
          </div>
          <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 8 }}>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
              placeholder="Ask anything..."
              rows={2}
              style={{
                flex: 1, background: SURFACE_RAISED, border: `1px solid ${BORDER}`,
                borderRadius: 6, padding: '10px 12px', color: TEXT_PRI,
                fontSize: '1rem', resize: 'none', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={ask}
              disabled={streaming || !question.trim()}
              style={{
                padding: '0 16px', background: ACCENT, color: '#0A0A0A',
                border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.9rem',
                cursor: streaming || !question.trim() ? 'not-allowed' : 'pointer',
                opacity: streaming || !question.trim() ? 0.5 : 1, alignSelf: 'stretch',
              }}
            >
              {streaming ? '...' : '→'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const width = useWindowWidth()
  const isMobile = width < 768

  const [allStreams, setAllStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const [page, setPage] = useState<Page>('overview')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedMonths, setSelectedMonths] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [isDark, setIsDark] = useState(true)
  const [expandedTalent, setExpandedTalent] = useState<string | null>(null)

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)

  const load = useCallback(async (force = false) => {
    try {
      if (force) {
        setRefreshing(true)
        const res = await fetch('/api/refresh', { method: 'POST' })
        const json = await res.json()
        if (json.error) throw new Error(json.error)
        setAllStreams(json.data)
        setCachedAt(json.cachedAt)
        return
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

  const brands = useMemo(() => {
    const set = new Set<string>()
    allStreams.forEach(s => { if (s.brand) set.add(s.brand) })
    return ['All', ...Array.from(set).sort()]
  }, [allStreams])

  const filtered = useMemo(() => {
    return allStreams.filter(s => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(s.status ?? '')) return false
      if (selectedMonths.length > 0) {
        const d = new Date(s.date)
        const m = `${d.toLocaleString('en-SG', { month: 'short' })} ${d.getFullYear()}`
        if (!selectedMonths.includes(m)) return false
      }
      if (selectedPlatforms.length > 0) {
        const p = s.platform ?? ''
        if (!selectedPlatforms.some(plat => p.toLowerCase().includes(plat.toLowerCase()))) return false
      }
      if (selectedBrands.length > 0 && !selectedBrands.includes(s.brand ?? '')) return false
      if (selectedAccountTypes.length > 0 && !selectedAccountTypes.includes(s.account ?? '')) return false
      return true
    })
  }, [allStreams, selectedStatuses, selectedMonths, selectedPlatforms, selectedBrands, selectedAccountTypes])

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

  const themeVars = isDark ? DARK_VARS : LIGHT_VARS

  if (loading) return (
    <div style={{ ...themeVars, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: TEXT_SEC, background: 'var(--ds-bg)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '1.5rem', color: ACCENT }}>✦</div>
      Loading streams...
    </div>
  )
  if (error) return (
    <div style={{ ...themeVars, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#F87171', background: 'var(--ds-bg)', padding: 24, textAlign: 'center' }}>
      {error}
    </div>
  )

  const selectStyle: React.CSSProperties = {
    background: SURFACE_RAISED, border: `1px solid ${BORDER}`, color: TEXT_PRI,
    padding: isMobile ? '7px 8px' : '4px 8px', borderRadius: 4,
    fontSize: isMobile ? '0.875rem' : '0.75rem', cursor: 'pointer', width: '100%',
  }

  const PAGE_ICONS: Record<Page, string> = {
    overview: '◎', streamers: '👤', brands: '🏷', timeslots: '🕐', planning: '📋', ask: '✦',
  }
  const PAGE_LABELS: Record<Page, string> = {
    overview: 'Overview', streamers: 'Streamers', brands: 'Brands',
    timeslots: 'Timeslots', planning: 'Planning', ask: 'Ask',
  }

  const activeFilters = selectedStatuses.length + selectedMonths.length + selectedPlatforms.length + selectedBrands.length + selectedAccountTypes.length

  const pageContent = (
    <>
      {page === 'overview' && <OverviewPage streams={filtered} selectedPlatforms={selectedPlatforms} />}
      {page === 'streamers' && <StreamersPage streams={filtered} expanded={expandedTalent} setExpanded={setExpandedTalent} />}
      {page === 'brands' && <BrandsPage streams={filtered} accountFilter={selectedAccountTypes} setAccountFilter={setSelectedAccountTypes} />}
      {page === 'timeslots' && <TimeslotsPage streams={filtered} />}
      {page === 'planning' && <PlanningPage allStreams={allStreams} selectedBrands={selectedBrands} />}
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
    </>
  )

  return (
    <MobileCtx.Provider value={isMobile}>
      <div style={{ ...themeVars, display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--ds-bg)' } as React.CSSProperties}>

        {/* ── Desktop sidebar ── */}
        {!isMobile && (
          <aside style={{
            width: 220, flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`,
            display: 'flex', flexDirection: 'column', padding: '24px 0',
          }}>
            <div style={{ padding: '0 20px 24px', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: ACCENT, letterSpacing: '-0.01em', fontFamily: 'var(--font-space-grotesk)' }}>MAJORFORM</div>
              <div style={{ fontSize: '0.7rem', color: TEXT_SEC, marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Livestream Dashboard</div>
            </div>
            <nav style={{ padding: '16px 0', flex: 1 }}>
              {(['overview', 'streamers', 'brands', 'timeslots', 'planning', 'ask'] as Page[]).map(p => {
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
                    {PAGE_LABELS[p]}
                  </button>
                )
              })}
            </nav>
            <div style={{ padding: '16px 20px', borderTop: `1px solid ${BORDER}`, fontSize: '0.7rem', color: TEXT_SEC }}>
              {filtered.length} streams shown
            </div>
          </aside>
        )}

        {/* ── Main ── */}
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: isMobile ? 56 : 0 }}>

          {/* ── Mobile header ── */}
          {isMobile && (
            <div style={{
              position: 'sticky', top: 0, zIndex: 20,
              background: SURFACE, borderBottom: `1px solid ${BORDER}`,
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-space-grotesk)', lineHeight: 1 }}>MAJORFORM</div>
                <div style={{ fontSize: '0.6rem', color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{PAGE_LABELS[page]}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => setIsDark(d => !d)} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
                  border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC,
                }}>
                  {isDark ? '☀' : '☾'}
                </button>
                <button
                  onClick={() => setFiltersOpen(o => !o)}
                  style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
                    border: `1px solid ${activeFilters > 0 ? ACCENT : BORDER}`,
                    background: activeFilters > 0 ? 'rgba(200,245,74,0.12)' : 'transparent',
                    color: activeFilters > 0 ? ACCENT : TEXT_SEC,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  ⚙ Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
                </button>
                <button onClick={() => load(true)} disabled={refreshing} style={{
                  padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
                  border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC,
                }}>
                  {refreshing ? '…' : '↻'}
                </button>
              </div>
            </div>
          )}

          {/* ── Mobile filter drawer ── */}
          {isMobile && filtersOpen && (
            <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MultiSelect label="Status" options={STATUS_OPTIONS.slice(1)} selected={selectedStatuses} onChange={setSelectedStatuses} isMobile={true} />
              <MultiSelect label="Month" options={months.slice(1)} selected={selectedMonths} onChange={setSelectedMonths} isMobile={true} />
              <MultiSelect label="Platform" options={['TikTok', 'Shopee']} selected={selectedPlatforms} onChange={setSelectedPlatforms} isMobile={true} />
              <MultiSelect label="Brand" options={brands.slice(1)} selected={selectedBrands} onChange={setSelectedBrands} isMobile={true} />
              <MultiSelect label="Account Type" options={['Brand', 'Creator']} selected={selectedAccountTypes} onChange={setSelectedAccountTypes} isMobile={true} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                <span style={{ fontSize: '0.7rem', color: TEXT_SEC }}>{filtered.length} streams</span>
                {activeFilters > 0 && (
                  <button onClick={() => { setSelectedStatuses([]); setSelectedMonths([]); setSelectedPlatforms([]); setSelectedBrands([]); setSelectedAccountTypes([]) }}
                    style={{ fontSize: '0.75rem', color: '#F87171', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Desktop top bar ── */}
          {!isMobile && (
            <div style={{
              padding: '10px 24px', borderBottom: `1px solid ${BORDER}`, background: SURFACE,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 10,
            }}>
              <MultiSelect label="Status" options={STATUS_OPTIONS.slice(1)} selected={selectedStatuses} onChange={setSelectedStatuses} isMobile={false} />
              <MultiSelect label="Month" options={months.slice(1)} selected={selectedMonths} onChange={setSelectedMonths} isMobile={false} />
              <MultiSelect label="Platform" options={['TikTok', 'Shopee']} selected={selectedPlatforms} onChange={setSelectedPlatforms} isMobile={false} />
              <MultiSelect label="Brand" options={brands.slice(1)} selected={selectedBrands} onChange={setSelectedBrands} isMobile={false} />
              <MultiSelect label="Account Type" options={['Brand', 'Creator']} selected={selectedAccountTypes} onChange={setSelectedAccountTypes} isMobile={false} />
              {activeFilters > 0 && (
                <button onClick={() => { setSelectedStatuses([]); setSelectedMonths([]); setSelectedPlatforms([]); setSelectedBrands([]); setSelectedAccountTypes([]) }}
                  style={{ padding: '4px 10px', borderRadius: 4, fontSize: '0.72rem', cursor: 'pointer', border: `1px solid #F87171`, background: 'rgba(248,113,113,0.1)', color: '#F87171' }}>
                  Clear all
                </button>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                {cachedAt && <span style={{ fontSize: '0.7rem', color: TEXT_SEC }}>Synced {new Date(cachedAt).toLocaleTimeString('en-SG')}</span>}
                <button onClick={() => setIsDark(d => !d)} style={{ padding: '5px 12px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC }}>
                  {isDark ? '☀ Light' : '☾ Dark'}
                </button>
                <button onClick={() => load(true)} disabled={refreshing} style={{ padding: '5px 14px', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${BORDER}`, background: 'transparent', color: TEXT_SEC }}>
                  {refreshing ? 'Refreshing...' : '↻ Refresh'}
                </button>
              </div>
            </div>
          )}

          {/* ── Page content ── */}
          <div style={{ padding: isMobile ? 16 : 32, flex: 1 }}>
            {pageContent}
          </div>
        </main>

        {/* ── Mobile bottom nav ── */}
        {isMobile && (
          <nav style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
            background: SURFACE, borderTop: `1px solid ${BORDER}`,
            display: 'flex', height: 56,
          }}>
            {(['overview', 'streamers', 'brands', 'timeslots', 'planning', 'ask'] as Page[]).map(p => {
              const active = page === p
              return (
                <button key={p} onClick={() => { setPage(p); setFiltersOpen(false) }} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, background: 'none', border: 'none', cursor: 'pointer',
                  borderTop: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                  color: active ? ACCENT : TEXT_SEC, padding: '6px 0',
                }}>
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{PAGE_ICONS[p]}</span>
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{PAGE_LABELS[p]}</span>
                </button>
              )
            })}
          </nav>
        )}

        <FloatingChat streams={filtered} />
      </div>
    </MobileCtx.Provider>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPage({ streams, selectedPlatforms }: { streams: Stream[]; selectedPlatforms: string[] }) {
  const isMobile = useMobile()
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

  const megaBau = useMemo(() => {
    const mega = streams.filter(s => getDayType(s.date) === 'Mega')
    const bau = streams.filter(s => getDayType(s.date) === 'BAU')
    const megaGmv = mega.reduce((a, s) => a + s.totalGmv, 0)
    const bauGmv = bau.reduce((a, s) => a + s.totalGmv, 0)
    const megaAvg = mega.length > 0 ? megaGmv / mega.length : 0
    const bauAvg = bau.length > 0 ? bauGmv / bau.length : 0
    return { mega, bau, megaGmv, bauGmv, megaAvg, bauAvg }
  }, [streams])

  const monthlyData = useMemo(() => {
    const onlyTiktok = selectedPlatforms.length === 1 && selectedPlatforms[0].toLowerCase() === 'tiktok'
    const onlyShopee = selectedPlatforms.length === 1 && selectedPlatforms[0].toLowerCase() === 'shopee'
    const m: Record<string, { totalGmv: number; hours: number; count: number }> = {}
    streams.forEach(s => {
      const d = new Date(s.date)
      const key = `${d.toLocaleString('en-SG', { month: 'short' })} ${d.getFullYear()}`
      if (!m[key]) m[key] = { totalGmv: 0, hours: 0, count: 0 }
      const gmv = onlyTiktok ? s.tiktokGmv : onlyShopee ? s.shopeeGmv : s.totalGmv
      m[key].totalGmv += gmv
      m[key].hours += s.hours
      m[key].count++
    })
    return Object.entries(m)
      .sort((a, b) => new Date(a[0]) > new Date(b[0]) ? 1 : -1)
      .map(([name, v]) => ({
        name,
        totalGmv: v.totalGmv,
        gmvPerHour: v.hours > 0 ? v.totalGmv / v.hours : 0,
      }))
  }, [streams])

  const totalTiktok = streams.reduce((a, s) => a + s.tiktokGmv, 0)
  const totalShopee = streams.reduce((a, s) => a + s.shopeeGmv, 0)
  const pieData = [
    { name: 'TikTok', value: totalTiktok },
    { name: 'Shopee', value: totalShopee },
  ].filter(d => d.value > 0)

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)
  const recent = [...streams]
    .filter(s => { const d = new Date(s.date); return d >= sevenDaysAgo && d <= endOfToday })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const DayBlock = ({ label, color, count, gmv, avg, note }: { label: string; color: string; count: number; gmv: number; avg: number; note?: string }) => (
    <div style={{ flex: 1, ...cardStyle, borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: isMobile ? 10 : 20, flexWrap: 'wrap' }}>
        {[['streams', String(count)], ['total GMV', fmtShort(gmv)], ['avg/stream', fmtShort(avg)]].map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ fontSize: isMobile ? '1rem' : '1.3rem', fontWeight: 700, color: TEXT_PRI, fontFamily: 'var(--font-space-grotesk)' }}>{val}</div>
            <div style={{ fontSize: '0.65rem', color: TEXT_SEC }}>{lbl}</div>
          </div>
        ))}
      </div>
      {note && <div style={{ fontSize: '0.62rem', color: TEXT_SEC, marginTop: 8 }}>{note}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16 }}>
        <KpiCard label="Total GMV" value={fmtShort(totalGmv)} />
        <KpiCard label="Streams" value={String(totalStreams)} />
        <KpiCard label="Avg GMV/Hr" value={fmtShort(avgGmvHour)} />
        <KpiCard label="Top Streamer" value={topTalent ? topTalent[0] : '—'} sub={topTalent ? fmtShort(topTalent[1]) : undefined} />
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 16 }}>
        <DayBlock label="🔥 Mega Days" color="#F59E0B" count={megaBau.mega.length} gmv={megaBau.megaGmv} avg={megaBau.megaAvg} note="Double-digit (6.6, 7.7…) · Mid-month (14–15) · Payday (24–25) + day before" />
        <DayBlock label="📅 BAU Days" color={BORDER} count={megaBau.bau.length} gmv={megaBau.bauGmv} avg={megaBau.bauAvg} note="All other days" />
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 16 }}>
        <div style={{ flex: 2, ...cardStyle, padding: isMobile ? 14 : 20 }}>
          <SectionLabel>Monthly Total GMV &amp; GMV / Hour</SectionLabel>
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 220}>
            <ComposedChart data={monthlyData} margin={{ top: 8, right: isMobile ? 4 : 48, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fill: TEXT_SEC, fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="gmv" tick={{ fill: TEXT_SEC, fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} width={32} />
              <YAxis yAxisId="rate" orientation="right" tick={isMobile ? false : { fill: TEXT_SEC, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} width={isMobile ? 0 : 48} />
              <Tooltip contentStyle={{ background: SURFACE_RAISED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: '0.8rem' }} formatter={(v, name) => [fmtShort(Number(v)), name === 'totalGmv' ? 'Total GMV' : 'GMV / Hour']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar yAxisId="gmv" dataKey="totalGmv" name="totalGmv" fill={ACCENT} radius={[3,3,0,0]} opacity={0.85} />
              <Line yAxisId="rate" dataKey="gmvPerHour" name="gmvPerHour" stroke="#60A5FA" strokeWidth={2} dot={{ fill: '#60A5FA', r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <span style={{ fontSize: '0.7rem', color: TEXT_SEC, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: ACCENT, borderRadius: 2, display: 'inline-block' }} /> Total GMV</span>
            <span style={{ fontSize: '0.7rem', color: TEXT_SEC, display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 2, background: '#60A5FA', display: 'inline-block' }} /> GMV / Hour</span>
          </div>
        </div>
        <div style={{ flex: 1, ...cardStyle, padding: isMobile ? 14 : 20 }}>
          <SectionLabel>Platform Split</SectionLabel>
          {isMobile ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {pieData.map(d => (
                <div key={d.name} style={{ flex: 1, textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: d.name === 'TikTok' ? TIKTOK_COLOR : SHOPEE_COLOR, fontFamily: 'var(--font-space-grotesk)' }}>{fmtShort(d.value)}</div>
                  <div style={{ fontSize: '0.75rem', color: TEXT_SEC, marginTop: 2 }}>{d.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.name === 'TikTok' ? TIKTOK_COLOR : SHOPEE_COLOR} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtShort(Number(v))} contentStyle={{ background: SURFACE_RAISED, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', color: TEXT_SEC }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <SectionLabel>Recent Streams — Last 7 Days ({recent.length})</SectionLabel>
        {recent.length === 0 ? (
          <div style={{ color: TEXT_SEC, fontSize: '0.8rem', padding: '12px 0' }}>No streams in the last 7 days.</div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((s, i) => (
              <div key={i} style={{ padding: '12px 14px', background: SURFACE_RAISED, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: TEXT_PRI, fontSize: '0.9rem' }}>{s.talent}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div style={{ fontSize: '0.78rem', color: TEXT_SEC, marginBottom: 4 }}>{new Date(s.date).toLocaleDateString('en-SG')} · {s.brand ?? '—'} · {s.platform ?? '—'}</div>
                <div style={{ fontSize: '0.95rem', color: ACCENT, fontWeight: 700, fontFamily: 'var(--font-space-grotesk)' }}>{s.totalGmv > 0 ? fmt(s.totalGmv) : '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <Table
            headers={['Date', 'Day', 'Talent', 'Brand', 'Platform', 'TikTok GMV', 'Shopee GMV', 'Total GMV', 'Status']}
            rows={recent.map(s => [
              new Date(s.date).toLocaleDateString('en-SG'), s.dayOfWeek, s.talent, s.brand ?? '—', s.platform ?? '—',
              s.tiktokGmv > 0 ? fmt(s.tiktokGmv) : '—', s.shopeeGmv > 0 ? fmt(s.shopeeGmv) : '—',
              s.totalGmv > 0 ? fmt(s.totalGmv) : '—', <StatusBadge key="s" status={s.status} />,
            ])}
          />
        )}
      </div>
    </div>
  )
}

// ─── Streamers ────────────────────────────────────────────────────────────────

type SortCol = 'talent' | 'count' | 'totalGmv' | 'avgGmvStream' | 'avgGmvHour' | 'topBrand'
type SortDir = 'asc' | 'desc'

function StreamersPage({ streams, expanded, setExpanded }: { streams: Stream[]; expanded: string | null; setExpanded: (v: string | null) => void }) {
  const isMobile = useMobile()
  const [sortCol, setSortCol] = useState<SortCol>('totalGmv')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

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
    })
  }, [streams])

  const sorted = useMemo(() => {
    return [...talentData].sort((a, b) => {
      let av: string | number = a[sortCol]
      let bv: string | number = b[sortCol]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [talentData, sortCol, sortDir])

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortArrow = (col: SortCol) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  const chartData = sorted.map(t => ({ name: t.talent, gmv: t.totalGmv }))

  const colStyle = (col: SortCol): React.CSSProperties => ({
    ...thStyle, cursor: 'pointer',
    color: sortCol === col ? ACCENT : TEXT_SEC,
    userSelect: 'none',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <SectionLabel>GMV by Streamer</SectionLabel>
        <ResponsiveContainer width="100%" height={Math.max(isMobile ? 140 : 180, chartData.length * (isMobile ? 28 : 36))}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 60 }}>
            <XAxis type="number" tick={{ fill: TEXT_SEC, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" tick={{ fill: TEXT_PRI, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="gmv" name="Total GMV" fill={ACCENT} radius={[0,3,3,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <SectionLabel>Streamer Rankings — click column headers to sort</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={colStyle('talent')} onClick={() => toggleSort('talent')}>Talent{sortArrow('talent')}</th>
                <th style={colStyle('count')} onClick={() => toggleSort('count')}>Streams{sortArrow('count')}</th>
                <th style={colStyle('totalGmv')} onClick={() => toggleSort('totalGmv')}>Total GMV{sortArrow('totalGmv')}</th>
                <th style={colStyle('avgGmvStream')} onClick={() => toggleSort('avgGmvStream')}>Avg/Stream{sortArrow('avgGmvStream')}</th>
                <th style={colStyle('avgGmvHour')} onClick={() => toggleSort('avgGmvHour')}>Avg GMV/Hr{sortArrow('avgGmvHour')}</th>
                <th style={colStyle('topBrand')} onClick={() => toggleSort('topBrand')}>Top Brand{sortArrow('topBrand')}</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, ri) => (
                <>
                  <tr key={t.talent} style={{ background: ri % 2 === 0 ? SURFACE : SURFACE_RAISED }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? SURFACE : SURFACE_RAISED)}
                  >
                    <td style={tdStyle}>
                      <button onClick={() => setExpanded(expanded === t.talent ? null : t.talent)}
                        style={{ background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left', padding: 0 }}>
                        {t.talent}
                      </button>
                    </td>
                    <td style={tdStyle}>{t.count}</td>
                    <td style={tdStyle}>{fmt(t.totalGmv)}</td>
                    <td style={tdStyle}>{fmt(t.avgGmvStream)}</td>
                    <td style={tdStyle}>{fmt(t.avgGmvHour)}</td>
                    <td style={tdStyle}>{t.topBrand}</td>
                    <td style={tdStyle}><span style={{ color: TEXT_SEC, fontSize: '0.75rem' }}>{expanded === t.talent ? '▲' : '▼'}</span></td>
                  </tr>
                  {expanded === t.talent && (
                    <tr key={`${t.talent}-exp`}>
                      <td colSpan={7} style={{ padding: '0 0 0 32px', background: '#0D0D0D' }}>
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
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Brands ────────────────────────────────────────────────────────────────

type BrandSortCol = 'brand' | 'count' | 'tiktokGmv' | 'shopeeGmv' | 'totalGmv' | 'avgGmvHour' | 'megaAvg' | 'bauAvg' | 'topTalent'

function BrandsPage({ streams, accountFilter, setAccountFilter }: { streams: Stream[]; accountFilter: string[]; setAccountFilter: (v: string[]) => void }) {
  const [sortCol, setSortCol] = useState<BrandSortCol>('totalGmv')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(() =>
    accountFilter.length === 0 ? streams : streams.filter(s => accountFilter.includes(s.account ?? ''))
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
      const megaStreams = ss.filter(s => getDayType(s.date) === 'Mega')
      const bauStreams = ss.filter(s => getDayType(s.date) === 'BAU')
      const megaAvg = megaStreams.length > 0 ? megaStreams.reduce((a, s) => a + s.totalGmv, 0) / megaStreams.length : 0
      const bauAvg = bauStreams.length > 0 ? bauStreams.reduce((a, s) => a + s.totalGmv, 0) / bauStreams.length : 0
      return { brand, count: ss.length, tiktokGmv, shopeeGmv, totalGmv, avgGmvHour: totalHours > 0 ? totalGmv / totalHours : 0, topTalent, megaAvg, bauAvg, streams: ss }
    })
  }, [filtered])

  const sorted = useMemo(() => {
    return [...brandData].sort((a, b) => {
      let av: string | number = a[sortCol]
      let bv: string | number = b[sortCol]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [brandData, sortCol, sortDir])

  const [expandedBrand, setExpandedBrand] = useState<string | null>(null)

  const toggleSort = (col: BrandSortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const col = (col: BrandSortCol, label: string) => (
    <th style={{ ...thStyle, cursor: 'pointer', color: sortCol === col ? ACCENT : TEXT_SEC, userSelect: 'none' } as React.CSSProperties}
      onClick={() => toggleSort(col)}>
      {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: TEXT_SEC }}>Account Type:</span>
        <MultiSelect label="" options={['Brand', 'Creator']} selected={accountFilter} onChange={setAccountFilter} isMobile={false} />
      </div>
      <div style={cardStyle}>
        <SectionLabel>Brand Rankings — click column headers to sort</SectionLabel>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {col('brand', 'Brand')}
                {col('count', 'Streams')}
                {col('tiktokGmv', 'TikTok GMV')}
                {col('shopeeGmv', 'Shopee GMV')}
                {col('totalGmv', 'Total GMV')}
                {col('avgGmvHour', 'Avg GMV/Hr')}
                {col('megaAvg', '🔥 Mega Avg')}
                {col('bauAvg', '📅 BAU Avg')}
                {col('topTalent', 'Top Streamer')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b, ri) => {
                const isOpen = expandedBrand === b.brand
                const rowBg = ri % 2 === 0 ? SURFACE : SURFACE_RAISED
                return (
                  <React.Fragment key={b.brand}>
                    <tr style={{ background: rowBg, cursor: 'pointer' }}
                      onClick={() => setExpandedBrand(isOpen ? null : b.brand)}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
                    >
                      <td style={tdStyle}>
                        <span style={{ marginRight: 6, fontSize: '0.65rem', color: TEXT_SEC, display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▶</span>
                        {b.brand}
                      </td>
                      <td style={tdStyle}>{b.count}</td>
                      <td style={tdStyle}>{b.tiktokGmv > 0 ? fmt(b.tiktokGmv) : '—'}</td>
                      <td style={tdStyle}>{b.shopeeGmv > 0 ? fmt(b.shopeeGmv) : '—'}</td>
                      <td style={tdStyle}>{fmt(b.totalGmv)}</td>
                      <td style={tdStyle}>{fmt(b.avgGmvHour)}</td>
                      <td style={{ ...tdStyle, color: b.megaAvg > 0 ? '#F59E0B' : TEXT_SEC }}>{b.megaAvg > 0 ? fmt(b.megaAvg) : '—'}</td>
                      <td style={tdStyle}>{b.bauAvg > 0 ? fmt(b.bauAvg) : '—'}</td>
                      <td style={tdStyle}>{b.topTalent}</td>
                    </tr>
                    {isOpen && (() => {
                      const sortedStreams = [...b.streams].sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())

                      // Mega vs BAU × platform analysis
                      type PlatRow = { count: number; tiktokGmv: number; shopeeGmv: number; totalGmv: number }
                      const perfMap: Record<'Mega' | 'BAU', Record<string, PlatRow>> = { Mega: {}, BAU: {} }
                      b.streams.forEach(s => {
                        const dayType = getDayType(s.date) as 'Mega' | 'BAU'
                        const plat = s.platform ?? 'Other'
                        if (!perfMap[dayType][plat]) perfMap[dayType][plat] = { count: 0, tiktokGmv: 0, shopeeGmv: 0, totalGmv: 0 }
                        perfMap[dayType][plat].count++
                        perfMap[dayType][plat].tiktokGmv += s.tiktokGmv
                        perfMap[dayType][plat].shopeeGmv += s.shopeeGmv
                        perfMap[dayType][plat].totalGmv += s.totalGmv
                      })
                      const allPlats = Array.from(new Set(b.streams.map(s => s.platform ?? 'Other'))).sort()
                      const dayTypeTotal = (dt: 'Mega' | 'BAU'): PlatRow =>
                        Object.values(perfMap[dt]).reduce((acc, r) => ({
                          count: acc.count + r.count, tiktokGmv: acc.tiktokGmv + r.tiktokGmv,
                          shopeeGmv: acc.shopeeGmv + r.shopeeGmv, totalGmv: acc.totalGmv + r.totalGmv,
                        }), { count: 0, tiktokGmv: 0, shopeeGmv: 0, totalGmv: 0 })

                      const monthlyBreakdown = Object.entries(
                        b.streams.reduce((acc, s) => {
                          const d = new Date(s.date)
                          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                          const label = d.toLocaleString('en-SG', { month: 'short', year: 'numeric' })
                          if (!acc[key]) acc[key] = { label, totalGmv: 0, tiktokGmv: 0, shopeeGmv: 0, count: 0 }
                          acc[key].totalGmv += s.totalGmv
                          acc[key].tiktokGmv += s.tiktokGmv
                          acc[key].shopeeGmv += s.shopeeGmv
                          acc[key].count++
                          return acc
                        }, {} as Record<string, { label: string; totalGmv: number; tiktokGmv: number; shopeeGmv: number; count: number }>)
                      ).sort(([a], [c]) => a.localeCompare(c))
                      return (
                      <tr>
                        <td colSpan={9} style={{ padding: '0 0 8px 0', background: SURFACE_RAISED }}>
                          <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* Mega vs BAU × Platform */}
                            <div>
                              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC, marginBottom: 8 }}>🔥 Mega vs BAU — TikTok vs Shopee</div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ ...thStyle, fontSize: '0.65rem' }} rowSpan={2}>Day Type</th>
                                      <th style={{ ...thStyle, fontSize: '0.65rem', color: TIKTOK_COLOR, borderBottom: `2px solid ${TIKTOK_COLOR}` }} colSpan={3}>TikTok</th>
                                      <th style={{ ...thStyle, fontSize: '0.65rem', color: SHOPEE_COLOR, borderBottom: `2px solid ${SHOPEE_COLOR}` }} colSpan={3}>Shopee</th>
                                    </tr>
                                    <tr>
                                      {['Streams', 'Total GMV', 'Avg/Stream', 'Streams', 'Total GMV', 'Avg/Stream'].map((h, i) => (
                                        <th key={i} style={{ ...thStyle, fontSize: '0.6rem' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(['Mega', 'BAU'] as const).map((dt, ri) => {
                                      const dtColor = dt === 'Mega' ? '#F59E0B' : TEXT_SEC
                                      const tiktokStreams = b.streams.filter(s => getDayType(s.date) === dt && (s.platform ?? '').toLowerCase().includes('tiktok'))
                                      const shopeeStreams = b.streams.filter(s => getDayType(s.date) === dt && (s.platform ?? '').toLowerCase().includes('shopee'))
                                      const tGmv = tiktokStreams.reduce((a, s) => a + s.tiktokGmv, 0)
                                      const sGmv = shopeeStreams.reduce((a, s) => a + s.shopeeGmv, 0)
                                      return (
                                        <tr key={dt} style={{ background: ri % 2 === 0 ? SURFACE : SURFACE_RAISED }}>
                                          <td style={{ ...tdStyle, fontWeight: 700, color: dtColor }}>{dt === 'Mega' ? '🔥 Mega' : '📅 BAU'}</td>
                                          <td style={tdStyle}>{tiktokStreams.length || '—'}</td>
                                          <td style={{ ...tdStyle, color: tiktokStreams.length ? TIKTOK_COLOR : TEXT_SEC, fontWeight: 600 }}>{tGmv > 0 ? fmt(tGmv) : '—'}</td>
                                          <td style={tdStyle}>{tiktokStreams.length > 0 ? fmt(tGmv / tiktokStreams.length) : '—'}</td>
                                          <td style={tdStyle}>{shopeeStreams.length || '—'}</td>
                                          <td style={{ ...tdStyle, color: shopeeStreams.length ? SHOPEE_COLOR : TEXT_SEC, fontWeight: 600 }}>{sGmv > 0 ? fmt(sGmv) : '—'}</td>
                                          <td style={tdStyle}>{shopeeStreams.length > 0 ? fmt(sGmv / shopeeStreams.length) : '—'}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Monthly breakdown */}
                            <div>
                              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC, marginBottom: 8 }}>Monthly Breakdown</div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                                  <thead>
                                    <tr>
                                      {['Month', 'Streams', 'TikTok GMV', 'Shopee GMV', 'Total GMV'].map(h => (
                                        <th key={h} style={{ ...thStyle, fontSize: '0.65rem' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {monthlyBreakdown.map(([, mv], mi) => (
                                      <tr key={mi} style={{ background: mi % 2 === 0 ? SURFACE : SURFACE_RAISED }}>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>{mv.label}</td>
                                        <td style={tdStyle}>{mv.count}</td>
                                        <td style={tdStyle}>{mv.tiktokGmv > 0 ? fmt(mv.tiktokGmv) : '—'}</td>
                                        <td style={tdStyle}>{mv.shopeeGmv > 0 ? fmt(mv.shopeeGmv) : '—'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600, color: ACCENT }}>{fmt(mv.totalGmv)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* All streams */}
                            <div>
                              <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC, marginBottom: 8 }}>All Streams</div>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.78rem' }}>
                                  <thead>
                                    <tr>
                                      {['Date', 'Day', 'Streamer', 'Platform', 'TikTok GMV', 'Shopee GMV', 'Total GMV', 'Hours', 'Status'].map(h => (
                                        <th key={h} style={{ ...thStyle, fontSize: '0.65rem' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedStreams.map((s, si) => (
                                      <tr key={si} style={{ background: si % 2 === 0 ? SURFACE : SURFACE_RAISED }}>
                                        <td style={tdStyle}>{new Date(s.date).toLocaleDateString('en-SG')}</td>
                                        <td style={tdStyle}>{s.dayOfWeek}</td>
                                        <td style={tdStyle}>{s.talent}</td>
                                        <td style={tdStyle}>{s.platform ?? '—'}</td>
                                        <td style={tdStyle}>{s.tiktokGmv > 0 ? fmt(s.tiktokGmv) : '—'}</td>
                                        <td style={tdStyle}>{s.shopeeGmv > 0 ? fmt(s.shopeeGmv) : '—'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(s.totalGmv)}</td>
                                        <td style={tdStyle}>{s.hours > 0 ? `${s.hours.toFixed(1)}h` : '—'}</td>
                                        <td style={tdStyle}><StatusBadge status={s.status} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                      )
                    })()}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Timeslots ────────────────────────────────────────────────────────────────

function TimeslotsPage({ streams }: { streams: Stream[] }) {
  const [dayFilter, setDayFilter] = useState<'All' | 'Mega' | 'BAU'>('All')

  const filteredStreams = useMemo(() =>
    dayFilter === 'All' ? streams : streams.filter(s => getDayType(s.date) === dayFilter)
  , [streams, dayFilter])

  const heatmap = useMemo(() => {
    const cells: Record<string, Record<string, number[]>> = {}
    DAY_ORDER.forEach(d => {
      cells[d] = {}
      TIME_BUCKETS.forEach(b => { cells[d][b] = [] })
    })
    filteredStreams.forEach(s => {
      const bucket = getBucket(s.startHour)
      if (!bucket) return
      const day = s.dayOfWeek
      if (!DAY_ORDER.includes(day)) return
      cells[day][bucket].push(s.totalGmv)
    })
    return cells
  }, [filteredStreams])

  const allAvgs = DAY_ORDER.flatMap(d =>
    TIME_BUCKETS.map(b => {
      const vals = heatmap[d][b]
      return vals.length > 0 ? vals.reduce((a, v) => a + v, 0) / vals.length : 0
    })
  ).filter(v => v > 0)
  const maxAvg = Math.max(...allAvgs, 1)
  const minAvg = Math.min(...allAvgs, 0)

  const bucketSummary = useMemo(() => {
    const m: Record<string, { gmvs: number[]; count: number }> = {}
    TIME_BUCKETS.forEach(b => { m[b] = { gmvs: [], count: 0 } })
    filteredStreams.forEach(s => {
      const b = getBucket(s.startHour)
      if (b) { m[b].gmvs.push(s.totalGmv); m[b].count++ }
    })
    return TIME_BUCKETS.map(b => ({
      bucket: b,
      count: m[b].count,
      avg: m[b].count > 0 ? m[b].gmvs.reduce((a, v) => a + v, 0) / m[b].count : 0,
    })).sort((a, b2) => b2.avg - a.avg)
  }, [filteredStreams])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC }}>Avg GMV Heatmap by Day &amp; Time</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['All', 'Mega', 'BAU'] as const).map(f => (
              <button key={f} onClick={() => setDayFilter(f)} style={{
                padding: '3px 12px', borderRadius: 4, fontSize: '0.72rem', cursor: 'pointer',
                border: `1px solid ${dayFilter === f ? (f === 'Mega' ? '#F59E0B' : ACCENT) : BORDER}`,
                background: dayFilter === f ? (f === 'Mega' ? 'rgba(245,158,11,0.12)' : 'rgba(200,245,74,0.1)') : 'transparent',
                color: dayFilter === f ? (f === 'Mega' ? '#F59E0B' : ACCENT) : TEXT_SEC,
              }}>{f === 'Mega' ? '🔥 Mega' : f === 'BAU' ? '📅 BAU' : 'All Days'}</button>
            ))}
          </div>
        </div>
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
                    const ratio = avg > 0 ? (avg - minAvg) / (maxAvg - minAvg) : 0
                    const bg = heatColor(ratio)
                    const textDark = ratio > 0.5
                    return (
                      <td key={bucket} style={{
                        ...tdStyle, textAlign: 'center',
                        background: bg,
                        color: avg > 0 ? (textDark ? '#0A0A0A' : '#F0F0F0') : TEXT_SEC,
                        fontSize: '0.7rem', fontWeight: avg > 0 ? 600 : 400,
                      }}>
                        {avg > 0 ? fmtShort(avg) : '—'}
                        {vals.length > 0 && <div style={{ fontSize: '0.65rem', opacity: 0.7 }}>{vals.length}x</div>}
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

// ─── Planning ────────────────────────────────────────────────────────────────

function renderMd(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      const upper = inner.toUpperCase()
      const color = upper.includes('CONFIRMED CONFLICT') ? '#F87171' : TEXT_PRI
      return <strong key={i} style={{ color, fontWeight: 700 }}>{inner}</strong>
    }
    return part
  })
}

function MdText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const lines = text.split('\n')
  return (
    <div style={style}>
      {lines.map((line, i) => (
        <div key={i} style={{ minHeight: line.trim() === '' ? '0.5em' : undefined }}>
          {renderMd(line)}
        </div>
      ))}
    </div>
  )
}

function isTBC(s: Stream): boolean {
  const flag = (s.flag ?? '').toUpperCase()
  const status = (s.status ?? '').toUpperCase()
  const notes = (s.notes ?? '').toUpperCase()
  return (
    flag.includes('TBC') ||
    status.includes('TBC') ||
    status === 'SCHEDULED' ||
    notes.includes('TBC')
  )
}

interface ChatMsg { role: 'user' | 'assistant'; text: string }

function PlanningPage({ allStreams, selectedBrands }: { allStreams: Stream[]; selectedBrands: string[] }) {
  const isMobile = useMobile()
  const planned = useMemo(() => {
    const now = new Date()
    return allStreams.filter(s => {
      if (!isTBC(s)) return false
      if (selectedBrands.length > 0 && !selectedBrands.includes(s.brand ?? '')) return false
      const d = new Date(s.date)
      return d >= now
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [allStreams, selectedBrands])

  const historical = useMemo(() =>
    allStreams.filter(s => ['Paid', 'Invoice Sent', 'Invoice Pending'].includes(s.status ?? ''))
  , [allStreams])

  const byTalent = useMemo(() => {
    const m: Record<string, number> = {}
    planned.forEach(s => { m[s.talent] = (m[s.talent] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [planned])

  const byBrand = useMemo(() => {
    const m: Record<string, number> = {}
    planned.forEach(s => { if (s.brand) m[s.brand] = (m[s.brand] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [planned])

  const byTimeslot = useMemo(() => {
    const m: Record<string, number> = {}
    planned.forEach(s => {
      const b = getBucket(s.startHour)
      if (b) { const key = `${s.dayOfWeek} ${b}`; m[key] = (m[key] ?? 0) + 1 }
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [planned])

  const [analysis, setAnalysis] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [analysed, setAnalysed] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleView, setScheduleView] = useState<'table' | 'calendar'>('table')
  const [calMonth, setCalMonth] = useState<Date>(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Jump to first month with planned streams when data loads
  useEffect(() => {
    if (planned.length === 0) return
    const first = new Date(planned[0].date)
    setCalMonth(new Date(first.getFullYear(), first.getMonth(), 1))
  }, [planned])

  // Follow-up chat
  const [followUps, setFollowUps] = useState<ChatMsg[]>([])
  const [followInput, setFollowInput] = useState('')
  const [followStreaming, setFollowStreaming] = useState(false)
  const followEndRef = useRef<HTMLDivElement>(null)

  const runAnalysis = useCallback(async () => {
    if (analysing || planned.length === 0) return
    setAnalysis('')
    setAnalysing(true)
    setAnalysed(false)
    setFollowUps([])
    try {
      const res = await fetch('/api/plan-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planned, historical }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setAnalysis(a => a + decoder.decode(value))
      }
      setAnalysed(true)
    } finally {
      setAnalysing(false)
    }
  }, [planned, historical, analysing])

  const askFollowUp = async () => {
    if (!followInput.trim() || followStreaming || !analysis) return
    const userMsg = followInput.trim()
    setFollowInput('')
    const userEntry: ChatMsg = { role: 'user', text: userMsg }
    const newMsgs = [...followUps, userEntry]
    setFollowUps(newMsgs)
    setFollowStreaming(true)

    const contextQ = `You previously produced this planning analysis:\n\n${analysis}\n\nFollow-up question: ${userMsg}`
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: contextQ, streams: [...historical, ...planned] }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let reply = ''
      const assistantEntry: ChatMsg = { role: 'assistant', text: '' }
      setFollowUps([...newMsgs, assistantEntry])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        reply += decoder.decode(value)
        setFollowUps([...newMsgs, { role: 'assistant', text: reply }])
      }
    } finally {
      setFollowStreaming(false)
      setTimeout(() => followEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const months = useMemo(() => {
    const s = new Set<string>()
    planned.forEach(p => {
      const d = new Date(p.date)
      s.add(`${d.toLocaleString('en-SG', { month: 'long' })} ${d.getFullYear()}`)
    })
    return Array.from(s).join(', ')
  }, [planned])

  const sections = useMemo(() => {
    if (!analysis) return []
    return analysis.split(/\n?##\s+/).filter(Boolean).map(block => {
      const stripped = block.replace(/^##\s+/, '')
      const lines = stripped.split('\n')
      const title = lines[0].trim()
      const body = lines.slice(1).join('\n').trim()
      return { title, body }
    })
  }, [analysis])

  if (planned.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: TEXT_SEC, gap: 8 }}>
        <div style={{ fontSize: '1.5rem' }}>📋</div>
        <div>No upcoming TBC / Scheduled streams found.</div>
        <div style={{ fontSize: '0.75rem' }}>Streams with status "Scheduled" or flag "TBC" and a future date will appear here.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: TEXT_PRI, marginBottom: 4, fontFamily: 'var(--font-space-grotesk)' }}>
            Planning — {planned.length} Upcoming Streams
          </h2>
          <p style={{ color: TEXT_SEC, fontSize: '0.8rem' }}>{months}</p>
        </div>
        <button onClick={runAnalysis} disabled={analysing} style={{
          padding: '8px 18px', background: analysing ? 'transparent' : ACCENT,
          border: `1px solid ${analysing ? BORDER : ACCENT}`,
          color: analysing ? TEXT_SEC : '#0A0A0A',
          borderRadius: 6, fontWeight: 700, fontSize: '0.8rem', cursor: analysing ? 'not-allowed' : 'pointer',
        }}>
          {analysing ? 'Analysing...' : analysed ? '↻ Re-analyse' : '✦ Analyse with Claude'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: isMobile ? 10 : 16 }}>
        <KpiCard label="Planned Streams" value={String(planned.length)} />
        <KpiCard label="Streamers" value={String(byTalent.length)} />
        <KpiCard label="Brands" value={String(byBrand.length)} />
        <KpiCard label="Time Slots" value={String(byTimeslot.length)} />
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
        <div style={{ flex: 1, ...cardStyle }}>
          <SectionLabel>Streams per Streamer</SectionLabel>
          <Table
            headers={['Streamer', 'Planned', 'Bar']}
            rows={byTalent.map(([name, count]) => [
              name,
              count,
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: `${Math.round((count / byTalent[0][1]) * 100)}%`,
                  minWidth: 4, background: ACCENT, maxWidth: 120,
                }} />
              </div>,
            ])}
          />
        </div>
        <div style={{ flex: 1, ...cardStyle }}>
          <SectionLabel>Streams per Brand</SectionLabel>
          <Table
            headers={['Brand', 'Planned', 'Bar']}
            rows={byBrand.map(([name, count]) => [
              name,
              count,
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  height: 6, borderRadius: 3,
                  width: `${Math.round((count / byBrand[0][1]) * 100)}%`,
                  minWidth: 4, background: '#60A5FA', maxWidth: 120,
                }} />
              </div>,
            ])}
          />
        </div>
      </div>

      {/* Planned schedule — collapsible */}
      <div style={cardStyle}>
        <button
          onClick={() => setScheduleOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC }}>
            Planned Schedule ({planned.length})
          </span>
          <span style={{ color: TEXT_SEC, fontSize: '0.75rem', display: 'inline-block', transform: scheduleOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▼</span>
        </button>
        {scheduleOpen && (
          <div style={{ marginTop: 16 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['table', 'calendar'] as const).map(v => (
                <button key={v} onClick={() => setScheduleView(v)} style={{
                  fontSize: '0.72rem', padding: '4px 12px', borderRadius: 6, border: `1px solid ${scheduleView === v ? ACCENT : BORDER}`,
                  background: scheduleView === v ? `rgba(var(--ds-accent-raw),0.12)` : 'transparent',
                  color: scheduleView === v ? ACCENT : TEXT_SEC, cursor: 'pointer', fontWeight: scheduleView === v ? 700 : 400,
                }}>{v === 'table' ? '☰ Table' : '▦ Calendar'}</button>
              ))}
              {scheduleView === 'calendar' && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_SEC, cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem' }}>‹</button>
                  <span style={{ fontSize: '0.75rem', color: TEXT_PRI, fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
                    {calMonth.toLocaleString('en-SG', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ background: 'none', border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_SEC, cursor: 'pointer', padding: '2px 8px', fontSize: '0.8rem' }}>›</button>
                </div>
              )}
            </div>

            {scheduleView === 'table' ? (
            <Table
              headers={['Date', 'Type', 'Day', 'Time', 'Talent', 'Brand', 'Platform', 'Hours', 'Status']}
              rows={planned.map(s => {
                const dayType = getDayType(s.date)
                return [
                new Date(s.date).toLocaleDateString('en-SG'),
                <span key="dt" style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                  background: dayType === 'Mega' ? 'rgba(245,158,11,0.15)' : 'rgba(var(--ds-accent-raw),0.1)',
                  color: dayType === 'Mega' ? '#F59E0B' : 'var(--ds-accent)',
                }}>{dayType === 'Mega' ? '🔥 Mega' : 'BAU'}</span>,
                s.dayOfWeek,
                `${fmt12(s.startHour, s.startMinute)}–${s.endIsNextDay ? '12am' : fmt12(s.endHour, s.endMinute)}`,
                s.talent,
                s.brand ?? '—',
                s.platform ?? '—',
                s.hours > 0 ? `${s.hours.toFixed(1)}h` : '—',
                <StatusBadge key="s" status={s.status} />,
              ]})}
            />
            ) : (() => {
              const year = calMonth.getFullYear()
              const month = calMonth.getMonth()
              const firstDay = new Date(year, month, 1).getDay()
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const streamsByDate: Record<string, Stream[]> = {}
              planned.forEach(s => {
                const d = new Date(s.date)
                if (d.getFullYear() === year && d.getMonth() === month) {
                  const key = d.getDate().toString()
                  if (!streamsByDate[key]) streamsByDate[key] = []
                  streamsByDate[key].push(s)
                }
              })
              const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
              while (cells.length % 7 !== 0) cells.push(null)
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} style={{ fontSize: '0.65rem', color: TEXT_SEC, textAlign: 'center', padding: '4px 0', fontWeight: 600 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                    {cells.map((day, i) => {
                      if (!day) return <div key={i} />
                      const dayType = getDayType(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`)
                      const streams = streamsByDate[day.toString()] ?? []
                      const isMega = dayType === 'Mega'
                      return (
                        <div key={i} style={{
                          minHeight: isMobile ? 72 : 96, borderRadius: 6, padding: '4px 5px',
                          background: isMega ? 'rgba(245,158,11,0.08)' : SURFACE_RAISED,
                          border: `1px solid ${isMega ? 'rgba(245,158,11,0.3)' : BORDER}`,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isMega ? '#F59E0B' : TEXT_SEC }}>{day}</span>
                            {isMega && <span style={{ fontSize: '0.55rem', color: '#F59E0B' }}>🔥</span>}
                          </div>
                          {streams.map((s, si) => {
                            const bc = getBrandColor(s.brand)
                            return (
                            <div key={si} style={{
                              fontSize: '0.6rem', lineHeight: 1.3, marginBottom: 2, padding: '2px 4px', borderRadius: 3,
                              background: bc.bg, color: bc.text, wordBreak: 'break-word',
                            }} title={`${fmt12(s.startHour, s.startMinute)} ${s.talent}${s.brand ? ` · ${s.brand}` : ''}${s.platform ? ` · ${s.platform}` : ''}`}>
                              <span style={{ fontWeight: 700 }}>{fmt12(s.startHour, s.startMinute)}</span>{' '}{s.talent}{s.brand ? ` · ${s.brand}` : ''}{s.platform ? ` · ${s.platform}` : ''}
                            </div>
                          )})}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* Claude analysis */}
      {(analysing || analysis) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC }}>
            Claude Analysis
          </div>

          {analysing && !analysis && (
            <div style={{ ...cardStyle, color: TEXT_SEC, fontSize: '0.875rem' }}>
              Analysing {planned.length} planned streams against {historical.length} historical streams
              <span className="cursor-blink" style={{ color: ACCENT }}> ▋</span>
            </div>
          )}

          {sections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'nowrap', gap: 16, overflowX: isMobile ? 'visible' : 'auto', paddingBottom: 8 }}>
              {sections.map((s, i) => (
                <div key={i} style={{
                  ...cardStyle,
                  minWidth: isMobile ? 0 : 260, maxWidth: isMobile ? '100%' : 340, flexShrink: 0,
                  borderLeft: `3px solid ${
                    s.title.toLowerCase().includes('conflict')
                      ? '#F87171'
                      : s.title.toLowerCase().includes('risk') || s.title.toLowerCase().includes('flag')
                      ? '#FB923C'
                      : s.title.toLowerCase().includes('recommend')
                      ? ACCENT
                      : '#60A5FA'
                  }`,
                }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700, color:
                    s.title.toLowerCase().includes('conflict') ? '#F87171'
                    : s.title.toLowerCase().includes('risk') || s.title.toLowerCase().includes('flag') ? '#FB923C'
                    : s.title.toLowerCase().includes('recommend') ? ACCENT
                    : '#60A5FA'
                  }}>
                    {s.title}
                  </div>
                  <MdText text={s.body} style={{ fontSize: '0.82rem', color: TEXT_SEC, lineHeight: 1.8 }} />
                  {i === sections.length - 1 && analysing && (
                    <span className="cursor-blink" style={{ color: ACCENT }}>▋</span>
                  )}
                </div>
              ))}
            </div>
          ) : analysis ? (
            <div style={cardStyle}>
              <MdText text={analysis} style={{ fontSize: '0.875rem', color: TEXT_SEC, lineHeight: 1.8 }} />
              {analysing && <span className="cursor-blink" style={{ color: ACCENT }}>▋</span>}
            </div>
          ) : null}

          {/* Follow-up chat */}
          {analysed && (
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: TEXT_SEC }}>
                Follow-up Questions
              </div>

              {followUps.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {followUps.map((msg, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: msg.role === 'user' ? SURFACE_RAISED : 'transparent',
                      border: msg.role === 'assistant' ? `1px solid ${BORDER}` : 'none',
                      fontSize: '0.82rem', lineHeight: 1.7,
                    }}>
                      {msg.role === 'user' ? (
                        <span style={{ color: ACCENT }}>{msg.text}</span>
                      ) : (
                        <>
                          <MdText text={msg.text} style={{ color: TEXT_PRI }} />
                          {i === followUps.length - 1 && followStreaming && (
                            <span className="cursor-blink" style={{ color: ACCENT }}>▋</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={followEndRef} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={followInput}
                  onChange={e => setFollowInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); askFollowUp() } }}
                  placeholder="Ask a follow-up question about this analysis..."
                  style={{
                    flex: 1, background: SURFACE_RAISED, border: `1px solid ${BORDER}`,
                    borderRadius: 6, padding: '8px 12px', color: TEXT_PRI,
                    fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit',
                  }}
                  disabled={followStreaming}
                />
                <button
                  onClick={askFollowUp}
                  disabled={followStreaming || !followInput.trim()}
                  style={{
                    padding: '8px 16px', background: ACCENT, color: '#0A0A0A',
                    border: 'none', borderRadius: 6, fontWeight: 700, fontSize: '0.8rem',
                    cursor: followStreaming || !followInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: followStreaming || !followInput.trim() ? 0.5 : 1,
                  }}
                >
                  {followStreaming ? '...' : '→'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
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
  const isMobile = useMobile()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: isMobile ? '100%' : 800 }}>
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
  headers, rows, compact = false,
}: {
  headers: string[]
  rows: (React.ReactNode | string | number)[][]
  compact?: boolean
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
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? SURFACE : SURFACE_RAISED }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = ri % 2 === 0 ? SURFACE : SURFACE_RAISED)}
            >
              {row.map((cell, ci) => (
                <td key={ci} style={compact ? { ...tdStyle, padding: '6px 10px', fontSize: '0.75rem' } : tdStyle}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
