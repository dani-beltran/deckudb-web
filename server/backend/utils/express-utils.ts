import type { Request } from 'express'

export const getCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  const regex = new RegExp(`(?:^|; )${encodeURIComponent(name)}=([^;]*)`)
  const match = cookieHeader.match(regex)
  return match ? decodeURIComponent(match[1]) : null
}
