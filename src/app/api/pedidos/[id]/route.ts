import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, authError, getGestorScope } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/pedidos/[id]'>) {
  try {
    const session = await requireAuth()
    const { id } = await ctx.params

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { id: true, nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          include: {
            itens: true,
            criadoPor: { select: { id: true, nome: true } },
          },
        },
      },
    })

    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

    // Requisitante só vê os próprios pedidos
    if (session.role === 'REQUISITANTE' && pedido.requisitanteId !== session.id) {
      return Response.json({ error: 'Não encontrado' }, { status: 404 })
    }

    // Restaurante só vê pedidos do seu restaurante
    if (session.role === 'RESTAURANTE' && pedido.restauranteId !== session.restauranteId) {
      return Response.json({ error: 'Não encontrado' }, { status: 404 })
    }

    // Gestor só vê pedidos do(s) contrato(s) vinculado(s)
    if (session.role === 'GESTOR') {
      const scope = await getGestorScope(session.contratoIds ?? [])
      const inScope =
        (pedido.restauranteId && scope.restauranteIds.includes(pedido.restauranteId)) ||
        (pedido.fazendaId && scope.fazendaIds.includes(pedido.fazendaId)) ||
        (pedido.turmaId && scope.turmaIds.includes(pedido.turmaId)) ||
        (pedido.requisitanteId && scope.requisitanteIds.includes(pedido.requisitanteId))
      if (!inScope) {
        return Response.json({ error: 'Não encontrado' }, { status: 404 })
      }
    }

    return Response.json(pedido)
  } catch (e: any) {
    return authError(e.message)
  }
}
