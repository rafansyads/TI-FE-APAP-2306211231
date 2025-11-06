<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AppTextField',
  props: {
    modelValue: { type: [String, Number], default: '' },
    placeholder: { type: String, default: '' },
    type: { type: String, default: 'text' },
    disabled: { type: Boolean, default: false },
    error: { type: String, default: '' },
    help: { type: String, default: '' },
  },
  emits: ['update:modelValue','input'],
  setup(props, { emit }){
    function onInput(ev: Event){
      const v = (ev.target as HTMLInputElement).value
      emit('update:modelValue', v)
      emit('input', v)
    }
    return { props, onInput }
  }
})
</script>

<template>
  <div class="tf">
    <input :type="props.type ?? 'text'" :value="String(props.modelValue ?? '')" :placeholder="props.placeholder" :disabled="props.disabled" class="tf-input" @input="onInput" />
    <small v-if="props.help && !props.error" class="tf-help">{{ props.help }}</small>
    <small v-if="props.error" class="tf-error">{{ props.error }}</small>
  </div>
</template>

<style scoped>
.tf-input{ width:100%; padding:.5rem; border:1px solid var(--color-border); border-radius:6px }
.tf-help{ color: var(--vt-c-text-2) }
.tf-error{ color:#b30000 }
</style>
