import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { DetalhePedido } from '@/components/pedido/DetalhePedido'

export default async function DetalhePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session.id || (session.role !== 'REQUISITANTE' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const { id } = await params

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

  if (!pedido) notFound()

  // Requisitante só pode ver os próprios pedidos; admin vê qualquer um
  if (session.role === 'REQUISITANTE' && pedido.requisitanteId !== session.id) notFound()

  return (
    <div className="mt-2">
      <DetalhePedido pedido={pedido as any} sessaoId={session.id} sessaoRole={session.role} />
    </div>
  )
}
