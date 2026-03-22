<template>
  <div class="profile-page">
    <n-h2>Trang cá nhân</n-h2>

    <n-grid :cols="1" :x-gap="16" :y-gap="16" style="max-width: 32rem">
      <!-- Account info -->
      <n-gi>
        <n-card title="Thông tin tài khoản">
          <n-form label-placement="top">
            <n-form-item label="Email">
              <n-input :value="authStore.user?.email ?? ''" disabled />
            </n-form-item>
            <n-form-item label="Tên hiển thị">
              <n-input v-model:value="displayName" placeholder="Nguyễn Văn A" />
            </n-form-item>
          </n-form>
          <n-button type="primary" :loading="savingName" @click="handleSaveName">
            Lưu tên
          </n-button>
        </n-card>
      </n-gi>

      <!-- Change password -->
      <n-gi>
        <n-card title="Đổi mật khẩu">
          <n-form ref="pwFormRef" :model="pwForm" :rules="pwRules" label-placement="top">
            <n-form-item label="Mật khẩu mới" path="newPassword">
              <n-input
                v-model:value="pwForm.newPassword"
                type="password"
                show-password-on="click"
                placeholder="Tối thiểu 6 ký tự"
              />
            </n-form-item>
            <n-form-item label="Xác nhận mật khẩu" path="confirmPassword">
              <n-input
                v-model:value="pwForm.confirmPassword"
                type="password"
                show-password-on="click"
                placeholder="Nhập lại mật khẩu mới"
              />
            </n-form-item>
          </n-form>
          <n-button type="primary" :loading="savingPw" @click="handleSavePassword">
            Đổi mật khẩu
          </n-button>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script lang="ts">
  import { defineComponent, ref } from 'vue'
  import { NH2, NGrid, NGi, NCard, NForm, NFormItem, NInput, NButton, useMessage, type FormInst } from 'naive-ui'
  import { supabase } from '@/services/supabase'
  import { useAuthStore } from '@/stores/auth'

  export default defineComponent({
    name: 'ProfilePage',
    components: { NH2, NGrid, NGi, NCard, NForm, NFormItem, NInput, NButton },

    setup() {
      const pwFormRef = ref<FormInst | null>(null)
      const message = useMessage()
      const authStore = useAuthStore()
      return { pwFormRef, message, authStore }
    },

    data() {
      return {
        displayName: '',
        savingName: false,
        pwForm: {
          newPassword: '',
          confirmPassword: '',
        },
        savingPw: false,
        pwRules: {
          newPassword: [
            { required: true, message: 'Nhập mật khẩu mới', trigger: 'blur' },
            { min: 6, message: 'Tối thiểu 6 ký tự', trigger: 'blur' },
          ],
          confirmPassword: [
            { required: true, message: 'Xác nhận mật khẩu', trigger: 'blur' },
            {
              validator: (_rule: unknown, value: string) => {
                if (value !== (this as any).pwForm.newPassword) {
                  return new Error('Mật khẩu không khớp')
                }
                return true
              },
              trigger: 'blur',
            },
          ],
        },
      }
    },

    async created() {
      const { data } = await supabase.auth.getUser()
      this.displayName = (data.user?.user_metadata?.display_name as string) ?? ''
    },

    methods: {
      async handleSaveName() {
        this.savingName = true
        try {
          const { error } = await supabase.auth.updateUser({
            data: { display_name: this.displayName },
          })
          if (error) throw new Error(error.message)
          this.message.success('Đã cập nhật tên hiển thị')
        } catch (e) {
          this.message.error((e as Error).message)
        } finally {
          this.savingName = false
        }
      },

      async handleSavePassword() {
        try {
          await this.pwFormRef?.validate()
        } catch {
          return
        }
        this.savingPw = true
        try {
          const { error } = await supabase.auth.updateUser({
            password: this.pwForm.newPassword,
          })
          if (error) throw new Error(error.message)
          this.message.success('Đã đổi mật khẩu thành công')
          this.pwForm.newPassword = ''
          this.pwForm.confirmPassword = ''
        } catch (e) {
          this.message.error((e as Error).message)
        } finally {
          this.savingPw = false
        }
      },
    },
  })
</script>

<style lang="less" scoped>
  .profile-page {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    h2 {
      margin: 0;
    }
  }
</style>
