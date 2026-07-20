import { google } from 'googleapis'
import { parseRows } from './parser'
import { getCached, setCache, clearCache, getCacheTimestamp } from './cache'

export async function fetchStreams(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getCached()
    if (cached) return cached
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'NEW Availability 2026!A1:AC2500',
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
