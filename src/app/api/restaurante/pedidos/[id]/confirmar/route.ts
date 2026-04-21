import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(_req: NextRequest, ctx: RouteContext<'/api/restaurante/pedidos/[id]/confirmar'>) {
  try {
    const session = await getSession()

    console.log('[confirmar] session:', { id: session.id, role: session.role, restauranteId: session.restauranteId })

    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      console.log('[confirmar] 401 - sessão inválida')
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await ctx.params
    console.log('[confirmar] pedidoId:', id)

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })

    if (!pedido) {
      console.log('[confirmar] 404 - pedido não encontrado')
      return Response.json({ error: 'Não encontrado' }, { status: 404 })
    }

    console.log('[confirmar] pedido.restauranteId:', pedido.restauranteId, 'session.restauranteId:', session.restauranteId)

    if (pedido.restauranteId !== session.restauranteId) {
      console.log('[confirmar] 403 - restaurante não confere')
      return Response.json({ error: 'Não autorizado' }, { status: 403 })
    }

    if (pedido.status === 'CANCELADO') {
      console.log('[confirmar] 400 - pedido cancelado')
      return Response.json({ error: 'Pedido cancelado não pode ser confirmado' }, { status: 400 })
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status: 'CONFIRMADO' },
    })

    console.log('[confirmar] sucesso:', atualizado.id)
    return Response.json(atualizado)
  } catch (err) {
    console.error('[confirmar] erro interno:', err)
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
