<template>
  <n-card class="kpi-card" :style="color !== 'inherit' ? { '--kpi-accent': color } : {}">
    <div v-if="color !== 'inherit'" class="kpi-card__accent" />
    <div class="kpi-card__label">{{ label }}</div>
    <div class="kpi-card__value" :style="{ color }">{{ value }}</div>
    <div class="kpi-card__footer">
      <n-text v-if="sub" depth="3" class="kpi-card__sub">{{ sub }}</n-text>
      <span v-if="delta !== null && delta !== undefined" class="kpi-delta" :class="deltaClass">
        <n-icon size="14"><ArrowUpIcon v-if="delta >= 0" /><ArrowDownIcon v-else /></n-icon>
        {{ Math.abs(delta) }}%
        <n-text depth="3" style="font-size: 0.75rem"> vs kỳ trước</n-text>
      </span>
    </div>
  </n-card>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { NCard, NText, NIcon } from 'naive-ui'
  import { ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon } from '@vicons/carbon'

  export default defineComponent({
    name: 'KpiCard',
    components: { NCard, NText, NIcon, ArrowUpIcon, ArrowDownIcon },

    props: {
      label: { type: String, required: true },
      value: { type: String, required: true },
      delta: { type: Number, default: null },
      sub: { type: String, default: '' },
      color: { type: String, default: 'inherit' },
    },

    computed: {
      deltaClass(): string {
        if (this.delta === null || this.delta === undefined) return ''
        return this.delta >= 0 ? 'kpi-delta--up' : 'kpi-delta--down'
      },
    },
  })
</script>

<style lang="less" scoped>
  .kpi-card {
    position: relative;
    overflow: hidden;

    &__accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--kpi-accent, #7C6DFA);
      border-radius: 14px 14px 0 0;
    }

    &__label {
      font-size: 0.875rem;
      color: #999;
      margin-bottom: 0.375rem;
    }

    &__value {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
    }

    &__footer {
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    &__sub {
      font-size: 0.8rem;
    }
  }

  .kpi-delta {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.8rem;
    font-weight: 600;

    &--up { color: #18a058; }
    &--down { color: #d03050; }
  }
</style>
