<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="228"
      :collapsed="collapsed"
      :native-scrollbar="false"
      class="app-sider"
      :style="{ background: 'linear-gradient(180deg, #130F2E 0%, #0E1535 55%, #091828 100%)' }"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sider-logo" :class="{ collapsed }">
        <img src="@/assets/images/logo.png" alt="HappyLive" class="sider-logo__img" />
        <span v-if="!collapsed" class="sider-logo__name">HappyLive</span>
      </div>

      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :options="menuOptions"
        :value="activeKey"
        :inverted="true"
        :indent="20"
        @update:value="handleMenuSelect"
      />

      <div v-if="!collapsed" class="sider-footer">
        <div class="sider-user">
          <div class="sider-user__avatar">
            {{ userInitial }}
          </div>
          <div class="sider-user__info">
            <div class="sider-user__name">{{ authStore.user?.email?.split('@')[0] }}</div>
            <div class="sider-user__email">{{ authStore.user?.email }}</div>
          </div>
        </div>
      </div>
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="app-header">
        <n-button text class="header-toggle" @click="collapsed = !collapsed">
          <n-icon size="20"><MenuIcon /></n-icon>
        </n-button>
        <div class="header-right">
          <n-button text size="small" @click="handleLogout">
            <template #icon><n-icon size="16"><LogoutIcon /></n-icon></template>
            Đăng xuất
          </n-button>
        </div>
      </n-layout-header>

      <n-layout-content class="app-content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script lang="ts">
  import { defineComponent, h } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import {
    NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
    NMenu, NButton, NIcon,
    type MenuOption,
  } from 'naive-ui'
  import {
    Dashboard, ChartBar, DataTable, Upload,
    UserMultiple, UserProfile as UserProfileIcon,
    Logout as LogoutIcon, Menu as MenuIcon,
  } from '@vicons/carbon'
  import { useAuthStore } from '@/stores/auth'

  export default defineComponent({
    name: 'MainLayout',
    components: {
      NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
      NMenu, NButton, NIcon,
      MenuIcon, LogoutIcon,
    },

    setup() {
      return {
        authStore: useAuthStore(),
        router: useRouter(),
        route: useRoute(),
      }
    },

    data() {
      return {
        collapsed: false,
        isMobile: false,
        resizeHandler: null as (() => void) | null,
      }
    },

    mounted() {
      this.isMobile = window.innerWidth < 768
      if (this.isMobile) this.collapsed = true
      this.resizeHandler = () => {
        this.isMobile = window.innerWidth < 768
        if (this.isMobile) this.collapsed = true
      }
      window.addEventListener('resize', this.resizeHandler)
    },

    beforeUnmount() {
      if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler)
    },

    computed: {
      activeKey(): string {
        return this.route.name as string
      },

      userInitial(): string {
        const email = this.authStore.user?.email ?? ''
        return email.charAt(0).toUpperCase()
      },

      menuOptions(): MenuOption[] {
        const options: MenuOption[] = [
          {
            label: 'Dashboard',
            key: 'dashboard',
            icon: () => h(NIcon, null, { default: () => h(Dashboard) }),
          },
          {
            label: 'Báo cáo',
            key: 'reports',
            icon: () => h(NIcon, null, { default: () => h(ChartBar) }),
          },
          {
            label: 'Dữ liệu Shopee',
            key: 'data',
            icon: () => h(NIcon, null, { default: () => h(DataTable) }),
          },
        ]

        if (this.authStore.hasPermission('manage_data')) {
          options.push({
            label: 'Import dữ liệu',
            key: 'import',
            icon: () => h(NIcon, null, { default: () => h(Upload) }),
          })
        }

        if (this.authStore.hasPermission('manage_users')) {
          options.push({
            label: 'Quản lý người dùng',
            key: 'users',
            icon: () => h(NIcon, null, { default: () => h(UserMultiple) }),
          })
        }

        options.push({
          label: 'Trang cá nhân',
          key: 'profile',
          icon: () => h(NIcon, null, { default: () => h(UserProfileIcon) }),
        })

        return options
      },
    },

    methods: {
      handleMenuSelect(key: string) {
        this.router.push({ name: key })
      },
      async handleLogout() {
        await this.authStore.logout()
        this.router.push({ name: 'login' })
      },
    },
  })
</script>

<style lang="less" scoped>
  // ── Sidebar ────────────────────────────────────────────────────────────────

  .app-sider {
    display: flex;
    flex-direction: column;

    // Override NaiveUI sider background
    :deep(.n-layout-sider-scroll-container) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    :deep(.n-scrollbar-content) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }

  .sider-logo {
    height: 3.75rem;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;

    &.collapsed {
      justify-content: center;
      padding: 0;
    }

    &__img {
      width: 2rem;
      height: 2rem;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }

    &__name {
      font-weight: 700;
      font-size: 1rem;
      color: #FFFFFF;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
  }

  .sider-footer {
    margin-top: auto;
    padding: 0.875rem 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    flex-shrink: 0;
  }

  .sider-user {
    display: flex;
    align-items: center;
    gap: 0.625rem;

    &__avatar {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #7C6DFA, #06B6D4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 0 10px rgba(124, 109, 250, 0.5);
    }

    &__info {
      overflow: hidden;
    }

    &__name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #E0DCF0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__email {
      font-size: 0.7rem;
      color: #6C6A80;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // Push NMenu to fill space above footer
  :deep(.n-menu) {
    flex: 1;
    padding: 0.5rem 0.625rem;
  }

  // ── Header ─────────────────────────────────────────────────────────────────

  .app-header {
    height: 3.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    box-shadow: 0 1px 0 0 #E8E6F8;
    border: none !important;
  }

  .header-toggle {
    color: #6C6A80;

    &:hover {
      color: #1A1825;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  // ── Content ────────────────────────────────────────────────────────────────

  .app-content {
    padding: 1.75rem;
    overflow: auto;
    background: #F2F1FA;

    @media (max-width: 768px) {
      padding: 1rem;
    }
  }
</style>
