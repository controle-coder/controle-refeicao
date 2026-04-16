import { prisma } from '@/lib/prisma'
import { RelatorioCliente } from './RelatorioCliente'

export default async function RelatoriosPage() {
  const [restaurantes, fazendas, turmas] = await Promise.all([
    prisma.restaurante.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.turma.findMany({ where: { ativo: true }, include: { fazenda: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
      <RelatorioCliente restaurantes={restaurantes} fazendas={fazendas} turmas={turmas as any} />
    </div>
  )
}
