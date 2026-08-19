export interface Stream {
  flag: string | null
  amirulApproval: string | null
  date: Date
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

function parseGoogleDate(serial: number): Date {
  const msPerDay = 24 * 60 * 60 * 1000
  return new Date((serial - 25569) * msPerDay)
}

function parseGoogleTime(serial: number): { hour: number; minute: number; isNextDay: boolean } {
  const isNextDay = serial === 0
  const totalMinutes = Math.round(serial * 24 * 60)
  return {
    hour: Math.floor(totalMinutes / 60) % 24,
    minute: totalMinutes % 60,
    isNextDay,
  }
}

export function parseRows(rawRows: unknown[][]): Stream[] {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const TBC_RE = /\btbc\b|scheduled/i

  return rawRows
    .filter(row => {
      const dateVal = row[2]
      if (typeof dateVal !== 'number' || dateVal <= 40000) return false
      const talent = row[6]
      const hasTalent = typeof talent === 'string' && talent.trim().length > 0
      // Allow talent-less rows that are explicitly flagged as TBC/Scheduled
      const flag   = typeof row[0] === 'string' ? row[0] : ''
      const status = typeof row[11] === 'string' ? row[11] : ''
      const notes  = typeof row[25] === 'string' ? row[25] : ''
      const isPrePlanned = TBC_RE.test(flag) || TBC_RE.test(status) || TBC_RE.test(notes)
      return hasTalent || isPrePlanned
    })
    .map(row => {
      const date = parseGoogleDate(row[2] as number)
      const dayOfWeek = DAYS[date.getDay()]

      const startRaw = typeof row[4] === 'number' ? row[4] : 0
      const endRaw = typeof row[5] === 'number' ? row[5] : 0

      const start = parseGoogleTime(startRaw)
      const end = parseGoogleTime(endRaw)

      const startMins = start.hour * 60 + start.minute
      const endMins = end.isNextDay ? 24 * 60 : end.hour * 60 + end.minute
      const hours = Math.max(0, (endMins - startMins) / 60)

      const tiktokGmv = typeof row[12] === 'number' ? row[12] : 0
      const shopeeGmv = typeof row[13] === 'number' ? row[13] : 0
      const totalGmv = tiktokGmv + shopeeGmv
      const gmvPerHour = hours > 0 ? totalGmv / hours : 0

      return {
        flag: row[0] ? String(row[0]) : null,
        amirulApproval: row[1] ? String(row[1]) : null,
        date,
        dayOfWeek,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        endIsNextDay: end.isNextDay,
        talent: String(row[6]).trim(),
        brand: row[7] ? String(row[7]).trim() : null,
        account: row[8] ? String(row[8]) : null,
        period: row[9] ? String(row[9]) : null,
        platform: row[10] ? String(row[10]) : null,
        status: row[11] ? String(row[11]) : null,
        tiktokGmv,
        shopeeGmv,
        totalGmv,
        hours,
        gmvPerHour,
        version: row[18] ? String(row[18]) : null,
        method: row[19] ? String(row[19]) : null,
        talentFee: typeof row[21] === 'number' ? row[21] : null,
        room: row[22] ? String(row[22]) : null,
        notes: row[25] ? String(row[25]) : null,
        eventId: row[27] ? String(row[27]) : null,
      }
    })
}
