<script lang="ts">
import { computed, defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'AppButton',
  props: {
    variant: { type: String as PropType<'primary'|'secondary'|'danger'|'link'>, default: 'secondary' },
    size: { type: String as PropType<'sm'|'md'|'lg'>, default: 'md' },
    type: { type: String as PropType<'button'|'submit'|'reset'>, default: 'button' },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit }){
    const cls = computed(() => {
      const v = props.variant ?? 'secondary'
      const s = props.size ?? 'md'
      return [
        'app-btn',
        `app-btn--${v}`,
        `app-btn--${s}`,
        props.disabled ? 'is-disabled' : '',
        props.loading ? 'is-loading' : ''
      ].filter(Boolean).join(' ')
    })

    function onClick(ev: MouseEvent){
      if(props.disabled || props.loading) { ev.preventDefault(); return }
      emit('click', ev)
    }

    return { props, cls, onClick }
  }
})
</script>

<template>
  <button :type="props.type ?? 'button'" :class="cls" :disabled="props.disabled || props.loading" @click="onClick">
    <span v-if="props.loading" class="spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.app-btn{ border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem; background:transparent; cursor:pointer; display:inline-flex; align-items:center; gap:.5rem }
.app-btn--primary{ background: var(--vt-c-indigo); color:white; border-color: transparent }
.app-btn--secondary{ background: transparent; color: var(--vt-c-text-1) }
.app-btn--danger{ background:#c62828; color:white; border-color: transparent }
.app-btn--link{ background:none; border:none; text-decoration:underline; padding:0 }
.app-btn--sm{ font-size:.9rem }
.app-btn--md{ font-size:1rem }
.app-btn--lg{ font-size:1.1rem; padding:.65rem 1rem }
.is-disabled{ opacity:.6; cursor:not-allowed }
.spinner{ width:14px; height:14px; border:2px solid rgba(255,255,255,.4); border-top-color:white; border-radius:50%; animation:spin 1s linear infinite }
@keyframes spin{ to { transform: rotate(360deg) } }
</style>
