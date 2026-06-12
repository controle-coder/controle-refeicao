import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'

export async function PATCH(_request: NextRequest, ctx: RouteContext<'/api/pedidos/[id]/reverter-cancelamento'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (pedido.status !== 'CANCELADO') {
      return Response.json({ error: 'Pedido não está cancelado' }, { status: 400 })
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: {
        status: 'ABERTO',
        canceladoPorId: null,
        motivoCancelamento: null,
      },
      include: {
        restaurante: { select: { id: true, nome: true } },
        fazenda: { select: { id: true, nome: true } },
        turma: { select: { id: true, nome: true } },
        requisitante: { select: { id: true, nome: true } },
        canceladoPor: { select: { id: true, nome: true } },
        versoes: {
          include: {
            itens: true,
            criadoPor: { select: { id: true, nome: true } },
          },
          orderBy: { numero: 'asc' },
        },
      },
    })

    return Response.json(atualizado)
  } catch (e: unknown) {
    return authError((e as Error).message)
  }
}
