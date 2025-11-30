import { vi } from 'vitest'

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    host: 'localhost:5173',
    href: 'http://localhost:5173/',
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
})

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: '',
    PROD: false,
    DEV: true,
  },
})
