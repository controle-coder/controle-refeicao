import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  nome: z.string().min(1).optional(),
  pin: z.string().min(4).max(6).regex(/^\d+$/).optional(),
  ativo: z.boolean().optional(),
})

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/usuarios-restaurante/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const data = schema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.nome) updateData.nome = data.nome
    if (data.pin) updateData.pinHash = await bcrypt.hash(data.pin, 10)
    if (data.ativo !== undefined) updateData.ativo = data.ativo

    const usuario = await prisma.requisitante.update({
      where: { id: Number(id) },
      data: updateData,
      include: { restaurante: { select: { id: true, nome: true } } },
    })

    return Response.json(usuario)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
