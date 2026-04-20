import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PainelRestaurante } from './PainelRestaurante'

export default async function RestaurantePage() {
  const session = await getSession()

  if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
    redirect('/login')
  }

  const restaurante = await prisma.restaurante.findUnique({
    where: { id: session.restauranteId },
    select: { id: true, nome: true },
  })

  if (!restaurante) redirect('/login')

  // Pedidos de hoje
  const hoje = new Date()
  const inicioDia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0))
  const fimDia    = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 23, 59, 59, 999))

  const pedidos = await prisma.pedido.findMany({
    where: {
      restauranteId: restaurante.id,
      dataRefeicao: { gte: inicioDia, lte: fimDia },
      status: { not: 'CANCELADO' },
    },
    include: {
      fazenda: { select: { nome: true } },
      turma: { select: { nome: true } },
      requisitante: { select: { nome: true } },
      versoes: {
        orderBy: { numero: 'desc' },
        take: 1,
        include: { itens: true },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <PainelRestaurante
        restaurante={restaurante}
        pedidosIniciais={pedidos as any}
        nomeUsuario={session.nome}
      />
    </div>
  )
}
