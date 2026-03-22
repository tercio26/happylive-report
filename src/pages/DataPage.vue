<template>
  <div class="data-page">
    <div class="page-header">
      <n-h2>Dữ liệu Shopee</n-h2>
      <div class="page-header__actions">
        <n-button
          v-if="authStore.hasPermission('manage_data')"
          type="primary"
          @click="openDrawer(null)"
        >
          <template #icon><n-icon><AddIcon /></n-icon></template>
          Thêm dữ liệu
        </n-button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <n-date-picker
        v-model:value="filterDateRange"
        type="daterange"
        clearable
        placeholder="Chọn khoảng thời gian"
        style="width: 16rem"
        @update:value="loadData"
      />
      <n-select
        v-model:value="filterChannel"
        :options="channelOptions"
        clearable
        placeholder="Kênh"
        style="width: 10rem"
        @update:value="loadData"
      />
      <n-input
        v-model:value="filterKeyword"
        clearable
        placeholder="Tìm mã SP hoặc tên sản phẩm..."
        style="width: 18rem"
        @update:value="handleKeywordChange"
      >
        <template #prefix><n-icon><SearchIcon /></n-icon></template>
      </n-input>
      <n-button @click="resetFilters">Làm mới bộ lọc</n-button>
    </div>

    <!-- Table -->
    <n-data-table
      :columns="columns"
      :data="rows"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row) => row.id"
      remote
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
      @update:sorter="handleSorterChange"
    />

    <!-- Drawer: Add / Edit -->
    <n-drawer v-model:show="drawerVisible" :width="drawerWidth" placement="right">
      <n-drawer-content :title="editingRow ? 'Chỉnh sửa dữ liệu' : 'Thêm dữ liệu'" closable>
        <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
          <n-form-item label="Ngày báo cáo" path="report_date">
            <n-date-picker
              v-model:value="formDateTs"
              type="date"
              style="width: 100%"
              @update:value="onFormDateChange"
            />
          </n-form-item>
          <n-form-item label="Kênh" path="channel">
            <n-select v-model:value="form.channel" :options="channelOptions" />
          </n-form-item>
          <n-form-item label="Mã sản phẩm" path="product_code">
            <n-input v-model:value="form.product_code" placeholder="VD: 2345536398" />
          </n-form-item>
          <n-form-item label="Tên sản phẩm" path="product_name">
            <n-input v-model:value="form.product_name" placeholder="Nhập tên sản phẩm" />
          </n-form-item>
          <n-form-item label="Doanh số (VND)" path="revenue">
            <n-input-number v-model:value="form.revenue" :min="0" :show-button="false" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Lượt hiển thị" path="impressions">
            <n-input-number v-model:value="form.impressions" :min="0" :show-button="false" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Lượt nhấp" path="clicks">
            <n-input-number v-model:value="form.clicks" :min="0" :show-button="false" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Đơn hàng" path="orders">
            <n-input-number v-model:value="form.orders" :min="0" :show-button="false" style="width: 100%" />
          </n-form-item>
          <n-form-item label="Số người mua" path="buyers">
            <n-input-number v-model:value="form.buyers" :min="0" :show-button="false" style="width: 100%" />
          </n-form-item>
        </n-form>

        <template #footer>
          <div class="drawer-footer">
            <n-button @click="drawerVisible = false">Hủy</n-button>
            <n-button type="primary" :loading="saving" @click="saveRow">Lưu</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <!-- Delete confirm -->
    <n-modal
      v-model:show="deleteModalVisible"
      preset="dialog"
      type="error"
      title="Xác nhận xóa"
      content="Bạn có chắc muốn xóa dòng dữ liệu này không?"
      positive-text="Xóa"
      negative-text="Hủy"
      @positive-click="confirmDelete"
    />
  </div>
</template>

