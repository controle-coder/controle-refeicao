import { prisma } from '@/lib/prisma'
import { GerenciarTurmas } from './GerenciarTurmas'

export default async function TurmasPage() {
  const [turmas, fazendas] = await Promise.all([
    prisma.turma.findMany({ orderBy: { nome: 'asc' }, include: { fazenda: true } }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Turmas</h1>
      <GerenciarTurmas initial={turmas as any} fazendas={fazendas} />
    </div>
  )
}
