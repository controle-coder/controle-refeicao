import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface SessionData {
  id: number
  nome: string
  role: 'ADMIN' | 'GESTOR' | 'REQUISITANTE' | 'RESTAURANTE'
  fazendaId: number | null
  turmaId: number | null
  restauranteId: number | null
  contratoIds: number[]
}

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET não definido nas variáveis de ambiente')
}

const sessionOptions = {
  password: process.env.SESSION_SECRET,
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

/** Retorna os IDs de entidades vinculadas aos contratos do gestor */
export async function getGestorScope(contratoIds: number[]) {
  if (!contratoIds.length) {
    return { fazendaIds: [], turmaIds: [], restauranteIds: [], requisitanteIds: [] }
  }

  const contratos = await prisma.contrato.findMany({
    where: { id: { in: contratoIds }, ativo: true },
    select: {
      fazendas: { select: { id: true } },
      turmas: { select: { id: true } },
      restaurantes: { select: { id: true } },
      requisitantes: { select: { id: true } },
    },
  })

  const fazendaIds = [...new Set(contratos.flatMap((c) => c.fazendas.map((f) => f.id)))]
  const turmaIds = [...new Set(contratos.flatMap((c) => c.turmas.map((t) => t.id)))]
  const restauranteIds = [...new Set(contratos.flatMap((c) => c.restaurantes.map((r) => r.id)))]
  const requisitanteIds = [...new Set(contratos.flatMap((c) => c.requisitantes.map((r) => r.id)))]

  return { fazendaIds, turmaIds, restauranteIds, requisitanteIds }
}
