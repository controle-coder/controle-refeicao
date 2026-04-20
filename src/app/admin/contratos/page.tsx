import { prisma } from '@/lib/prisma'
import { GerenciarContratos } from './GerenciarContratos'

export default async function ContratosPage() {
  const [contratos, fazendas, restaurantes, turmas] = await Promise.all([
    prisma.contrato.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { requisitantes: true } },
        fazendas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
        restaurantes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
        turmas: { select: { id: true, nome: true, fazendaId: true }, orderBy: { nome: 'asc' } },
      },
    }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.restaurante.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.turma.findMany({ where: { ativo: true }, include: { fazenda: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Contratos</h1>
      <GerenciarContratos
        initial={contratos as any}
        fazendas={fazendas}
        restaurantes={restaurantes}
        turmas={turmas as any}
      />
    </div>
  )
}
