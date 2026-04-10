import { supabase } from './supabase'

// ─── Period helpers ───────────────────────────────────────────────────────────

export type PeriodType = 'week' | 'month' | 'year'

export interface PeriodRange {
  start: string   // YYYY-MM-DD
  end: string     // YYYY-MM-DD
  label: string
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getWeekRange(offset = 0): PeriodRange {
  const now = new Date()
  const dow = now.getDay()
  const diff = -((dow + 1) % 7)   // offset to most recent Saturday
  const sat = new Date(now)
  sat.setHours(0, 0, 0, 0)
  sat.setDate(now.getDate() + diff + offset * 7)
  const fri = new Date(sat)
  fri.setDate(sat.getDate() + 6)
  return { start: toISO(sat), end: toISO(fri), label: `${fmt(sat)} – ${fmt(fri)}/${fri.getFullYear()}` }
}

export function getMonthRange(offset = 0): PeriodRange {
  const d = new Date()
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  const last = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0)
  return {
    start: toISO(first),
    end: toISO(last),
    label: `Tháng ${String(first.getMonth() + 1).padStart(2, '0')}/${first.getFullYear()}`,
  }
}

export function getYearRange(offset = 0): PeriodRange {
  const year = new Date().getFullYear() + offset
  return { start: `${year}-01-01`, end: `${year}-12-31`, label: `Năm ${year}` }
}

export function getPeriodRange(type: PeriodType, offset = 0): PeriodRange {
  if (type === 'week') return getWeekRange(offset)
  if (type === 'month') return getMonthRange(offset)
  return getYearRange(offset)
}

export function getPreviousPeriodRange(type: PeriodType, offset = 0): PeriodRange {
  return getPeriodRange(type, offset - 1)
}

// ─── Data types ───────────────────────────────────────────────────────────────

export interface StatRow {
  report_date: string
  channel: string
  product_code: string
  product_name: string
  revenue: number
  impressions: number
  clicks: number
  orders: number
  buyers: number
}

export interface ChannelStat {
  channel: string
  revenue: number
  orders: number
}

export interface ProductStat {
  product_code: string
  product_name: string
  revenue: number
  orders: number
  buyers: number
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchStats(start: string, end: string): Promise<StatRow[]> {
  const { data, error } = await supabase
    .from('shopee_stats')
    .select('report_date, channel, product_code, product_name, revenue, impressions, clicks, orders, buyers')
    .gte('report_date', start)
    .lte('report_date', end)
  if (error) throw new Error(error.message)
  return (data ?? []) as StatRow[]
}

// ─── Aggregations ─────────────────────────────────────────────────────────────

export function aggregateByChannel(rows: StatRow[]): ChannelStat[] {
  const map: Record<string, ChannelStat> = {}
  for (const row of rows) {
    if (!map[row.channel]) map[row.channel] = { channel: row.channel, revenue: 0, orders: 0 }
    map[row.channel].revenue += row.revenue
    map[row.channel].orders += row.orders
  }
  return Object.values(map).sort((a, b) => b.revenue - a.revenue)
}

export function aggregateTopProducts(rows: StatRow[], limit = 10): ProductStat[] {
  const map: Record<string, ProductStat> = {}
  for (const row of rows) {
    if (!row.product_code) continue  // skip shopee_ads row
    if (!map[row.product_code]) {
      map[row.product_code] = {
        product_code: row.product_code,
        product_name: row.product_name,
        revenue: 0,
        orders: 0,
        buyers: 0,
      }
    }
    map[row.product_code].revenue += row.revenue
    map[row.product_code].orders += row.orders
    map[row.product_code].buyers += row.buyers
  }
  return Object.values(map)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function totalRevenue(rows: StatRow[]): number {
  return rows.reduce((s, r) => s + r.revenue, 0)
}

export function totalOrders(rows: StatRow[]): number {
  // exclude shopee_ads row since it has no orders
  return rows.filter((r) => r.product_code !== '').reduce((s, r) => s + r.orders, 0)
}

export function totalProducts(rows: StatRow[]): number {
  return new Set(rows.filter((r) => r.product_code !== '').map((r) => r.product_code)).size
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export function formatVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString('vi-VN')
}
