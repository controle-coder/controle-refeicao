export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { requireAuth, getGestorScope } from '@/lib/auth'
import { RelatorioCliente } from '@/app/admin/relatorios/RelatorioCliente'

export default async function GestorRelatoriosPage() {
  const session = await requireAuth()

  // Gestor: filtra entidades pelo(s) contrato(s) vinculado(s)
  const isGestor = session.role === 'GESTOR'
  const scope = isGestor ? await getGestorScope(session.contratoIds ?? []) : null
  const contratoFilter = isGestor ? { id: { in: session.contratoIds ?? [] } } : {}

  const [restaurantes, fazendas, turmas, contratos, requisitantes] = await Promise.all([
    prisma.restaurante.findMany({
      where: { ativo: true, ...(scope ? { id: { in: scope.restauranteIds } } : {}) },
      orderBy: { nome: 'asc' },
    }),
    prisma.fazenda.findMany({
      where: { ativo: true, ...(scope ? { id: { in: scope.fazendaIds } } : {}) },
      orderBy: { nome: 'asc' },
      include: { turmas: { where: { ativo: true }, select: { id: true } } },
    }),
    prisma.turma.findMany({
      where: { ativo: true, ...(scope ? { id: { in: scope.turmaIds } } : {}) },
      include: { fazenda: true },
      orderBy: { nome: 'asc' },
    }),
    prisma.contrato.findMany({
      where: { ativo: true, ...contratoFilter },
      orderBy: { nome: 'asc' },
      include: {
        fazendas:      { where: { ativo: true }, select: { id: true } },
        turmas:        { where: { ativo: true }, select: { id: true } },
        restaurantes:  { where: { ativo: true }, select: { id: true } },
        requisitantes: { where: { ativo: true }, select: { id: true } },
      },
    }),
    prisma.requisitante.findMany({
      where: { ativo: true, role: 'REQUISITANTE', ...(scope ? { id: { in: scope.requisitanteIds } } : {}) },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, fazendaId: true, turmaId: true },
    }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
      <RelatorioCliente
        restaurantes={restaurantes}
        fazendas={fazendas as any}
        turmas={turmas as any}
        contratos={contratos as any}
        requisitantes={requisitantes}
      />
    </div>
  )
}
