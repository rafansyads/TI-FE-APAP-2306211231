<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { get } from '@/lib/api'

const month = ref<number>(new Date().getMonth() + 1)
const year = ref<number>(new Date().getFullYear())
const loading = ref(false)
const error = ref<string | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Minimal Chart.js types for CDN usage (avoid any)
type ChartDataset = { label: string; data: number[]; backgroundColor: string }
type ChartData = { labels: string[]; datasets: ChartDataset[] }
type ChartConfig = { type: string; data: ChartData }
type ChartInstance = { destroy: () => void }
type ChartCtor = new (ctx: CanvasRenderingContext2D, config: ChartConfig) => ChartInstance

let chart: ChartInstance | null = null

async function ensureChartJs(): Promise<ChartCtor> {
  const w = window as unknown as { Chart?: ChartCtor }
  if (w.Chart) return w.Chart
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(s)
  })
  return (window as unknown as { Chart: ChartCtor }).Chart
}

interface ChartResponse { month?: number; year?: number; labels: string[]; data: number[]; items?: { propertyId: string; propertyName: string; profit: number; type?: number }[] }
const items = ref<ChartResponse['items']>([])
const total = ref<number>(0)

async function load() {
  loading.value = true; error.value = null
  try {
  // Backend returns a BaseResponseDto wrapper: { status, message, data: { labels, data, items } }
  const res = await get<unknown>(`/bookings/chart?month=${month.value}&year=${year.value}`)
  const envelope = res as unknown as { data?: any }
  const payload = envelope && envelope.data ? envelope.data as ChartResponse : (res as unknown as ChartResponse)
  // support alternate key 'values' returned by some backends
  const series = (payload && (payload.data || (payload as any).values)) || []
  items.value = payload.items || []
  total.value = (items.value || []).reduce((s, it) => s + (it.profit || 0), 0)
    const Chart = await ensureChartJs()
    const ctx = canvasRef.value?.getContext('2d')
    if (!ctx) throw new Error('Canvas not available')
    if (chart) chart.destroy()
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: payload.labels || [],
        datasets: [
          { label: 'Profit', data: series as number[] || [], backgroundColor: '#3e63dd' }
        ]
      }
    })
  } catch (e: unknown) { error.value = e instanceof Error ? e.message : String(e) }
  finally { loading.value = false }
}

onMounted(load)
watch([month, year], load)
</script>

<template>
  <section>
    <h2>Property Income Statistic</h2>
    <div class="row">
      <label>Month <input type="number" min="1" max="12" v-model.number="month"/></label>
      <label>Year <input type="number" min="2000" max="2100" v-model.number="year"/></label>
      <button class="btn" @click="load">Show Statistic</button>
    </div>
    <p v-if="loading">Loading…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <canvas ref="canvasRef" height="160"></canvas>
    <div class="summary" v-if="items && items.length">
      <h3>Per-Property Profit (Total: {{ total }})</h3>
      <table>
        <thead><tr><th>Property</th><th>Profit</th></tr></thead>
        <tbody>
          <tr v-for="it in items" :key="it.propertyId">
            <td>{{ it.propertyName }}</td>
            <td>{{ it.profit }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.row{ display:flex; gap:1rem; align-items: center }
.btn{ text-decoration:none; border:1px solid var(--color-border); border-radius:6px; padding:.5rem .75rem }
.error{ color:#b30000 }
.summary{ margin-top:1rem }
.summary table{ width:100%; border-collapse: collapse; }
.summary th, .summary td{ border:1px solid var(--color-border); padding:.4rem .55rem; text-align:left }
</style>
