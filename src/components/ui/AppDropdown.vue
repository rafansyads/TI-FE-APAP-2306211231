<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'AppDropdown',
  props: {
    modelValue: { type: null as unknown as PropType<string | number | null | undefined>, default: '' },
    options: { type: Array as PropType<Array<{ label: string; value: string | number }>>, default: () => [] },
    placeholder: { type: String, default: 'Select' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ['update:modelValue','change'],
  setup(props, { emit }){
    function onChange(ev: Event){
      const target = ev.target as HTMLSelectElement
      const val = target.value === '' ? null : target.value
      emit('update:modelValue', val)
      emit('change', val)
    }
    return { props, onChange }
  }
})
</script>

<template>
  <select :value="props.modelValue ?? ''" @change="onChange" :disabled="props.disabled || props.loading" class="app-dd">
    <option value="">-- {{ props.loading ? 'Loading…' : (props.placeholder ?? 'Select') }} --</option>
    <option v-for="opt in props.options" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>

<style scoped>
.app-dd{ width:100%; padding:.5rem; border:1px solid var(--color-border); border-radius:6px; background: var(--color-background); color: var(--vt-c-text-1) }
</style>
