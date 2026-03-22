import * as XLSX from 'xlsx'

export type ShopeeChannel = 'the_sp' | 'livestream' | 'video' | 'affiliate' | 'shopee_ads'

export interface ShopeeProductRow {
  report_date: string       // ISO format: YYYY-MM-DD
  channel: ShopeeChannel
  product_code: string      // '' for shopee_ads channel
  product_name: string      // '' for shopee_ads channel
  revenue: number
  impressions: number
  clicks: number
  orders: number
  buyers: number
}

export interface ShopeeParseResult {
  rows: ShopeeProductRow[]
  report_date: string
  error?: string
}

// Map Vietnamese channel header names → DB keys
const CHANNEL_MAP: Record<string, ShopeeChannel> = {
  'thẻ sản phẩm': 'the_sp',
  'live': 'livestream',
  'video': 'video',
  'tiếp thị liên kết': 'affiliate',
}

// Must match "Theo sản phẩm (đơn đã xác nhận)" specifically
const TARGET_SHEET_KEYWORDS = ['theo sản phẩm', 'xác n']

// Parse Vietnamese number format: "1.400.000" → 1400000, "2,00" → 2
function parseViNumber(value: unknown): number {
  if (value === null || value === undefined || value === '' || value === '-') return 0
  const str = String(value).trim()
  // Remove thousand separators (dots) and replace decimal comma with dot
  const normalized = str.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return isNaN(num) ? 0 : Math.round(num)
}

// Parse date string "07-03-2026-07-03-2026" → "2026-03-07"
function parseReportDate(value: unknown): string | null {
  const str = String(value ?? '').trim()
  // Format: DD-MM-YYYY-DD-MM-YYYY — take the first date
  const match = str.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export function parseShopeeFile(file: File): Promise<ShopeeParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        // Find the correct sheet: "Theo sản phẩm (đơn đã xác nhận)"
        const sheetName = workbook.SheetNames.find((name) => {
          const lower = name.toLowerCase()
          return TARGET_SHEET_KEYWORDS.every((kw) => lower.includes(kw))
        })
        if (!sheetName) {
          resolve({ rows: [], report_date: '', error: 'Không tìm thấy sheet "Theo sản phẩm (đơn đã xác nhận)"' })
          return
        }

        const sheet = workbook.Sheets[sheetName]
        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

        // Row 1 (index 1): summary row — contains date and shopee_ads revenue
        const summaryRow = rawRows[1] as unknown[]
        const report_date = parseReportDate(summaryRow?.[0])
        if (!report_date) {
          resolve({ rows: [], report_date: '', error: 'Không đọc được ngày báo cáo' })
          return
        }

        const revenueShopeeAds = parseViNumber(summaryRow?.[7])
        const rows: ShopeeProductRow[] = []

        // Add shopee_ads summary row if revenue > 0
        if (revenueShopeeAds > 0) {
          rows.push({
            report_date,
            channel: 'shopee_ads',
            product_code: '',
            product_name: '',
            revenue: revenueShopeeAds,
            impressions: 0,
            clicks: 0,
            orders: 0,
            buyers: 0,
          })
        }

        // Parse product sections — detect by channel header rows
        let currentChannel: ShopeeChannel | null = null

        for (let i = 2; i < rawRows.length; i++) {
          const row = rawRows[i] as unknown[]
          const firstCell = String(row[0] ?? '').trim()

          if (!firstCell) continue

          // Check if this row is a channel header
          const channelKey = CHANNEL_MAP[firstCell.toLowerCase()]
          if (channelKey) {
            currentChannel = channelKey
            i++ // Skip the column header row that follows
            continue
          }

          // Skip the column header rows themselves
          if (firstCell === 'Mã sản phẩm') continue

          // Product data row
          if (currentChannel && firstCell) {
            rows.push({
              report_date,
              channel: currentChannel,
              product_code: firstCell,
              product_name: String(row[1] ?? '').trim(),
              revenue: parseViNumber(row[4]),
              impressions: parseViNumber(row[5]),
              clicks: parseViNumber(row[6]),
              orders: parseViNumber(row[7]),
              buyers: parseViNumber(row[12]),
            })
          }
        }

        resolve({ rows, report_date })
      } catch (err) {
        resolve({ rows: [], report_date: '', error: `Lỗi đọc file: ${(err as Error).message}` })
      }
    }

    reader.onerror = () => {
      resolve({ rows: [], report_date: '', error: 'Không thể đọc file' })
    }

    reader.readAsArrayBuffer(file)
  })
}
