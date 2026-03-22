<template>
  <div class="reports">
    <div class="reports-header">
      <n-h2>Báo cáo</n-h2>
      <div class="header-controls">
        <div class="label-toggle">
          <n-text depth="3" style="font-size: 0.8rem">Tên đầy đủ</n-text>
          <n-switch v-model:value="showFullNames" size="small" />
        </div>
        <n-select
          v-model:value="chartFontSize"
          :options="fontSizeOptions"
          size="small"
          style="width: 8rem"
        />
        <PeriodSelector v-model="period" @type-change="(t) => (periodType = t)" />
      </div>
    </div>

    <n-spin :show="loading">
      <div class="reports-body">
        <!-- 1. Channel charts -->
        <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" :collapsed-cols="1">
          <n-gi>
            <n-card title="Doanh thu theo kênh">
              <v-chart
                v-if="channelBarOption"
                :option="channelBarOption"
                :style="{ height: '350px' }"
                autoresize
              />
              <n-empty
                v-else
                description="Không có dữ liệu"
                style="height: 350px; display: flex; align-items: center; justify-content: center"
              />
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Tỷ trọng doanh thu">
              <v-chart
                v-if="channelPieOption"
                :option="channelPieOption"
                :style="{ height: '350px' }"
                autoresize
              />
              <n-empty
                v-else
                description="Không có dữ liệu"
                style="height: 350px; display: flex; align-items: center; justify-content: center"
              />
            </n-card>
          </n-gi>
        </n-grid>

        <!-- 2. Top N Products -->
        <n-card style="margin-top: 1rem">
          <template #header>
            <div class="card-header-with-control">
              <span>Top sản phẩm theo doanh thu</span>
              <n-select
                v-model:value="topN"
                :options="topNOptions"
                size="small"
                style="width: 7rem"
              />
            </div>
          </template>
          <v-chart
            v-if="topProductsOption"
            :option="topProductsOption"
            :style="{ height: topProductsHeight }"
            autoresize
          />
          <n-empty
            v-else
            description="Không có dữ liệu"
            style="height: 300px; display: flex; align-items: center; justify-content: center"
          />
        </n-card>

        <!-- 3. Heatmap -->
        <n-card title="Phân tích sản phẩm theo kênh" style="margin-top: 1rem">
          <v-chart
            v-if="heatmapOption"
            :option="heatmapOption"
            :style="{ height: heatmapHeight }"
            autoresize
          />
          <n-empty
            v-else
            description="Không có dữ liệu"
            style="height: 300px; display: flex; align-items: center; justify-content: center"
          />
        </n-card>

        <!-- 4. Period Comparison -->
        <n-card style="margin-top: 1rem">
          <template #header>
            <div class="card-header-with-control">
              <span>So sánh doanh thu</span>
              <div class="comparison-controls">
                <n-select
                  v-model:value="comparisonMode"
                  :options="comparisonModeOptions"
                  size="small"
                  style="width: 13rem"
                />
                <n-date-picker
                  v-if="comparisonMode === 'custom'"
                  v-model:value="customCompareRange"
                  type="daterange"
                  size="small"
                  clearable
                  style="width: 17rem"
                />
              </div>
            </div>
          </template>
          <v-chart
            v-if="comparisonOption"
            :option="comparisonOption"
            :style="{ height: '380px' }"
            autoresize
          />
          <n-empty
            v-else
            description="Không có dữ liệu"
            style="height: 380px; display: flex; align-items: center; justify-content: center"
          />
        </n-card>
      </div>
    </n-spin>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import {
    NH2, NGrid, NGi, NCard, NSpin, NEmpty,
    NSelect, NSwitch, NText, NDatePicker,
  } from 'naive-ui'
  import VChart from 'vue-echarts'
  import PeriodSelector from '@/components/common/PeriodSelector.vue'
  import {
    fetchStats, aggregateByChannel, aggregateTopProducts,
    formatVND, getPeriodRange,
    type PeriodType, type PeriodRange, type StatRow,
  } from '@/services/analytics'

  const CHANNEL_LABELS: Record<string, string> = {
    the_sp: 'Thẻ SP',
    livestream: 'Livestream',
    video: 'Video',
    affiliate: 'Affiliate',
    shopee_ads: 'Quảng cáo',
  }

  const CHANNEL_COLORS: Record<string, string> = {
    the_sp: '#18a058',
    video: '#2080f0',
    affiliate: '#f0a020',
    livestream: '#d03050',
    shopee_ads: '#8b5cf6',
  }

  const HEATMAP_CHANNELS = ['the_sp', 'livestream', 'video', 'affiliate']

  const TOP_N_OPTIONS = [
    { label: 'Top 10', value: 10 },
    { label: 'Top 20', value: 20 },
    { label: 'Top 50', value: 50 },
  ]

  const FONT_SIZE_OPTIONS = [
    { label: 'Chữ nhỏ', value: 11 },
    { label: 'Chữ vừa', value: 13 },
    { label: 'Chữ lớn', value: 15 },
  ]

  function tsToISO(ts: number): string {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function tsToLabel(ts: number): string {
    const d = new Date(ts)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  function shiftDateStr(dateStr: string, months: number, years: number): string {
    const d = new Date(dateStr + 'T00:00:00')
    d.setFullYear(d.getFullYear() + years)
    d.setMonth(d.getMonth() + months)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function shiftPeriodLabel(period: PeriodRange, months: number, years: number): string {
    const s = new Date(shiftDateStr(period.start, months, years) + 'T00:00:00')
    const e = new Date(shiftDateStr(period.end, months, years) + 'T00:00:00')
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    return `${fmt(s)} – ${fmt(e)}/${e.getFullYear()}`
  }

  const COMPARISON_MODE_OPTIONS = [
    { label: 'Kỳ trước', value: 'auto' },
    { label: 'Cùng kỳ tháng trước', value: 'month_ago' },
    { label: 'Cùng kỳ năm trước', value: 'year_ago' },
    { label: 'Tùy chỉnh', value: 'custom' },
  ]

  export default defineComponent({
    name: 'ReportsPage',
    components: {
      NH2, NGrid, NGi, NCard, NSpin, NEmpty,
      NSelect, NSwitch, NText, NDatePicker,
      VChart, PeriodSelector,
    },

    setup() {
      return { formatVND }
    },

    data() {
      return {
        periodType: 'week' as PeriodType,
        period: null as PeriodRange | null,
        loading: false,
        currentRows: [] as StatRow[],
        previousRows: [] as StatRow[],
        topN: 10,
        topNOptions: TOP_N_OPTIONS,
        showFullNames: false,
        chartFontSize: 13,
        fontSizeOptions: FONT_SIZE_OPTIONS,
        comparisonMode: 'auto' as 'auto' | 'month_ago' | 'year_ago' | 'custom',
        comparisonModeOptions: COMPARISON_MODE_OPTIONS,
        customCompareRange: null as [number, number] | null,
        customCompareRows: [] as StatRow[],
        customCompareLabel: '',
        monthAgoRows: [] as StatRow[],
        yearAgoRows: [] as StatRow[],
      }
    },

    computed: {
      channelBarOption() {
        const channels = aggregateByChannel(this.currentRows)
        if (!channels.length) return null

        const fs = this.chartFontSize
        const periodLabel = this.period?.label ?? ''
        const chartTitle = 'Doanh thu theo kênh'
        const sorted = [...channels].sort((a, b) => a.revenue - b.revenue)

        return {
          title: { text: periodLabel, left: 'center', textStyle: { fontSize: fs, fontWeight: 'normal' } },
          tooltip: {
            trigger: 'axis',
            formatter: (params: { name: string; value: number }[]) =>
              `${params[0].name}<br/>${formatVND(params[0].value)} VND`,
          },
          toolbox: {
            right: 10,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `${chartTitle} - ${periodLabel}` } },
          },
          grid: { left: '2%', right: '12%', top: 36, containLabel: true },
          xAxis: { type: 'value', axisLabel: { fontSize: fs, formatter: (v: number) => formatVND(v) } },
          yAxis: {
            type: 'category',
            data: sorted.map((c) => CHANNEL_LABELS[c.channel] ?? c.channel),
            axisLabel: { fontSize: fs },
          },
          series: [{
            type: 'bar',
            data: sorted.map((c) => ({
              value: c.revenue,
              itemStyle: { color: CHANNEL_COLORS[c.channel] ?? '#999' },
            })),
            label: {
              show: true,
              position: 'right',
              fontSize: fs,
              formatter: (p: { value: number }) => formatVND(p.value),
            },
          }],
        }
      },

      channelPieOption() {
        const channels = aggregateByChannel(this.currentRows)
        if (!channels.length) return null

        const fs = this.chartFontSize
        const periodLabel = this.period?.label ?? ''
        const chartTitle = 'Tỷ trọng doanh thu'

        return {
          title: { text: periodLabel, left: 'center', textStyle: { fontSize: fs, fontWeight: 'normal' } },
          tooltip: {
            trigger: 'item',
            formatter: (p: { name: string; value: number; percent: number }) =>
              `${p.name}<br/>${formatVND(p.value)} VND (${p.percent}%)`,
          },
          legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: fs } },
          toolbox: {
            right: 10,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `${chartTitle} - ${periodLabel}` } },
          },
          series: [{
            type: 'pie',
            radius: ['40%', '65%'],
            center: ['50%', '50%'],
            top: 24,
            data: channels.map((c) => ({
              name: CHANNEL_LABELS[c.channel] ?? c.channel,
              value: c.revenue,
              itemStyle: { color: CHANNEL_COLORS[c.channel] ?? '#999' },
            })),
            label: { formatter: '{b}\n{d}%', fontSize: fs },
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
          }],
        }
      },

      topProductsOption() {
        const products = aggregateTopProducts(this.currentRows, this.topN)
        if (!products.length) return null

        const fs = this.chartFontSize
        const periodLabel = this.period?.label ?? ''
        const chartTitle = `Top ${this.topN} sản phẩm`
        const names = products.map((p) =>
          this.showFullNames || p.product_name.length <= 30
            ? p.product_name
            : p.product_name.slice(0, 30) + '…'
        ).reverse()
        const values = products.map((p) => p.revenue).reverse()

        return {
          title: { text: periodLabel, left: 'center', textStyle: { fontSize: fs, fontWeight: 'normal' } },
          tooltip: {
            trigger: 'axis',
            formatter: (params: { name: string; value: number }[]) =>
              `${params[0].name}<br/>${formatVND(params[0].value)} VND`,
          },
          toolbox: {
            right: 10,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `${chartTitle} - ${periodLabel}` } },
          },
          grid: { left: '2%', right: '12%', top: 36, containLabel: true },
          xAxis: { type: 'value', axisLabel: { fontSize: fs, formatter: (v: number) => formatVND(v) } },
          yAxis: { type: 'category', data: names, axisLabel: { fontSize: fs } },
          series: [{
            type: 'bar',
            data: values,
            itemStyle: { color: '#2080f0' },
            label: {
              show: true,
              position: 'right',
              fontSize: fs,
              formatter: (p: { value: number }) => formatVND(p.value),
            },
          }],
        }
      },

      topProductsHeight(): string {
        const products = aggregateTopProducts(this.currentRows, this.topN)
        return `${Math.max(300, products.length * 32 + 100)}px`
      },

      heatmapOption() {
        const products = aggregateTopProducts(this.currentRows, this.topN)
        if (!products.length) return null

        const fs = this.chartFontSize
        const periodLabel = this.period?.label ?? ''

        // Build product × channel revenue map
        const pcMap: Record<string, Record<string, number>> = {}
        for (const row of this.currentRows) {
          if (!row.product_code) continue
          if (!HEATMAP_CHANNELS.includes(row.channel)) continue
          if (!pcMap[row.product_code]) pcMap[row.product_code] = {}
          pcMap[row.product_code][row.channel] =
            (pcMap[row.product_code][row.channel] ?? 0) + row.revenue
        }

        // Reverse so highest-revenue product is at top (ECharts Y axis renders bottom-to-top)
        const displayProducts = [...products].reverse()

        const productNames = displayProducts.map((p) =>
          this.showFullNames || p.product_name.length <= 20
            ? p.product_name
            : p.product_name.slice(0, 20) + '…'
        )
        const channelLabels = HEATMAP_CHANNELS.map((c) => CHANNEL_LABELS[c] ?? c)

        const data: [number, number, number][] = []
        displayProducts.forEach((product, yi) => {
          HEATMAP_CHANNELS.forEach((channel, xi) => {
            data.push([xi, yi, pcMap[product.product_code]?.[channel] ?? 0])
          })
        })

        const maxVal = Math.max(...data.map((d) => d[2]), 1)

        return {
          title: { text: periodLabel, left: 'center', textStyle: { fontSize: fs, fontWeight: 'normal' } },
          tooltip: {
            position: 'top',
            formatter: (p: { data: [number, number, number] }) =>
              `${productNames[p.data[1]]}<br/>${channelLabels[p.data[0]]}: ${formatVND(p.data[2])} VND`,
          },
          toolbox: {
            right: 0,
            top: 0,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `Heatmap - ${periodLabel}` } },
          },
          grid: { left: '2%', right: 90, top: 36, bottom: 16, containLabel: true },
          xAxis: {
            type: 'category',
            data: channelLabels,
            splitArea: { show: true },
            axisLabel: { fontSize: fs },
          },
          yAxis: {
            type: 'category',
            data: productNames,
            splitArea: { show: true },
            axisLabel: this.showFullNames
              ? { fontSize: fs, overflow: 'break', width: 180 }
              : { fontSize: fs },
          },
          visualMap: {
            min: 0,
            max: maxVal,
            calculable: true,
            orient: 'vertical',
            right: 10,
            top: 36,
            bottom: 16,
            inRange: { color: ['#e8f4fd', '#2080f0'] },
            formatter: (v: number) => formatVND(v),
            textStyle: { fontSize: Math.max(10, fs - 2) },
          },
          series: [{
            type: 'heatmap',
            data,
            label: {
              show: true,
              formatter: (p: { data: [number, number, number] }) =>
                p.data[2] > 0 ? formatVND(p.data[2]) : '',
              fontSize: Math.max(10, fs - 1),
            },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
          }],
        }
      },

      heatmapHeight(): string {
        const products = aggregateTopProducts(this.currentRows, this.topN)
        return `${Math.max(300, products.length * 44 + 100)}px`
      },

      comparisonOption() {
        const current = aggregateByChannel(this.currentRows)
        let compareRows: StatRow[]
        let prevLabel: string
        if (this.comparisonMode === 'auto') {
          compareRows = this.previousRows
          prevLabel = getPeriodRange(this.periodType, -1).label
        } else if (this.comparisonMode === 'month_ago') {
          compareRows = this.monthAgoRows
          prevLabel = this.period ? shiftPeriodLabel(this.period, -1, 0) : ''
        } else if (this.comparisonMode === 'year_ago') {
          compareRows = this.yearAgoRows
          prevLabel = this.period ? shiftPeriodLabel(this.period, 0, -1) : ''
        } else {
          compareRows = this.customCompareRows
          prevLabel = this.customCompareLabel
        }
        const previous = aggregateByChannel(compareRows)
        if (!current.length && !previous.length) return null

        const fs = this.chartFontSize
        const periodLabel = this.period?.label ?? ''

        const channels = [...new Set([
          ...current.map((c) => c.channel),
          ...previous.map((c) => c.channel),
        ])].filter((c) => c !== 'shopee_ads')

        const currentMap = Object.fromEntries(current.map((c) => [c.channel, c.revenue]))
        const previousMap = Object.fromEntries(previous.map((c) => [c.channel, c.revenue]))

        const chartTitle = 'So sánh doanh thu theo kênh'

        return {
          title: {
            text: prevLabel ? `${periodLabel}  vs  ${prevLabel}` : periodLabel,
            left: 'center',
            textStyle: { fontSize: fs, fontWeight: 'normal' },
          },
          tooltip: {
            trigger: 'axis',
            formatter: (params: { seriesName: string; value: number }[]) =>
              params.map((p) => `${p.seriesName}: ${formatVND(p.value)} VND`).join('<br/>'),
          },
          toolbox: {
            right: 10,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `${chartTitle} - ${periodLabel}` } },
          },
          legend: { bottom: 0, textStyle: { fontSize: fs } },
          grid: { left: '2%', right: '5%', top: 40, bottom: 50, containLabel: true },
          xAxis: {
            type: 'category',
            data: channels.map((c) => CHANNEL_LABELS[c] ?? c),
            axisLabel: { fontSize: fs },
          },
          yAxis: {
            type: 'value',
            axisLabel: { fontSize: fs, formatter: (v: number) => formatVND(v) },
          },
          series: [
            {
              name: periodLabel || 'Kỳ hiện tại',
              type: 'bar',
              data: channels.map((c) => currentMap[c] ?? 0),
              itemStyle: { color: '#2080f0' },
              label: {
                show: true,
                position: 'top',
                fontSize: fs,
                formatter: (p: { value: number }) => formatVND(p.value),
              },
            },
            {
              name: prevLabel || 'Kỳ so sánh',
              type: 'bar',
              data: channels.map((c) => previousMap[c] ?? 0),
              itemStyle: { color: '#aaaaaa' },
              label: {
                show: true,
                position: 'top',
                fontSize: fs,
                formatter: (p: { value: number }) => formatVND(p.value),
              },
            },
          ],
        }
      },
    },

    watch: {
      period(val: PeriodRange | null) {
        if (val) this.loadData(val)
      },
      customCompareRange(val: [number, number] | null) {
        if (val) {
          this.loadCustomCompare(val)
        } else {
          this.customCompareRows = []
          this.customCompareLabel = ''
        }
      },
    },

    methods: {
      async loadData(period: PeriodRange) {
        this.loading = true
        try {
          const prevPeriod = getPeriodRange(this.periodType, -1)
          const monthAgoStart = shiftDateStr(period.start, -1, 0)
          const monthAgoEnd = shiftDateStr(period.end, -1, 0)
          const yearAgoStart = shiftDateStr(period.start, 0, -1)
          const yearAgoEnd = shiftDateStr(period.end, 0, -1)

          const [current, previous, monthAgo, yearAgo] = await Promise.all([
            fetchStats(period.start, period.end),
            fetchStats(prevPeriod.start, prevPeriod.end),
            fetchStats(monthAgoStart, monthAgoEnd),
            fetchStats(yearAgoStart, yearAgoEnd),
          ])
          this.currentRows = current
          this.previousRows = previous
          this.monthAgoRows = monthAgo
          this.yearAgoRows = yearAgo
        } catch (_e) {
          // silently fail — empty state shown
        } finally {
          this.loading = false
        }
      },

      async loadCustomCompare(range: [number, number]) {
        const start = tsToISO(range[0])
        const end = tsToISO(range[1])
        this.customCompareLabel = `${tsToLabel(range[0])} – ${tsToLabel(range[1])}`
        try {
          this.customCompareRows = await fetchStats(start, end)
        } catch (_e) {
          this.customCompareRows = []
        }
      },
    },
  })
</script>

<style lang="less" scoped>
  .reports {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .reports-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;

    h2 {
      margin: 0;
    }
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .label-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .reports-body {
    display: flex;
    flex-direction: column;
  }

  .card-header-with-control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .comparison-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
</style>