<script lang="ts">
  import { defineComponent, h } from 'vue'
  import {
    NH2, NButton, NIcon, NDataTable, NInput, NInputNumber,
    NSelect, NDatePicker, NDrawer, NDrawerContent, NForm,
    NFormItem, NModal, useMessage,
    type DataTableColumns, type FormRules, type FormInst, type SelectOption,
  } from 'naive-ui'
  import {
    Add as AddIcon, Search as SearchIcon,
    Edit as EditIcon, TrashCan as TrashIcon,
  } from '@vicons/carbon'
  import { supabase } from '@/services/supabase'
  import { useAuthStore } from '@/stores/auth'

  const CHANNEL_LABELS: Record<string, string> = {
    the_sp: 'Thẻ SP',
    livestream: 'Livestream',
    video: 'Video',
    affiliate: 'Affiliate',
    shopee_ads: 'Quảng cáo',
  }

  const channelOptions: SelectOption[] = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  interface ShopeeRow {
    id: string
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

  type FormModel = Omit<ShopeeRow, 'id'>

  const DEFAULT_FORM = (): FormModel => ({
    report_date: '',
    channel: 'the_sp',
    product_code: '',
    product_name: '',
    revenue: 0,
    impressions: 0,
    clicks: 0,
    orders: 0,
    buyers: 0,
  })

  const PAGE_SIZE_OPTIONS = [20, 30, 50]

  export default defineComponent({
    name: 'DataPage',
    components: {
      NH2, NButton, NIcon, NDataTable, NInput, NInputNumber,
      NSelect, NDatePicker, NDrawer, NDrawerContent, NForm,
      NFormItem, NModal,
      AddIcon, SearchIcon,
    },

    setup() {
      return {
        authStore: useAuthStore(),
        message: useMessage(),
        channelOptions,
      }
    },

    data() {
      return {
        rows: [] as ShopeeRow[],
        loading: false,
        totalCount: 0,
        currentPage: 1,
        pageSize: PAGE_SIZE_OPTIONS[0],

        // Filters
        filterDateRange: null as [number, number] | null,
        filterChannel: null as string | null,
        filterKeyword: '',
        keywordTimer: null as ReturnType<typeof setTimeout> | null,

        // Drawer
        drawerVisible: false,
        editingRow: null as ShopeeRow | null,
        form: DEFAULT_FORM(),
        formDateTs: null as number | null,
        saving: false,

        // Sort
        sortKey: 'report_date' as string,
        sortOrder: 'descend' as 'ascend' | 'descend',

        // Delete
        deleteModalVisible: false,
        deletingId: null as string | null,

        formRules: {
          report_date: [{ required: true, message: 'Vui lòng chọn ngày', trigger: 'blur' }],
          channel: [{ required: true, message: 'Vui lòng chọn kênh', trigger: 'change' }],
        } as FormRules,
      }
    },

    computed: {
      pagination() {
        return {
          page: this.currentPage,
          pageSize: this.pageSize,
          pageSizes: PAGE_SIZE_OPTIONS,
          itemCount: this.totalCount,
          showSizePicker: true,
          showQuickJumper: true,
        }
      },
      drawerWidth(): number {
        return Math.min(480, window.innerWidth)
      },

      canManage(): boolean {
        return this.authStore.hasPermission('manage_data')
      },
      columns(): DataTableColumns<ShopeeRow> {
        const cols: DataTableColumns<ShopeeRow> = [
          {
            title: 'Ngày', key: 'report_date', width: 110, sorter: true,
            sortOrder: this.sortKey === 'report_date' ? this.sortOrder : false,
          },
          {
            title: 'Kênh', key: 'channel', width: 110,
            render: (row) => CHANNEL_LABELS[row.channel] ?? row.channel,
          },
          { title: 'Mã SP', key: 'product_code', width: 130, ellipsis: { tooltip: true } },
          { title: 'Tên sản phẩm', key: 'product_name', minWidth: 200, ellipsis: { tooltip: true } },
          {
            title: 'Doanh số (VND)', key: 'revenue', width: 150,
            render: (row) => row.revenue.toLocaleString('vi-VN'),
            sorter: true,
            sortOrder: this.sortKey === 'revenue' ? this.sortOrder : false,
          },
          { title: 'Lượt hiển thị', key: 'impressions', width: 90 },
          { title: 'Lượt nhấp', key: 'clicks', width: 80 },
          { title: 'Đơn hàng', key: 'orders', width: 90 },
          { title: 'Số người mua', key: 'buyers', width: 90 },
        ]

        if (this.canManage) {
          cols.push({
            title: '',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (row) =>
              h('div', { style: 'display:flex;gap:0.5rem' }, [
                h(NButton, {
                  size: 'small', text: true,
                  onClick: () => this.openDrawer(row),
                }, { default: () => h(NIcon, null, { default: () => h(EditIcon) }) }),
                h(NButton, {
                  size: 'small', text: true, type: 'error',
                  onClick: () => this.openDelete(row.id),
                }, { default: () => h(NIcon, null, { default: () => h(TrashIcon) }) }),
              ]),
          })
        }

        return cols
      },
    },

    mounted() {
      this.loadData()
    },

    methods: {
      async loadData() {
        this.loading = true
        const from = (this.currentPage - 1) * this.pageSize
        const to = from + this.pageSize - 1

        let query = supabase
          .from('shopee_stats')
          .select('*', { count: 'exact' })
          .order(this.sortKey, { ascending: this.sortOrder === 'ascend' })
          .order('channel')
          .range(from, to)

        if (this.filterDateRange) {
          const [start, end] = this.filterDateRange
          query = query
            .gte('report_date', new Date(start).toISOString().slice(0, 10))
            .lte('report_date', new Date(end).toISOString().slice(0, 10))
        }
        if (this.filterChannel) {
          query = query.eq('channel', this.filterChannel)
        }
        if (this.filterKeyword.trim()) {
          const kw = this.filterKeyword.trim()
          query = query.or(`product_code.ilike.%${kw}%,product_name.ilike.%${kw}%`)
        }

        const { data, count, error } = await query
        if (!error) {
          this.rows = (data as ShopeeRow[]) ?? []
          this.totalCount = count ?? 0
        } else {
          this.message.error('Không thể tải dữ liệu')
        }
        this.loading = false
      },

      handlePageChange(page: number) {
        this.currentPage = page
        this.loadData()
      },

      handlePageSizeChange(size: number) {
        this.pageSize = size
        this.currentPage = 1
        this.loadData()
      },

      handleSorterChange(sorter: { columnKey: string; order: 'ascend' | 'descend' | false }) {
        if (sorter.order) {
          this.sortKey = sorter.columnKey
          this.sortOrder = sorter.order
        } else {
          this.sortKey = 'report_date'
          this.sortOrder = 'descend'
        }
        this.currentPage = 1
        this.loadData()
      },

      handleKeywordChange() {
        if (this.keywordTimer) clearTimeout(this.keywordTimer)
        this.keywordTimer = setTimeout(() => {
          this.currentPage = 1
          this.loadData()
        }, 400)
      },

      resetFilters() {
        this.filterDateRange = null
        this.filterChannel = null
        this.filterKeyword = ''
        this.currentPage = 1
        this.loadData()
      },

      openDrawer(row: ShopeeRow | null) {
        this.editingRow = row
        if (row) {
          this.form = { ...row }
          this.formDateTs = new Date(row.report_date).getTime()
        } else {
          this.form = DEFAULT_FORM()
          this.formDateTs = null
        }
        this.drawerVisible = true
      },

      onFormDateChange(ts: number | null) {
        this.formDateTs = ts
        if (ts) {
          this.form.report_date = new Date(ts).toISOString().slice(0, 10)
        }
      },

      async saveRow() {
        const formRef = this.$refs.formRef as FormInst
        try { await formRef.validate() } catch { return }

        this.saving = true
        const payload = { ...this.form, imported_by: this.authStore.user?.id }

        const { error } = this.editingRow
          ? await supabase.from('shopee_stats').update(payload).eq('id', this.editingRow.id)
          : await supabase.from('shopee_stats').insert(payload)

        if (error) {
          this.message.error('Lưu thất bại: ' + error.message)
        } else {
          this.message.success(this.editingRow ? 'Đã cập nhật' : 'Đã thêm dữ liệu')
          this.drawerVisible = false
          this.loadData()
        }
        this.saving = false
      },

      openDelete(id: string) {
        this.deletingId = id
        this.deleteModalVisible = true
      },

      async confirmDelete() {
        if (!this.deletingId) return
        const { error } = await supabase
          .from('shopee_stats')
          .delete()
          .eq('id', this.deletingId)
        if (error) {
          this.message.error('Xóa thất bại')
        } else {
          this.message.success('Đã xóa')
          this.loadData()
        }
        this.deletingId = null
      },
    },
  })
</script>

<style lang="less" scoped>
  .data-page {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    h2 {
      margin: 0;
    }
  }

  .filters {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;

    @media (max-width: 640px) {
      :deep(.n-date-picker),
      :deep(.n-select),
      :deep(.n-input) {
        width: 100% !important;
      }
    }
  }

  .drawer-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
</style>
