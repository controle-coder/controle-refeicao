import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(_req: NextRequest, ctx: RouteContext<'/api/restaurante/pedidos/[id]/confirmar'>) {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await ctx.params
    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })

    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

    if (pedido.restauranteId !== session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 403 })
    }

    if (pedido.status === 'CANCELADO') {
      return Response.json({ error: 'Pedido cancelado não pode ser confirmado' }, { status: 400 })
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status: 'CONFIRMADO' },
    })

    return Response.json(atualizado)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
