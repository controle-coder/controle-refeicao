export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireAuth, getGestorScope } from '@/lib/auth'
import { TabelaPedidos } from '@/app/admin/pedidos/TabelaPedidos'

export default async function GestorPedidosPage() {
  const session = await requireAuth()

  // Gestor só vê pedidos vinculados ao(s) contrato(s) dele
  const where: Record<string, unknown> = {}
  if (session.role === 'GESTOR') {
    const scope = await getGestorScope(session.contratoIds ?? [])
    where.OR = [
      { restauranteId: { in: scope.restauranteIds } },
      { fazendaId: { in: scope.fazendaIds } },
      { turmaId: { in: scope.turmaIds } },
      { requisitanteId: { in: scope.requisitanteIds } },
    ]
  }

  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { criadoEm: 'desc' },
    take: 100,
    include: {
      restaurante: true,
      fazenda: true,
      turma: true,
      requisitante: { select: { nome: true } },
      canceladoPor: { select: { nome: true } },
      versoes: {
        orderBy: { numero: 'asc' },
        include: { itens: true, criadoPor: { select: { id: true, nome: true } } },
      },
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Pedidos</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <TabelaPedidos
          pedidos={pedidos as any}
          adminId={session.id}
          adminNome={session.nome}
          readonly
        />
      </div>
    </div>
  )
}
