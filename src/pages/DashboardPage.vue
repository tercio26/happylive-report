<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <n-h2>Dashboard</n-h2>
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
      <!-- KPI Cards -->
      <n-grid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" :collapsed-cols="2">
        <n-gi>
          <KpiCard
            label="Tổng doanh thu"
            :value="formatVND(kpi.revenue)"
            :delta="kpi.revenueDelta"
            color="#18a058"
          />
        </n-gi>
        <n-gi>
          <KpiCard
            label="Tổng đơn hàng"
            :value="kpi.orders.toLocaleString('vi-VN')"
            :delta="kpi.ordersDelta"
            color="#2080f0"
          />
        </n-gi>
        <n-gi>
          <KpiCard
            label="Sản phẩm có đơn"
            :value="kpi.products.toLocaleString('vi-VN')"
            :delta="kpi.productsDelta"
            color="#f0a020"
          />
        </n-gi>
        <n-gi>
          <KpiCard
            label="Kênh dẫn đầu"
            :value="kpi.topChannel"
            :sub="kpi.topChannelRevenue"
            color="#8b5cf6"
          />
        </n-gi>
      </n-grid>

      <!-- Charts -->
      <n-grid :cols="2" :x-gap="16" :y-gap="16" responsive="screen" :collapsed-cols="1" style="margin-top: 1rem">
        <n-gi>
          <n-card title="Doanh số theo kênh">
            <v-chart
              v-if="channelChartOption"
              :option="channelChartOption"
              :style="{ height: '400px' }"
              autoresize
            />
            <n-empty v-else description="Không có dữ liệu" style="height: 400px; display: flex; align-items: center; justify-content: center" />
          </n-card>
        </n-gi>
        <n-gi>
          <n-card title="Top 10 sản phẩm">
            <v-chart
              v-if="topProductsChartOption"
              :option="topProductsChartOption"
              :style="{ height: '400px' }"
              autoresize
            />
            <n-empty v-else description="Không có dữ liệu" style="height: 400px; display: flex; align-items: center; justify-content: center" />
          </n-card>
        </n-gi>
      </n-grid>
    </n-spin>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { NH2, NGrid, NGi, NCard, NSpin, NEmpty, NSwitch, NText, NSelect } from 'naive-ui'
  import VChart from 'vue-echarts'
  import PeriodSelector from '@/components/common/PeriodSelector.vue'
  import KpiCard from '@/components/common/KpiCard.vue'
  import {
    fetchStats, aggregateByChannel, aggregateTopProducts,
    totalRevenue, totalOrders, totalProducts, deltaPercent,
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

  export default defineComponent({
    name: 'DashboardPage',
    components: { NH2, NGrid, NGi, NCard, NSpin, NEmpty, NSwitch, NText, NSelect, VChart, PeriodSelector, KpiCard },

    setup() {
      return { formatVND }
    },

    data() {
      return {
        periodType: 'week' as PeriodType,
        period: null as PeriodRange | null,
        loading: false,
        showFullNames: false,
        chartFontSize: 13,
        fontSizeOptions: [
          { label: 'Chữ nhỏ', value: 11 },
          { label: 'Chữ vừa', value: 13 },
          { label: 'Chữ lớn', value: 15 },
        ],
        currentRows: [] as StatRow[],
        previousRows: [] as StatRow[],
      }
    },

    computed: {
      kpi() {
        const rev = totalRevenue(this.currentRows)
        const prevRev = totalRevenue(this.previousRows)
        const ord = totalOrders(this.currentRows)
        const prevOrd = totalOrders(this.previousRows)
        const prod = totalProducts(this.currentRows)
        const prevProd = totalProducts(this.previousRows)

        const channels = aggregateByChannel(this.currentRows)
        const top = channels.filter((c) => c.channel !== 'shopee_ads')[0]

        return {
          revenue: rev,
          revenueDelta: deltaPercent(rev, prevRev) ?? undefined,
          orders: ord,
          ordersDelta: deltaPercent(ord, prevOrd) ?? undefined,
          products: prod,
          productsDelta: deltaPercent(prod, prevProd) ?? undefined,
          topChannel: top ? (CHANNEL_LABELS[top.channel] ?? top.channel) : '—',
          topChannelRevenue: top ? formatVND(top.revenue) : '',
        }
      },

      channelChartOption() {
        const channels = aggregateByChannel(this.currentRows)
        if (!channels.length) return null

        const data = channels.map((c) => ({
          name: CHANNEL_LABELS[c.channel] ?? c.channel,
          value: c.revenue,
          itemStyle: { color: CHANNEL_COLORS[c.channel] ?? '#999' },
        }))

        const periodLabel = this.period?.label ?? ''
        const chartTitle = 'Doanh số theo kênh'

        const fs = this.chartFontSize
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
            data,
            label: { formatter: '{b}\n{d}%', fontSize: fs },
            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } },
          }],
        }
      },

      topProductsChartOption() {
        const products = aggregateTopProducts(this.currentRows, 10)
        if (!products.length) return null

        const names = products.map((p) =>
          this.showFullNames || p.product_name.length <= 30
            ? p.product_name
            : p.product_name.slice(0, 30) + '…'
        ).reverse()
        const values = products.map((p) => p.revenue).reverse()

        const periodLabel = this.period?.label ?? ''
        const chartTitle = 'Top 10 sản phẩm'

        const fs = this.chartFontSize
        return {
          title: { text: periodLabel, left: 'center', textStyle: { fontSize: fs, fontWeight: 'normal' } },
          tooltip: {
            trigger: 'axis',
            formatter: (params: { name: string; value: number }[]) => {
              const p = params[0]
              return `${p.name}<br/>${formatVND(p.value)} VND`
            },
          },
          toolbox: {
            right: 10,
            feature: { saveAsImage: { title: 'Lưu ảnh', name: `${chartTitle} - ${periodLabel}` } },
          },
          grid: { left: '2%', right: '8%', top: 36, containLabel: true },
          xAxis: { type: 'value', axisLabel: { fontSize: fs, formatter: (v: number) => formatVND(v) } },
          yAxis: { type: 'category', data: names, axisLabel: { fontSize: fs } },
          series: [{
            type: 'bar',
            data: values,
            itemStyle: { color: '#2080f0' },
            label: { show: true, position: 'right', fontSize: fs, formatter: (p: { value: number }) => formatVND(p.value) },
          }],
        }
      },
    },

    watch: {
      period(val: PeriodRange | null) {
        if (val) this.loadData(val)
      },
    },

    methods: {
      async loadData(period: PeriodRange) {
        this.loading = true
        try {
          const prevPeriod = getPeriodRange(this.periodType, -1)
          const [current, previous] = await Promise.all([
            fetchStats(period.start, period.end),
            fetchStats(prevPeriod.start, prevPeriod.end),
          ])
          this.currentRows = current
          this.previousRows = previous
        } catch (_e) {
          // silently fail — empty state shown
        } finally {
          this.loading = false
        }
      },
    },
  })
</script>

<style lang="less" scoped>
  .dashboard {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;

    h2 {
      margin: 0;
    }

    @media (max-width: 640px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;

    @media (max-width: 640px) {
      width: 100%;

      :deep(.n-select) {
        flex: 1;
        min-width: 0;
      }
    }
  }

  .label-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
</style>
