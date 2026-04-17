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
      include: { fazenda: true, turma: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  return (
    <div className="space-y-4 mt-2">
      <h1 className="text-xl font-bold text-gray-800">Novo Pedido</h1>
      <FormularioPedido
        restaurantes={restaurantes}
        fazendas={fazendas}
        turmas={turmas as any}
        requisitantes={requisitantes as any}
      />
    </div>
  )
}
