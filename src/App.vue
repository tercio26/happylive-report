<template>
  <n-config-provider :theme="null" :theme-overrides="themeOverrides" :locale="viVN" :date-locale="dateViVN">
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { NConfigProvider, NMessageProvider, NDialogProvider, type GlobalThemeOverrides } from 'naive-ui'
  import { viVN, dateViVN } from 'naive-ui'

  const themeOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: '#7C6DFA',
      primaryColorHover: '#6B5CEA',
      primaryColorPressed: '#5A4BD9',
      primaryColorSuppl: '#9D91FB',
      borderRadius: '10px',
      borderRadiusSmall: '6px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

      bodyColor: '#F2F1FA',
      cardColor: '#FFFFFF',
      modalColor: '#FFFFFF',
      popoverColor: '#FFFFFF',
      tableColor: '#FFFFFF',
      inputColor: '#FFFFFF',
      inputColorDisabled: '#F7F6FF',

      dividerColor: '#E8E6F8',
      borderColor: '#DDD9F5',

      textColor1: '#16123A',
      textColor2: '#3A3660',
      textColor3: '#8C89B0',
      placeholderColor: '#B0AECE',

      successColor: '#10B981',
      successColorHover: '#059669',
      warningColor: '#F59E0B',
      warningColorHover: '#D97706',
      errorColor: '#EF4444',
      errorColorHover: '#DC2626',
      infoColor: '#06B6D4',
      infoColorHover: '#0891B2',
    },

    Card: {
      borderRadius: '14px',
      boxShadow: '0 2px 16px 0 rgba(100, 88, 200, 0.09)',
      paddingMedium: '1.25rem 1.5rem',
      titleFontSizeMedium: '1rem',
      titleFontWeight: '600',
      titleTextColor: '#16123A',
    },

    Button: {
      borderRadiusMedium: '8px',
      borderRadiusSmall: '6px',
      borderRadiusLarge: '10px',
      fontWeightStrong: '600',
    },

    Input: {
      borderRadius: '8px',
      boxShadowFocus: '0 0 0 2px rgba(124, 109, 250, 0.2)',
    },

    Select: {
      peers: {
        InternalSelection: { borderRadius: '8px' },
        InternalSelectMenu: { borderRadius: '12px' },
      },
    },

    DatePicker: {
      peers: { Input: { borderRadius: '8px' } },
    },

    DataTable: {
      borderRadius: '14px',
      thColor: '#F4F2FF',
      thColorHover: '#EAE7FF',
      thFontWeight: '600',
      thTextColor: '#3A3660',
      tdColor: '#FFFFFF',
      tdColorHover: '#FAF9FF',
      tdColorStriped: '#FDFCFF',
      borderColor: '#E8E6F8',
    },

    Tag: {
      borderRadius: '6px',
    },

    Drawer: {
      borderRadius: '16px 0 0 16px',
      color: '#FFFFFF',
    },

    Modal: {
      borderRadius: '16px',
      boxShadow: '0 8px 40px 0 rgba(40, 30, 100, 0.2)',
    },

    Menu: {
      borderRadius: '8px',
      itemTextColorInverted: '#B8B4D8',
      itemIconColorInverted: '#8A87B0',
      itemTextColorActiveInverted: '#FFFFFF',
      itemIconColorActiveInverted: '#FFFFFF',
      itemTextColorHoverInverted: '#E0DCFF',
      itemIconColorHoverInverted: '#E0DCFF',
      itemColorActiveInverted: 'rgba(124, 109, 250, 0.25)',
      arrowColorInverted: '#8A87B0',
      groupTextColorInverted: '#5A578A',
    },
  }

  export default defineComponent({
    name: 'App',
    components: { NConfigProvider, NMessageProvider, NDialogProvider },
    setup() {
      return { viVN, dateViVN, themeOverrides }
    },
  })
</script>
