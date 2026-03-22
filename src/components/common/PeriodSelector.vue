<template>
  <div class="period-selector">
    <n-radio-group v-model:value="periodType" size="small" @update:value="onTypeChange">
      <n-radio-button value="week">Tuần</n-radio-button>
      <n-radio-button value="month">Tháng</n-radio-button>
      <n-radio-button value="year">Năm</n-radio-button>
    </n-radio-group>

    <div class="period-nav">
      <n-button text size="small" @click="prev">
        <n-icon><ChevronLeftIcon /></n-icon>
      </n-button>
      <n-text class="period-label">{{ currentRange.label }}</n-text>
      <n-button text size="small" :disabled="offset >= 0" @click="next">
        <n-icon><ChevronRightIcon /></n-icon>
      </n-button>
    </div>
  </div>
</template>

<script lang="ts">
  import { defineComponent, type PropType } from 'vue'
  import { NRadioGroup, NRadioButton, NButton, NIcon, NText } from 'naive-ui'
  import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@vicons/carbon'
  import { getPeriodRange, type PeriodType, type PeriodRange } from '@/services/analytics'

  export default defineComponent({
    name: 'PeriodSelector',
    components: { NRadioGroup, NRadioButton, NButton, NIcon, NText, ChevronLeftIcon, ChevronRightIcon },

    props: {
      modelValue: {
        type: Object as PropType<PeriodRange | null>,
        default: null,
      },
    },

    emits: ['update:modelValue', 'type-change'],

    data() {
      return {
        periodType: 'week' as PeriodType,
        offset: 0,
      }
    },

    computed: {
      currentRange(): PeriodRange {
        return getPeriodRange(this.periodType, this.offset)
      },
    },

    created() {
      this.emit()
    },

    methods: {
      prev() {
        this.offset--
        this.emit()
      },
      next() {
        if (this.offset >= 0) return
        this.offset++
        this.emit()
      },
      onTypeChange() {
        this.offset = 0
        this.$emit('type-change', this.periodType)
        this.emit()
      },
      emit() {
        this.$emit('update:modelValue', this.currentRange)
      },
    },
  })
</script>

<style lang="less" scoped>
  .period-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .period-nav {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .period-label {
    min-width: 8rem;
    text-align: center;
    font-weight: 500;

    @media (max-width: 480px) {
      min-width: 0;
    }
  }
</style>
