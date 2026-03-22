<template>
  <div class="users-page">
    <div class="page-header">
      <n-h2>Quản lý người dùng</n-h2>
      <n-button type="primary" @click="openAdd">
        <template #icon><n-icon><AddIcon /></n-icon></template>
        Thêm người dùng
      </n-button>
    </div>

    <n-data-table
      :columns="columns"
      :data="users"
      :loading="loading"
      :pagination="false"
      striped
    />

    <!-- Add / Edit Drawer -->
    <n-drawer v-model:show="drawerVisible" :width="420" placement="right">
      <n-drawer-content :title="isEditMode ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'" closable>
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <template v-if="!isEditMode">
            <n-form-item label="Email" path="email">
              <n-input v-model:value="form.email" placeholder="example@company.com" autocomplete="off" />
            </n-form-item>
            <n-form-item label="Mật khẩu" path="password">
              <n-input
                v-model:value="form.password"
                type="password"
                show-password-on="click"
                placeholder="Tối thiểu 6 ký tự"
                autocomplete="new-password"
              />
            </n-form-item>
          </template>
          <n-form-item label="Tên hiển thị" path="displayName">
            <n-input v-model:value="form.displayName" placeholder="Nguyễn Văn A" />
          </n-form-item>
          <n-form-item label="Quyền hạn">
            <n-checkbox-group v-model:value="form.permissions">
              <n-space vertical>
                <n-checkbox value="view_reports">Xem báo cáo</n-checkbox>
                <n-checkbox value="manage_data">Nhập / quản lý dữ liệu</n-checkbox>
                <n-checkbox value="manage_users">Quản lý người dùng</n-checkbox>
              </n-space>
            </n-checkbox-group>
          </n-form-item>
        </n-form>
        <template #footer>
          <n-space justify="end">
            <n-button @click="drawerVisible = false">Hủy</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">
              {{ isEditMode ? 'Lưu thay đổi' : 'Tạo người dùng' }}
            </n-button>
          </n-space>
        </template>
      </n-drawer-content>
    </n-drawer>

    <!-- Delete Confirm -->
    <n-modal
      v-model:show="deleteModalVisible"
      preset="dialog"
      type="error"
      title="Xóa người dùng"
      :content="`Xác nhận xóa tài khoản ${deleteTarget?.email}? Thao tác này không thể hoàn tác.`"
      positive-text="Xóa"
      negative-text="Hủy"
      :loading="deleting"
      @positive-click="handleDelete"
    />
  </div>
</template>

