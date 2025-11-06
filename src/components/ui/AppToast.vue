<script lang="ts">
import { defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'AppToast',
  props: {
    open: { type: Boolean, required: true },
    message: { type: String, required: true },
    type: { type: String as () => 'success'|'error'|'info'|'warn', default: 'info' },
    duration: { type: Number, default: 2000 },
  },
  emits: ['close'],
  setup(props, { emit }){
    const visible = ref(false)
    let timer: number | undefined

    function clearTimer(){ if(timer){ clearTimeout(timer); timer = undefined } }

    watch(() => props.open, (nv) => {
      visible.value = nv
      if(nv){
        clearTimer()
        timer = window.setTimeout(() => { emit('close') }, props.duration)
      } else {
        clearTimer()
      }
    }, { immediate: true })

    return { props, visible }
  }
})
</script>

<template>
  <transition name="fade">
    <div v-if="visible" class="toast" :class="`toast--${props.type ?? 'info'}`">
      <span class="toast-msg">{{ props.message }}</span>
      <button class="toast-close" @click="$emit('close')">×</button>
    </div>
  </transition>
</template>

<style scoped>
.toast{ position:fixed; top:84px; right:16px; padding:.75rem 1rem; border-radius:8px; color:white; box-shadow:0 4px 16px rgba(0,0,0,.2); display:flex; align-items:center; gap:.75rem; z-index:1000 }
.toast--success{ background:#2e7d32 }
.toast--error{ background:#c62828 }
.toast--info{ background:#1976d2 }
.toast--warn{ background:#ed6c02 }
.toast-close{ background:transparent; border:none; color:white; font-size:1.2rem; cursor:pointer }
.fade-enter-active,.fade-leave-active{ transition: opacity .2s }
.fade-enter-from,.fade-leave-to{ opacity:0 }
</style>
