<template>
  <div class="import-page">
    <div class="page-header">
      <n-h2>Import dữ liệu</n-h2>
      <n-text depth="3">Import dữ liệu từ file báo cáo Shopee (.xlsx)</n-text>
    </div>

    <n-steps :current="currentStep" class="steps">
      <n-step title="Chọn file" />
      <n-step title="Kiểm tra dữ liệu" />
      <n-step title="Xác nhận" />
    </n-steps>

    <!-- Step 1: Upload -->
    <div v-if="currentStep === 1" class="step-content">
      <n-upload
        multiple
        accept=".xlsx"
        :show-file-list="false"
        :custom-request="handleFileSelect"
      >
        <n-upload-dragger>
          <div class="upload-dragger-content">
            <n-icon size="48" depth="3"><UploadIcon /></n-icon>
            <n-text style="font-size: 16px">Kéo thả file vào đây hoặc nhấn để chọn</n-text>
            <n-text depth="3">Hỗ trợ nhiều file .xlsx cùng lúc</n-text>
          </div>
        </n-upload-dragger>
      </n-upload>

      <div v-if="fileItems.length > 0" class="file-list">
        <div
          v-for="item in fileItems"
          :key="item.name"
          class="file-item"
          :class="{ 'file-item--invalid': item.error, 'file-item--warn': item.dateExists }"
        >
          <div class="file-item__icon">
            <n-icon size="20" :color="item.error ? '#d03050' : '#18a058'">
              <ErrorIcon v-if="item.error" />
              <CheckmarkIcon v-else />
            </n-icon>
          </div>
          <div class="file-item__info">
            <n-text strong>{{ item.name }}</n-text>
            <n-text v-if="item.error" depth="3" style="color: #d03050">{{ item.error }}</n-text>
            <n-text v-else depth="3">
              Ngày: {{ item.reportDate }} · {{ item.rowCount }} sản phẩm
              <n-tag v-if="item.dateExists" type="warning" size="small" style="margin-left: 8px">
                Đã có dữ liệu — sẽ ghi đè
              </n-tag>
            </n-text>
          </div>
          <n-button text @click="removeFile(item.name)">
            <n-icon><CloseIcon /></n-icon>
          </n-button>
        </div>
      </div>

      <div class="step-actions">
        <n-button
          type="primary"
          :disabled="fileItems.length === 0"
          @click="goToReview"
        >
          Tiếp tục
        </n-button>
      </div>
    </div>

    <!-- Step 2: Review & Edit -->
    <div v-if="currentStep === 2" class="step-content">
      <n-alert v-if="invalidCount > 0" type="error" style="margin-bottom: 16px">
        Có {{ invalidCount }} file lỗi. Vui lòng quay lại và xóa các file lỗi trước khi xác nhận.
      </n-alert>

      <div class="review-summary">
        <n-statistic label="Files hợp lệ" :value="validCount" />
        <n-statistic label="Tổng dòng dữ liệu" :value="editableRows.length" />
        <n-statistic label="Khoảng thời gian" :value="dateRange" />
      </div>

      <n-data-table
        :columns="reviewColumns"
        :data="editableRows"
        :pagination="{ pageSize: 50 }"
        size="small"
        :scroll-x="1100"
        style="margin-top: 16px"
      />

      <div class="step-actions">
        <n-button @click="currentStep = 1">Quay lại</n-button>
        <n-button
          type="primary"
          :disabled="invalidCount > 0 || editableRows.length === 0"
          @click="currentStep = 3"
        >
          Xác nhận nhập dữ liệu
        </n-button>
      </div>
    </div>

    <!-- Step 3: Confirm & Save -->
    <div v-if="currentStep === 3" class="step-content">
      <div v-if="!importing && !importDone">
        <n-alert type="info" style="margin-bottom: 16px">
          Sẽ nhập <strong>{{ editableRows.length }} dòng</strong> dữ liệu vào hệ thống.
          <span v-if="warnCount > 0">
            Sẽ ghi đè dữ liệu của <strong>{{ warnCount }}</strong> ngày đã tồn tại.
          </span>
        </n-alert>
        <div class="step-actions">
          <n-button @click="currentStep = 2">Quay lại</n-button>
          <n-button type="primary" @click="startImport">Xác nhận nhập dữ liệu</n-button>
        </div>
      </div>

      <div v-if="importing" class="import-progress">
        <n-text>Đang lưu dữ liệu...</n-text>
        <n-progress
          type="line"
          :percentage="importProgress"
          indicator-placement="inside"
          style="margin-top: 12px"
        />
        <n-text depth="3">{{ importedChunks }}/{{ totalChunks }} batch</n-text>
      </div>

      <div v-if="importDone" class="import-result">
        <n-result
          :status="importError ? 'error' : 'success'"
          :title="importError ? 'Nhập dữ liệu thất bại' : 'Nhập dữ liệu thành công'"
          :description="importError || `Đã lưu ${editableRows.length} dòng dữ liệu`"
        >
          <template #footer>
            <n-button @click="resetImport">Nhập file mới</n-button>
          </template>
        </n-result>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, h } from 'vue'
  import {
    NH2, NText, NSteps, NStep, NUpload, NUploadDragger,
    NIcon, NButton, NDataTable, NAlert, NStatistic,
    NProgress, NResult, NTag, NInput, NInputNumber, NSelect,
    type DataTableColumns, type UploadCustomRequestOptions, type SelectOption,
  } from 'naive-ui'
  import {
    Upload as UploadIcon, CheckmarkFilled as CheckmarkIcon,
    ErrorFilled as ErrorIcon, Close as CloseIcon,
  } from '@vicons/carbon'
  import { parseShopeeFile, type ShopeeProductRow, type ShopeeChannel } from '@/services/shopee-parser'
  import { supabase } from '@/services/supabase'
  import { useAuthStore } from '@/stores/auth'

  const CHANNEL_LABELS: Record<string, string> = {
    the_sp: 'Thẻ SP',
    livestream: 'Livestream',
    video: 'Video',
    affiliate: 'Affiliate',
    shopee_ads: 'Quảng cáo',
  }

  const CHANNEL_OPTIONS: SelectOption[] = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const CHUNK_SIZE = 100

  interface FileItem {
    name: string
    file: File
    reportDate: string
    rowCount: number
    error?: string
    dateExists?: boolean
    rows: ShopeeProductRow[]
  }

  export default defineComponent({
    name: 'ImportPage',
    components: {
      NH2, NText, NSteps, NStep, NUpload, NUploadDragger,
      NIcon, NButton, NDataTable, NAlert, NStatistic,
      NProgress, NResult, NTag,
      UploadIcon, CheckmarkIcon, ErrorIcon, CloseIcon,
    },

    setup() {
      return { auth: useAuthStore() }
    },

    data() {
      return {
        currentStep: 1,
        fileItems: [] as FileItem[],
        editableRows: [] as ShopeeProductRow[],
        importing: false,
        importDone: false,
        importError: '',
        importedChunks: 0,
        totalChunks: 0,
      }
    },

    computed: {
      validCount(): number {
        return this.fileItems.filter((f) => !f.error).length
      },
      invalidCount(): number {
        return this.fileItems.filter((f) => !!f.error).length
      },
      warnCount(): number {
        return this.fileItems.filter((f) => !f.error && f.dateExists).length
      },
      allRows(): ShopeeProductRow[] {
        return this.fileItems.filter((f) => !f.error).flatMap((f) => f.rows)
      },
      dateRange(): string {
        const dates = this.fileItems
          .filter((f) => !f.error && f.reportDate)
          .map((f) => f.reportDate)
          .sort()
        if (dates.length === 0) return '—'
        if (dates.length === 1) return dates[0]
        return `${dates[0]} → ${dates[dates.length - 1]}`
      },
      importProgress(): number {
        if (this.totalChunks === 0) return 0
        return Math.round((this.importedChunks / this.totalChunks) * 100)
      },
      reviewColumns(): DataTableColumns<ShopeeProductRow> {
        return [
          {
            title: 'Ngày',
            key: 'report_date',
            width: 130,
            fixed: 'left',
            render: (row, index) =>
              h(NInput, {
                value: row.report_date,
                size: 'small',
                onUpdateValue: (v: string) => {
                  this.editableRows[index].report_date = v
                },
              }),
          },
          {
            title: 'Kênh',
            key: 'channel',
            width: 130,
            render: (row, index) =>
              h(NSelect, {
                value: row.channel,
                options: CHANNEL_OPTIONS,
                size: 'small',
                onUpdateValue: (v: ShopeeChannel) => {
                  this.editableRows[index].channel = v
                },
              }),
          },
          {
            title: 'Mã SP',
            key: 'product_code',
            width: 140,
            render: (row, index) =>
              h(NInput, {
                value: row.product_code,
                size: 'small',
                onUpdateValue: (v: string) => {
                  this.editableRows[index].product_code = v
                },
              }),
          },
          {
            title: 'Tên sản phẩm',
            key: 'product_name',
            minWidth: 220,
            render: (row, index) =>
              h(NInput, {
                value: row.product_name,
                size: 'small',
                onUpdateValue: (v: string) => {
                  this.editableRows[index].product_name = v
                },
              }),
          },
          {
            title: 'Doanh số (VND)',
            key: 'revenue',
            width: 150,
            render: (row, index) =>
              h(NInputNumber, {
                value: row.revenue,
                size: 'small',
                min: 0,
                showButton: false,
                onUpdateValue: (v: number | null) => {
                  this.editableRows[index].revenue = v ?? 0
                },
              }),
          },
          {
            title: 'Lượt hiển thị',
            key: 'impressions',
            width: 100,
            render: (row, index) =>
              h(NInputNumber, {
                value: row.impressions,
                size: 'small',
                min: 0,
                showButton: false,
                onUpdateValue: (v: number | null) => {
                  this.editableRows[index].impressions = v ?? 0
                },
              }),
          },
          {
            title: 'Lượt nhấp',
            key: 'clicks',
            width: 90,
            render: (row, index) =>
              h(NInputNumber, {
                value: row.clicks,
                size: 'small',
                min: 0,
                showButton: false,
                onUpdateValue: (v: number | null) => {
                  this.editableRows[index].clicks = v ?? 0
                },
              }),
          },
          {
            title: 'Đơn hàng',
            key: 'orders',
            width: 100,
            render: (row, index) =>
              h(NInputNumber, {
                value: row.orders,
                size: 'small',
                min: 0,
                showButton: false,
                onUpdateValue: (v: number | null) => {
                  this.editableRows[index].orders = v ?? 0
                },
              }),
          },
          {
            title: 'Số người mua',
            key: 'buyers',
            width: 110,
            render: (row, index) =>
              h(NInputNumber, {
                value: row.buyers,
                size: 'small',
                min: 0,
                showButton: false,
                onUpdateValue: (v: number | null) => {
                  this.editableRows[index].buyers = v ?? 0
                },
              }),
          },
        ]
      },
    },

    methods: {
      goToReview() {
        // Deep copy allRows into editableRows so edits don't affect fileItems
        this.editableRows = this.allRows.map((row) => ({ ...row }))
        this.currentStep = 2
      },

      async handleFileSelect(options: UploadCustomRequestOptions) {
        const file = options.file.file as File
        if (!file) return

        // Prevent duplicate
        if (this.fileItems.find((f) => f.name === file.name)) return

        const result = await parseShopeeFile(file)

        const item: FileItem = {
          name: file.name,
          file,
          reportDate: result.report_date,
          rowCount: result.rows.length,
          error: result.error,
          rows: result.rows,
        }

        if (!result.error && result.report_date) {
          item.dateExists = await this.checkDateExists(result.report_date)
        }

        this.fileItems.push(item)
      },

      async checkDateExists(date: string): Promise<boolean> {
        const { count } = await supabase
          .from('shopee_stats')
          .select('id', { count: 'exact', head: true })
          .eq('report_date', date)
        return (count ?? 0) > 0
      },

      removeFile(name: string) {
        this.fileItems = this.fileItems.filter((f) => f.name !== name)
      },

      async startImport() {
        this.importing = true
        this.importError = ''

        const chunks: ShopeeProductRow[][] = []
        for (let i = 0; i < this.editableRows.length; i += CHUNK_SIZE) {
          chunks.push(this.editableRows.slice(i, i + CHUNK_SIZE))
        }

        this.totalChunks = chunks.length
        this.importedChunks = 0

        try {
          for (const chunk of chunks) {
            const payload = chunk.map((row) => ({
              ...row,
              imported_by: this.auth.user?.id,
            }))

            const { error } = await supabase
              .from('shopee_stats')
              .upsert(payload, {
                onConflict: 'report_date,channel,product_code',
                ignoreDuplicates: false,
              })

            if (error) throw new Error(error.message)
            this.importedChunks++
          }
        } catch (err) {
          this.importError = (err as Error).message
        } finally {
          this.importing = false
          this.importDone = true
        }
      },

      resetImport() {
        this.currentStep = 1
        this.fileItems = []
        this.editableRows = []
        this.importing = false
        this.importDone = false
        this.importError = ''
        this.importedChunks = 0
        this.totalChunks = 0
      },
    },
  })
</script>

<style lang="less" scoped>
  .import-page {
    width: 100%;
  }

  .page-header {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .steps {
    margin-bottom: 2rem;
  }

  .step-content {
    margin-top: 0.5rem;
  }

  .upload-dragger-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .file-list {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid #efeff5;
    border-radius: 0.5rem;
    background: #fff;

    &--invalid {
      border-color: #d03050;
      background: #fff0f1;
    }

    &--warn {
      border-color: #f0a020;
      background: #fffbe6;
    }

    &__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
  }

  .review-summary {
    display: flex;
    gap: 2.5rem;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .step-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .import-progress {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.5rem;
    background: #f9f9f9;
    border-radius: 0.5rem;
  }

  .import-result {
    padding: 1rem 0;
  }
</style>
