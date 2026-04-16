import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1),
  fazendaId: z.number().int().positive(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const fazendaId = searchParams.get('fazendaId')

    const items = await prisma.turma.findMany({
      where: {
        ativo: true,
        ...(fazendaId ? { fazendaId: Number(fazendaId) } : {}),
      },
      include: { fazenda: true },
      orderBy: { nome: 'asc' },
    })
    return Response.json(items)
  } catch (e: any) {
    return authError(e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = schema.parse(body)
    const item = await prisma.turma.create({ data, include: { fazenda: true } })
    return Response.json(item, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
