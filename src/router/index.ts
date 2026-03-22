import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/pages/DashboardPage.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/pages/ReportsPage.vue'),
        },
        {
          path: 'data',
          name: 'data',
          component: () => import('@/pages/DataPage.vue'),
        },
        {
          path: 'import',
          name: 'import',
          component: () => import('@/pages/ImportPage.vue'),
          meta: { permission: 'manage_data' },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/pages/UsersPage.vue'),
          meta: { permission: 'manage_users' },
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/pages/ProfilePage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Wait for initial auth check
  if (auth.loading) {
    await auth.init()
  }

  if (to.meta.requiresAuth === false) {
    // Public route — redirect logged-in users away from login
    if (auth.isLoggedIn) return { name: 'dashboard' }
    return true
  }

  // Protected route
  if (!auth.isLoggedIn) return { name: 'login' }

  // Permission check
  const requiredPermission = to.meta.permission as string | undefined
  if (requiredPermission && !auth.hasPermission(requiredPermission as any)) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
