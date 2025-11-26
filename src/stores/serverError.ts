import { defineStore } from 'pinia'

export type ServerError = {
  code: number
  message: string
  suggestions?: string[]
}

export const useServerErrorStore = defineStore('serverError', {
  state: () => ({ error: null as ServerError | null }),
  actions: {
    set(err: ServerError) { this.error = err },
    clear() { this.error = null }
  }
})
