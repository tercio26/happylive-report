<template>
  <div class="auth-layout">
    <router-view />
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'

  export default defineComponent({
    name: 'AuthLayout',
  })
</script>

<style lang="less" scoped>
  .auth-layout {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
  }
</style>
