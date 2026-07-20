import { google } from 'googleapis'
import { parseRows } from './parser'
import { getCached, setCache, clearCache, getCacheTimestamp } from './cache'

export async function fetchStreams(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCached()
    if (cached) return cached
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

  const sheets = google.sheets({ version: 'v4', auth: oauth2 })

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

export { clearCache, getCacheTimestamp }
