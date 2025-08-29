import { describe, it, expect } from 'vitest'

// Mock environment for testing
const mockEnv = {
  CONFIG_KV: undefined,
  R2: undefined,
  DB: undefined,
} as any

const mockContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as any

describe('Relay Worker', () => {
  it('should respond to health check', async () => {
    // Import the worker - we need to use dynamic import to handle ES modules
    const { default: worker } = await import('../src/index')
    
    const request = new Request('http://localhost:8787/health')
    const response = await worker.fetch(request, mockEnv, mockContext)
    
    expect(response.status).toBe(200)
    
    const data = await response.json() as any
    expect(data).toMatchObject({
      status: 'healthy',
      version: '0.0.1',
    })
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(typeof data.uptime).toBe('number')
  })

  it('should respond to NIP-11 info at root', async () => {
    const { default: worker } = await import('../src/index')
    
    const request = new Request('http://localhost:8787/')
    const response = await worker.fetch(request, mockEnv, mockContext)
    
    expect(response.status).toBe(200)
    
    const data = await response.json() as any
    expect(data).toMatchObject({
      name: 'My Nostr Relay',
      software: 'nostr-relay-cf-worker',
      version: '0.0.1',
    })
    expect(Array.isArray(data.supported_nips)).toBe(true)
  })

  it('should handle CORS preflight requests', async () => {
    const { default: worker } = await import('../src/index')
    
    const request = new Request('http://localhost:8787/', { method: 'OPTIONS' })
    const response = await worker.fetch(request, mockEnv, mockContext)
    
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toBe('GET,PUT,OPTIONS')
  })
})