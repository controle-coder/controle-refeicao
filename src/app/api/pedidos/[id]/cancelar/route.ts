import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  motivoCancelamento: z.string().min(5, 'Informe o motivo (mínimo 5 caracteres)'),
})

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/pedidos/[id]/cancelar'>) {
  try {
    const session = await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const { motivoCancelamento } = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (pedido.status === 'CANCELADO') {
      return Response.json({ error: 'Pedido já está cancelado' }, { status: 400 })
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: {
        status: 'CANCELADO',
        canceladoPorId: session.id,
        motivoCancelamento,
      },
      include: {
        canceladoPor: { select: { id: true, nome: true } },
      },
    })

    return Response.json(atualizado)
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: e.issues[0].message }, { status: 400 })
    }
    return authError(e.message)
  }
}
