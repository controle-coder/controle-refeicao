export const dynamic = "force-dynamic";
import { prisma } from '@/lib/prisma'
import { FormularioPedido } from '@/components/pedido/FormularioPedido'

export default async function NovoPedidoPage() {
  const [restaurantes, fazendas, turmas, requisitantes] = await Promise.all([
    prisma.restaurante.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.turma.findMany({ where: { ativo: true }, include: { fazenda: true }, orderBy: { nome: 'asc' } }),
    prisma.requisitante.findMany({
      where: { ativo: true, role: 'REQUISITANTE' },
      include: {
        fazenda: true,
        turma: true,
        contrato: {
          include: {
            fazendas: { select: { id: true } },
            restaurantes: { select: { id: true } },
            turmas: { select: { id: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    }),
  ])

  // Key única por render: força React a remontar o formulário a cada
  // navegação para esta página, descartando estado anterior do cache de rota.
  const pageKey = Date.now()

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-xl font-bold text-gray-800">Novo Pedido</h1>
      <FormularioPedido
        key={pageKey}
        restaurantes={restaurantes}
        fazendas={fazendas}
        turmas={turmas as any}
        requisitantes={requisitantes as any}
      />
    </div>
  )
}
