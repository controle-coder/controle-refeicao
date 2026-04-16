import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  id: number
  nome: string
  role: 'ADMIN' | 'REQUISITANTE'
  fazendaId: number | null
  turmaId: number | null
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'pedidos-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  if (!session.id) {
    throw new Error('UNAUTHORIZED')
  }
  return session as SessionData
}

export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth()
  if (session.role !== 'ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return session
}

export function authError(message: string): Response {
  const status = message === 'UNAUTHORIZED' ? 401 : 403
  return Response.json({ error: message }, { status })
}
