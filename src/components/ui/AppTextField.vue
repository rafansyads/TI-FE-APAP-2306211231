<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  help: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'input'])

function onInput(ev: Event) {
  const v = (ev.target as HTMLInputElement).value
  emit('update:modelValue', v)
  emit('input', v)
}
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
