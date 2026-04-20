import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { TabelaPedidos } from './TabelaPedidos'

export default async function AdminPedidosPage() {
  const session = await requireAdmin()

  const pedidos = await prisma.pedido.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 100,
    include: {
      restaurante: true,
      fazenda: true,
      turma: true,
      requisitante: { select: { nome: true } },
      canceladoPor: { select: { nome: true } },
      versoes: { orderBy: { numero: 'desc' }, take: 1, include: { itens: true } },
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Todos os Pedidos</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <TabelaPedidos
          pedidos={pedidos as any}
          adminId={session.id}
          adminNome={session.nome}
        />
      </div>
    </div>
  )
}
