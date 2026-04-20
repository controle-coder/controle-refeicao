import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
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

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/contratos/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const { fazendaIds, restauranteIds, turmaIds, ...rest } = schema.parse(body)

    const item = await prisma.contrato.update({
      where: { id: Number(id) },
      data: {
        ...rest,
        // set replaces all relations at once (only when the arrays are provided)
        ...(fazendaIds !== undefined && { fazendas: { set: fazendaIds.map((id) => ({ id })) } }),
        ...(restauranteIds !== undefined && { restaurantes: { set: restauranteIds.map((id) => ({ id })) } }),
        ...(turmaIds !== undefined && { turmas: { set: turmaIds.map((id) => ({ id })) } }),
      },
      include: INCLUDE,
    })
    return Response.json(item)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0].message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
