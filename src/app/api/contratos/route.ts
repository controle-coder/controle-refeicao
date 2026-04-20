import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  fazendaIds: z.array(z.number().int().positive()).optional(),
  restauranteIds: z.array(z.number().int().positive()).optional(),
  turmaIds: z.array(z.number().int().positive()).optional(),
})

const INCLUDE = {
  _count: { select: { requisitantes: true } },
  fazendas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
  restaurantes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
  turmas: { select: { id: true, nome: true, fazendaId: true }, orderBy: { nome: 'asc' } },
} as const

export async function GET() {
  try {
    await requireAdmin()
    const items = await prisma.contrato.findMany({
      orderBy: { nome: 'asc' },
      include: INCLUDE,
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
    const { fazendaIds, restauranteIds, turmaIds, ...rest } = schema.parse(body)
    const item = await prisma.contrato.create({
      data: {
        ...rest,
        fazendas: fazendaIds?.length ? { connect: fazendaIds.map((id) => ({ id })) } : undefined,
        restaurantes: restauranteIds?.length ? { connect: restauranteIds.map((id) => ({ id })) } : undefined,
        turmas: turmaIds?.length ? { connect: turmaIds.map((id) => ({ id })) } : undefined,
      },
      include: INCLUDE,
    })
    return Response.json(item, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0].message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
