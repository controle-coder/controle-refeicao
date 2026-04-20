import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().min(10).regex(/^\d+$/).optional(),
  linkGrupoWhatsApp: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/restaurantes/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const item = await prisma.restaurante.findUnique({ where: { id: Number(id) } })
    if (!item) return Response.json({ error: 'Não encontrado' }, { status: 404 })
    return Response.json(item)
  } catch (e: any) {
    return authError(e.message)
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/restaurantes/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const data = schema.parse(body)
    const item = await prisma.restaurante.update({ where: { id: Number(id) }, data })
    return Response.json(item)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/restaurantes/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    await prisma.restaurante.update({ where: { id: Number(id) }, data: { ativo: false } })
    return Response.json({ ok: true })
  } catch (e: any) {
    return authError(e.message)
  }
}
