import { prisma } from '@/lib/prisma'
import { GerenciarRequisitantes } from './GerenciarRequisitantes'

export default async function RequisitantesPage() {
  const [requisitantes, fazendas, turmas, contratos] = await Promise.all([
    prisma.requisitante.findMany({
      orderBy: { nome: 'asc' },
      include: { fazenda: true, turma: true, contrato: true },
    }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.turma.findMany({ where: { ativo: true }, include: { fazenda: true }, orderBy: { nome: 'asc' } }),
    prisma.contrato.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Requisitantes</h1>
      <GerenciarRequisitantes
        initial={requisitantes as any}
        fazendas={fazendas}
        turmas={turmas as any}
        contratos={contratos}
      />
    </div>
  )
}
