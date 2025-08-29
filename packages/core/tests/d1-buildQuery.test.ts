import { describe, it, expect } from 'vitest'
import { D1Backend } from '../src/event-store'

describe('D1Backend.buildQuery', () => {
  it('builds SQL for kinds/limit', () => {
    const [{ sql, params }] = D1Backend.buildQuery([{ kinds: [1], limit: 10 }] as any)
    expect(sql).toContain('SELECT e.json FROM events e')
    expect(sql).toContain('kind IN (?)')
    expect(sql).toContain('LIMIT 10')
    expect(params).toEqual([1])
  })
  it('builds SQL for authors and time range', () => {
    const [{ sql, params }] = D1Backend.buildQuery([{ authors: ['abcdef'], since: 100, until: 200 }] as any)
    expect(sql).toContain('pubkey LIKE ?')
    expect(params).toEqual(['abcdef%', 100, 200])
  })
  it('builds SQL with tag filter', () => {
    const [{ sql, params }] = D1Backend.buildQuery([{ ids: ['deadbeef'], '#e': ['ref'] }] as any)
    expect(sql).toContain('EXISTS (SELECT 1 FROM tags tg')
    expect(params[0]).toBe('deadbeef%')
  })
})
