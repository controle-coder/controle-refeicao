import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  nome: z.string().min(1).optional(),
  pin: z.string().min(4).max(6).regex(/^\d+$/).optional(),
  role: z.enum(['ADMIN', 'REQUISITANTE']).optional(),
  fazendaId: z.number().int().positive().optional(),
  turmaId: z.number().int().positive().optional(),
  contratoIds: z.array(z.number().int().positive()).optional(),
  ativo: z.boolean().optional(),
})

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/requisitantes/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const { pin, contratoIds, ...rest } = schema.parse(body)
    const updateData: Record<string, unknown> = { ...rest }
    if (pin) {
      updateData.pinHash = await bcrypt.hash(pin, 10)
    }
    if (contratoIds !== undefined) {
      updateData.contratos = { set: contratoIds.map((cid) => ({ id: cid })) }
    }
    const item = await prisma.requisitante.update({
      where: { id: Number(id) },
      data: updateData,
      include: { fazenda: true, turma: true, contratos: true },
    })
    return Response.json({ ...item, pinHash: undefined })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/requisitantes/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    await prisma.requisitante.update({ where: { id: Number(id) }, data: { ativo: false } })
    return Response.json({ ok: true })
  } catch (e: any) {
    return authError(e.message)
  }
}
