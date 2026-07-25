import Anthropic from '@anthropic-ai/sdk'
import { fetchPlanningContext } from '@/lib/sheets'

export async function POST(req: Request) {
  const { planned, historical } = await req.json()

  const planningContext = await fetchPlanningContext().catch(() => ({ availability: '(unavailable)', notes: '(unavailable)' }))

  const client = new Anthropic()

  // Build compact historical summaries to avoid token bloat
  const timeslotPerf: Record<string, { gmvs: number[]; day: string; bucket: string }> = {}
  const talentPerf: Record<string, { totalGmv: number; hours: number; count: number }> = {}
  const brandPerf: Record<string, { totalGmv: number; count: number }> = {}
  const talentBrandPerf: Record<string, number[]> = {}

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const bucket = (h: number) => {
    if (h >= 12 && h < 14) return '12–14'
    if (h >= 14 && h < 16) return '14–16'
    if (h >= 16 && h < 18) return '16–18'
    if (h >= 18 && h < 20) return '18–20'
    if (h >= 20 && h < 22) return '20–22'
    if (h >= 22 || h === 0) return '22–00'
    return 'other'
  }

  for (const s of historical) {
    const b = bucket(s.startHour)
    const key = `${s.dayOfWeek}|${b}`
    if (!timeslotPerf[key]) timeslotPerf[key] = { gmvs: [], day: s.dayOfWeek, bucket: b }
    timeslotPerf[key].gmvs.push(s.totalGmv)

    if (!talentPerf[s.talent]) talentPerf[s.talent] = { totalGmv: 0, hours: 0, count: 0 }
    talentPerf[s.talent].totalGmv += s.totalGmv
    talentPerf[s.talent].hours += s.hours
    talentPerf[s.talent].count++

    if (s.brand) {
      if (!brandPerf[s.brand]) brandPerf[s.brand] = { totalGmv: 0, count: 0 }
      brandPerf[s.brand].totalGmv += s.brand ? s.totalGmv : 0
      brandPerf[s.brand].count++

      const tbKey = `${s.talent}|${s.brand}`
      if (!talentBrandPerf[tbKey]) talentBrandPerf[tbKey] = []
      talentBrandPerf[tbKey].push(s.totalGmv)
    }
  }

  const timeslotSummary = Object.entries(timeslotPerf).map(([, v]) => ({
    slot: `${v.day} ${v.bucket}`,
    streams: v.gmvs.length,
    avgGmv: Math.round(v.gmvs.reduce((a, b) => a + b, 0) / v.gmvs.length),
  })).sort((a, b) => b.avgGmv - a.avgGmv)

  const talentSummary = Object.entries(talentPerf).map(([name, v]) => ({
    name,
    streams: v.count,
    avgGmv: Math.round(v.totalGmv / v.count),
    avgGmvHour: v.hours > 0 ? Math.round(v.totalGmv / v.hours) : 0,
  })).sort((a, b) => b.avgGmv - a.avgGmv)

  const brandSummary = Object.entries(brandPerf).map(([name, v]) => ({
    name,
    streams: v.count,
    avgGmv: Math.round(v.totalGmv / v.count),
  })).sort((a, b) => b.avgGmv - a.avgGmv)

  const tbSummary = Object.entries(talentBrandPerf).map(([key, gmvs]) => {
    const [talent, brand] = key.split('|')
    return { talent, brand, streams: gmvs.length, avgGmv: Math.round(gmvs.reduce((a, b) => a + b, 0) / gmvs.length) }
  }).sort((a, b) => b.avgGmv - a.avgGmv)

  const getMegaType = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDate()
    const month = d.getMonth() + 1
    const isDoubleDigit = day === month || day === month - 1
    const isMidMonth = day === 15 || day === 14
    const isPayday = day === 25 || day === 24
    return (isDoubleDigit || isMidMonth || isPayday) ? 'Mega' : 'BAU'
  }

  const plannedSummary = planned.map((s: { date: string; dayOfWeek: string; startHour: number; startMinute: number; talent: string; brand: string | null; platform: string | null; hours: number }) => ({
    date: new Date(s.date).toLocaleDateString('en-SG'),
    day: s.dayOfWeek,
    time: `${String(s.startHour).padStart(2, '0')}:${String(s.startMinute).padStart(2, '0')}`,
    slot: `${s.dayOfWeek} ${bucket(s.startHour)}`,
    dayType: getMegaType(s.date),
    talent: s.talent,
    brand: s.brand,
    platform: s.platform,
    hours: s.hours,
  }))

  const systemPrompt = `You are a livestream campaign planning analyst for MajorForm, a Singapore digital marketing agency.
You will be given historical performance data (completed streams with GMV) and a set of PLANNED streams (TBC).
Your job: analyse the planned streams against historical patterns and flag issues, risks, and opportunities.

KEY CONTEXT — DAY TYPES:
- Mega days = double-digit days (where day number equals month number, e.g. 6 June = 6/6, 7 July = 7/7), mid-month (14th and 15th), and payday (24th and 25th), PLUS the day before each of those dates. These days historically drive significantly higher GMV.
- BAU days = all other days.
Each planned stream is tagged with its dayType (Mega or BAU). Factor this heavily into your analysis — scheduling strong brands/streamers on BAU days when Mega dates are available is a missed opportunity, and vice versa (depleting a brand's best talent on BAU days before Mega dates).

STREAMER AVAILABILITY (from live schedule sheet — each row shows a streamer's stated available time windows for specific dates):
${planningContext.availability}

PLANNING NOTES (internal notes from the planning team — treat these as ground truth context, constraints, and priorities):
${planningContext.notes}

Format your response in clear sections using these EXACT headers (all six, in this order):
## Overview
## Streamer Conflict Analysis
## Streamer Load Analysis
## Brand Coverage Analysis
## Timeslot Risk Flags
## Recommendations

CRITICAL INSTRUCTION for ## Streamer Conflict Analysis:
Go through every planned stream and cross-reference against the Streamer Availability data. ONLY output a bullet if there is a hard, confirmed conflict. Everything else is silently omitted.
- A CONFIRMED CONFLICT exists when: the streamer's availability data for that specific date explicitly states a time window AND the scheduled stream falls outside that window (e.g. available 6–8pm but booked 8–10pm).
- If availability is marked as retracted, withdrawn, or cancelled — treat it as no longer valid and DO NOT flag it as a conflict.
- If no availability entry exists for a date — silently skip it, do NOT flag as potential conflict.
- If availability aligns with the scheduled time — silently skip it, do NOT mention it.
- Each conflict bullet must start with **CONFIRMED CONFLICT** and state: streamer name, date, their stated available window, and the conflicting scheduled time.
- If zero confirmed conflicts exist, write only: "– No conflicts detected."
- ABSOLUTE RULE: only output bullets for confirmed time-window mismatches. Nothing else.

Be specific throughout — reference streamer names, brands, dates, times (12hr format), SGD numbers, and Mega/BAU classification.
Factor in any constraints or priorities mentioned in the Planning Notes.
IMPORTANT: The historical data covers ALL completed streams from the earliest available date. Do not assume a combo is untested unless it genuinely has zero entries in the talent × brand combos table.
Keep non-conflict sections tight — 3–5 bullet points max. Use bullet points (–) not numbers.`

  const userContent = `HISTORICAL TIMESLOT PERFORMANCE (by avg GMV):
${JSON.stringify(timeslotSummary, null, 2)}

HISTORICAL TALENT PERFORMANCE:
${JSON.stringify(talentSummary, null, 2)}

HISTORICAL BRAND PERFORMANCE:
${JSON.stringify(brandSummary, null, 2)}

HISTORICAL TALENT × BRAND COMBOS (all pairings with stream count and avg GMV):
${JSON.stringify(tbSummary, null, 2)}

PLANNED STREAMS (TBC — ${plannedSummary.length} streams):
${JSON.stringify(plannedSummary, null, 2)}

Analyse the planned streams against the historical data. Identify risks, imbalances, and missed opportunities.`

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
