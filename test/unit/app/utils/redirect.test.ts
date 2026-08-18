import { sanitizeAdminRedirect } from '@app/utils/redirect'
import { describe, expect, it } from 'vitest'

describe('sanitizeAdminRedirect', () => {
  it('preserves a safe admin path, query, and hash', () => {
    expect(sanitizeAdminRedirect('/admin?status=failed&sort=desc#jobs')).toBe(
      '/admin?status=failed&sort=desc#jobs'
    )
  })

  it.each([
    undefined,
    'https://example.com/admin',
    '//example.com/admin',
    '/\\example.com/admin',
    '/games',
    '/admin/login',
  ])('falls back to the admin dashboard for an unsafe redirect (%s)', (redirect) => {
    expect(sanitizeAdminRedirect(redirect)).toBe('/admin')
  })
})
