import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminDashboard() {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  const [
    totalPedidosHoje,
    totalPedidosAbertos,
    totalRestaurantes,
    totalFazendas,
    totalTurmas,
    totalRequisitantes,
    pedidosRecentes,
  ] = await Promise.all([
    prisma.pedido.count({ where: { criadoEm: { gte: hoje, lt: amanha } } }),
    prisma.pedido.count({ where: { status: { in: ['ABERTO', 'ENVIADO'] } } }),
    prisma.restaurante.count({ where: { ativo: true } }),
    prisma.fazenda.count({ where: { ativo: true } }),
    prisma.turma.count({ where: { ativo: true } }),
    prisma.requisitante.count({ where: { ativo: true } }),
    prisma.pedido.findMany({
      take: 10,
      orderBy: { criadoEm: 'desc' },
      include: {
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
    }),
  ])

  const STATUS_COLORS: Record<string, string> = {
    ABERTO: 'bg-yellow-100 text-yellow-800',
    ENVIADO: 'bg-blue-100 text-blue-800',
    CONFIRMADO: 'bg-green-100 text-green-800',
    CANCELADO: 'bg-red-100 text-red-800',
  }
  const STATUS_LABELS: Record<string, string> = {
    ABERTO: 'Aberto',
    ENVIADO: 'Enviado',
    CONFIRMADO: 'Confirmado',
    CANCELADO: 'Cancelado',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-green-600">{totalPedidosHoje}</div>
          <div className="text-sm text-gray-500 mt-1">Pedidos hoje</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-yellow-600">{totalPedidosAbertos}</div>
          <div className="text-sm text-gray-500 mt-1">Em aberto</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-blue-600">{totalRestaurantes}</div>
          <div className="text-sm text-gray-500 mt-1">Restaurantes</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="text-3xl font-bold text-purple-600">{totalRequisitantes}</div>
          <div className="text-sm text-gray-500 mt-1">Requisitantes</div>
        </div>
      </div>

      {/* Links rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/admin/restaurantes', label: 'Restaurantes', emoji: '🍴', count: totalRestaurantes },
          { href: '/admin/fazendas', label: 'Fazendas', emoji: '🏭', count: totalFazendas },
          { href: '/admin/turmas', label: 'Turmas', emoji: '👥', count: totalTurmas },
          { href: '/admin/requisitantes', label: 'Requisitantes', emoji: '👤', count: totalRequisitantes },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border rounded-xl p-3 hover:shadow-md transition-shadow text-center"
          >
            <div className="text-2xl">{item.emoji}</div>
            <div className="text-sm font-medium text-gray-700 mt-1">{item.label}</div>
            <div className="text-xs text-gray-400">{item.count} ativos</div>
          </Link>
        ))}
      </div>

      {/* Pedidos recentes */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Pedidos Recentes</h2>
          <Link href="/admin/pedidos" className="text-sm text-green-600 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Restaurante</th>
                <th className="px-4 py-2 text-left">Fazenda / Turma</th>
                <th className="px-4 py-2 text-left">Requisitante</th>
                <th className="px-4 py-2 text-right">Qtd</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Versão</th>
              </tr>
            </thead>
            <tbody>
              {pedidosRecentes.map((p) => {
                const versao = p.versoes[0]
                const total = versao?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
                return (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link href={`/pedidos/${p.id}`} className="text-green-600 hover:underline">
                        #{p.id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{p.restaurante.nome}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {p.fazenda.nome} / {p.turma.nome}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
                    <td className="px-4 py-2 text-right">{total}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">V{p.versaoAtual}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {pedidosRecentes.length === 0 && (
            <p className="text-center text-gray-400 py-8">Nenhum pedido ainda</p>
          )}
        </div>
      </div>
    </div>
  )
}