<script lang="ts">
  import { defineComponent, h, ref } from 'vue'
  import {
    NH2, NButton, NIcon, NDataTable, NDrawer, NDrawerContent,
    NForm, NFormItem, NInput, NCheckboxGroup, NCheckbox, NSpace,
    NModal, NTag, NText, useMessage,
    type FormInst, type DataTableColumns,
  } from 'naive-ui'
  import { Add as AddIcon, Edit as EditIcon, TrashCan as DeleteIcon } from '@vicons/carbon'
  import {
    listUsers, createUser, updateUser, deleteUser,
    type UserProfile,
  } from '@/services/users'
  import type { PermissionKey } from '@/types'

  const PERMISSION_LABELS: Record<string, string> = {
    view_reports: 'View Report',
    manage_data: 'Manage Data',
    manage_users: 'Manage User',
  }

  const PERMISSION_TYPES: Record<string, 'success' | 'warning' | 'error'> = {
    view_reports: 'success',
    manage_data: 'warning',
    manage_users: 'error',
  }

  const EMPTY_FORM = () => ({
    email: '',
    password: '',
    displayName: '',
    permissions: [] as PermissionKey[],
  })

  export default defineComponent({
    name: 'UsersPage',
    components: {
      NH2, NButton, NIcon, NDataTable, NDrawer, NDrawerContent,
      NForm, NFormItem, NInput, NCheckboxGroup, NCheckbox, NSpace,
      NModal, AddIcon,
    },

    setup() {
      const formRef = ref<FormInst | null>(null)
      const message = useMessage()
      return { formRef, message }
    },

    data() {
      return {
        loading: false,
        users: [] as UserProfile[],
        drawerVisible: false,
        isEditMode: false,
        editTargetId: '',
        form: EMPTY_FORM(),
        saving: false,
        deleteModalVisible: false,
        deleteTarget: null as UserProfile | null,
        deleting: false,
        rules: {
          email: [
            { required: true, message: 'Nhập email', trigger: 'blur' },
            { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' },
          ],
          password: [
            { required: true, message: 'Nhập mật khẩu', trigger: 'blur' },
            { min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' },
          ],
        },
      }
    },

    computed: {
      columns(): DataTableColumns<UserProfile> {
        return [
          {
            title: 'Email',
            key: 'email',
            ellipsis: { tooltip: true },
          },
          {
            title: 'Tên hiển thị',
            key: 'display_name',
            render: (row) =>
              row.display_name
                ? row.display_name
                : h(NText, { depth: 3 }, { default: () => '—' }),
          },
          {
            title: 'Quyền hạn',
            key: 'permissions',
            render: (row) => {
              if (!row.permissions.length)
                return h(NText, { depth: 3, style: 'font-size: 0.8rem' }, { default: () => 'Không có' })
              return h(
                'div',
                { style: 'display: flex; gap: 4px; flex-wrap: wrap' },
                row.permissions.map((p) =>
                  h(NTag, { size: 'small', type: PERMISSION_TYPES[p] ?? 'default' }, { default: () => PERMISSION_LABELS[p] ?? p })
                ),
              )
            },
          },
          {
            title: 'Ngày tạo',
            key: 'created_at',
            width: 130,
            render: (row) => new Date(row.created_at).toLocaleDateString('vi-VN'),
          },
          {
            title: '',
            key: 'actions',
            width: 100,
            render: (row) =>
              h('div', { style: 'display: flex; gap: 8px' }, [
                h(
                  NButton,
                  { size: 'small', text: true, onClick: () => this.openEdit(row) },
                  { icon: () => h(NIcon, null, { default: () => h(EditIcon) }) },
                ),
                h(
                  NButton,
                  { size: 'small', text: true, type: 'error', onClick: () => this.confirmDelete(row) },
                  { icon: () => h(NIcon, null, { default: () => h(DeleteIcon) }) },
                ),
              ]),
          },
        ]
      },
    },

    created() {
      this.loadUsers()
    },

    methods: {
      async loadUsers() {
        this.loading = true
        try {
          this.users = await listUsers()
        } catch (e) {
          this.message.error((e as Error).message)
        } finally {
          this.loading = false
        }
      },

      openAdd() {
        this.isEditMode = false
        this.editTargetId = ''
        this.form = EMPTY_FORM()
        this.drawerVisible = true
      },

      openEdit(user: UserProfile) {
        this.isEditMode = true
        this.editTargetId = user.id
        this.form = {
          email: user.email,
          password: '',
          displayName: user.display_name,
          permissions: [...user.permissions],
        }
        this.drawerVisible = true
      },

      async handleSave() {
        if (!this.isEditMode) {
          try {
            await this.formRef?.validate()
          } catch {
            return
          }
        }
        this.saving = true
        try {
          if (this.isEditMode) {
            await updateUser(this.editTargetId, this.form.displayName, this.form.permissions)
            this.message.success('Đã cập nhật')
          } else {
            await createUser(this.form.email, this.form.password, this.form.displayName, this.form.permissions)
            this.message.success('Đã tạo người dùng')
          }
          this.drawerVisible = false
          await this.loadUsers()
        } catch (e) {
          this.message.error((e as Error).message)
        } finally {
          this.saving = false
        }
      },

      confirmDelete(user: UserProfile) {
        this.deleteTarget = user
        this.deleteModalVisible = true
      },

      async handleDelete() {
        if (!this.deleteTarget) return
        this.deleting = true
        try {
          await deleteUser(this.deleteTarget.id)
          this.message.success('Đã xóa người dùng')
          this.deleteModalVisible = false
          await this.loadUsers()
        } catch (e) {
          this.message.error((e as Error).message)
        } finally {
          this.deleting = false
        }
      },
    },
  })
</script>

<style lang="less" scoped>
  .users-page {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;

    h2 {
      margin: 0;
    }
  }
</style>
