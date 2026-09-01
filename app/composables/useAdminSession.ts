import { useState } from '#imports'
import type { AdminSession } from '../plugins/api/types'

export function useAdminSession() {
  return useState<AdminSession>('admin-session', () => ({ authenticated: false }))
}
