import { google } from 'googleapis'
import { parseRows } from './parser'
import { getCached, setCache, clearCache, getCacheTimestamp } from './cache'

export async function fetchStreams(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCached()
    if (cached) return cached
  }

  const sheets = google.sheets({ version: 'v4', auth: getOAuth2() })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "'[NEW] Availability 2026'!A1:AC2500",
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  })

  const rows = response.data.values ?? []
  const dataRows = rows.slice(28)
  const parsed = parseRows(dataRows as unknown[][])

  setCache(parsed)
  return parsed
}

function getOAuth2() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2
}

export async function fetchPlanningContext(): Promise<{ availability: string; notes: string }> {
  const sheets = google.sheets({ version: 'v4', auth: getOAuth2() })
  const sheetId = process.env.GOOGLE_SHEET_ID

  const [availRes, notesRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Streamer Availability'!A1:AZ500",
      valueRenderOption: 'FORMATTED_VALUE',
    }).catch(() => null),
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Planning Notes'!A1:AZ500",
      valueRenderOption: 'FORMATTED_VALUE',
    }).catch(() => null),
  ])

  const RETRACTED = /\b(retract|retracted|withdrawn|cancelled|canceled|void|n\/a)\b/i

  const parseAvailability = (rows: string[][] | null | undefined): string => {
    if (!rows?.length) return '(empty)'
    // Row 0 = header: Date, Month, Day, Notes, Streamer1, Streamer2, ...
    const header = rows[0].map(c => c?.toString().trim() ?? '')
    const streamerCols: { name: string; col: number }[] = []
    for (let i = 4; i < header.length; i++) {
      if (header[i]) streamerCols.push({ name: header[i], col: i })
    }
    if (!streamerCols.length) return '(empty)'

    const lines: string[] = []
    for (const row of rows.slice(1)) {
      const date = row[0]?.toString().trim()
      const day = row[2]?.toString().trim()
      if (!date) continue
      const label = day ? `${date} (${day})` : date
      for (const { name, col } of streamerCols) {
        const status = row[col]?.toString().trim()
        if (!status) continue
        if (RETRACTED.test(status)) continue
        lines.push(`${name} | ${label} | ${status}`)
      }
    }
    return lines.length ? lines.join('\n') : '(empty)'
  }

  const toText = (rows: string[][] | null | undefined): string => {
    if (!rows?.length) return '(empty)'
    return rows
      .filter(r => r.some(c => c?.toString().trim()))
      .filter(r => !r.some(c => RETRACTED.test(c?.toString() ?? '')))
      .map(r => r.map(c => c?.toString().trim() ?? '').join('\t'))
      .join('\n')
  }

  return {
    availability: parseAvailability(availRes?.data.values as string[][] | undefined),
    notes: toText(notesRes?.data.values as string[][] | undefined),
  }
}

export { clearCache, getCacheTimestamp }
