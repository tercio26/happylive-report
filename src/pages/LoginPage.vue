<template>
  <div class="login-wrapper">
    <div class="login-logo">
      <img :src="logoUrl" alt="HappyLive" />
    </div>
    <n-card class="login-card" title="Đăng nhập">
      <n-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <n-form-item label="Email" path="email">
          <n-input v-model:value="form.email" placeholder="email@company.com" />
        </n-form-item>
        <n-form-item label="Mật khẩu" path="password">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="Nhập mật khẩu"
          />
        </n-form-item>
        <n-button
          type="primary"
          block
          :loading="loading"
          attr-type="submit"
          style="margin-top: 8px"
        >
          Đăng nhập
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { NCard, NForm, NFormItem, NInput, NButton, useMessage, type FormRules } from 'naive-ui'
  import { useAuthStore } from '@/stores/auth'
  import { useRouter } from 'vue-router'
  import logoUrl from '@/assets/images/logo.png'

  export default defineComponent({
    name: 'LoginPage',
    components: { NCard, NForm, NFormItem, NInput, NButton },

    setup() {
      return {
        logoUrl,
        message: useMessage(),
        auth: useAuthStore(),
        router: useRouter(),
      }
    },

    data() {
      return {
        loading: false,
        form: {
          email: '',
          password: '',
        },
        rules: {
          email: [{ required: true, message: 'Vui lòng nhập email', trigger: 'blur' }],
          password: [{ required: true, message: 'Vui lòng nhập mật khẩu', trigger: 'blur' }],
        } as FormRules,
      }
    },

    methods: {
      async handleLogin() {
        this.loading = true
        try {
          await this.auth.login(this.form.email, this.form.password)
          this.router.push({ name: 'dashboard' })
        } catch (_err) {
          this.message.error('Email hoặc mật khẩu không đúng')
        } finally {
          this.loading = false
        }
      },
    },
  })
</script>

<style lang="less" scoped>
  .login-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0D0B1E 0%, #1A1040 30%, #0E1535 60%, #091828 100%);
    gap: 1.5rem;
  }

  .login-logo img {
    height: 8rem;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  }

  .login-card {
    width: 23.75rem;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3), 0 0 60px rgba(124, 109, 250, 0.12) !important;
    border: 1px solid rgba(124, 109, 250, 0.15) !important;
  }
</style>
