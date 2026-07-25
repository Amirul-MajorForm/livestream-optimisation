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

  const toText = (rows: string[][] | null | undefined): string => {
    if (!rows?.length) return '(empty)'
    return rows
      .filter(r => r.some(c => c?.toString().trim()))
      .map(r => r.map(c => c?.toString().trim() ?? '').join('\t'))
      .join('\n')
  }

  return {
    availability: toText(availRes?.data.values as string[][] | undefined),
    notes: toText(notesRes?.data.values as string[][] | undefined),
  }
}

export { clearCache, getCacheTimestamp }
