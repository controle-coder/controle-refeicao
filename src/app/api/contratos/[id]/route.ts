import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  ativo: z.boolean().optional(),
})

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/contratos/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const data = schema.parse(body)
    const item = await prisma.contrato.update({
      where: { id: Number(id) },
      data,
      include: { _count: { select: { requisitantes: true } } },
    })
    return Response.json(item)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0].message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
