import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { DetalhePedido } from '@/components/pedido/DetalhePedido'

export default async function DetalhePedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  return (
    <div className="mt-2">
      <DetalhePedido pedido={pedido as any} sessaoId={pedido.requisitanteId ?? null} sessaoRole="REQUISITANTE" />
    </div>
  )
}
