export const dynamic = "force-dynamic";

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FormularioPedido } from '@/components/pedido/FormularioPedido'

export default async function NovoPedidoPage() {
  const session = await getSession()
  if (!session.id || (session.role !== 'REQUISITANTE' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const [req, restaurantes, fazendas, turmas] = await Promise.all([
    prisma.requisitante.findUnique({
      where: { id: session.id },
      include: {
        fazenda: true,
        turma: true,
        contratos: {
          include: {
            fazendas:     { select: { id: true } },
            restaurantes: { select: { id: true } },
            turmas:       { select: { id: true } },
          },
        },
      },
    }),
    prisma.restaurante.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.fazenda.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    prisma.turma.findMany({ where: { ativo: true }, include: { fazenda: true }, orderBy: { nome: 'asc' } }),
  ])

  if (!req) redirect('/login')

  const requisitantes = [req]
  const usuarioLogado = { id: req.id, nome: req.nome, fazendaId: req.fazendaId, turmaId: req.turmaId }

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
        usuarioLogado={usuarioLogado}
      />
    </div>
  )
}
