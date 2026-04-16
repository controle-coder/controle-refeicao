import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = { ABERTO: 'Aberto', ENVIADO: 'Enviado', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado' }
const STATUS_COLORS: Record<string, string> = { ABERTO: 'bg-yellow-100 text-yellow-800', ENVIADO: 'bg-blue-100 text-blue-800', CONFIRMADO: 'bg-green-100 text-green-800', CANCELADO: 'bg-red-100 text-red-800' }

export default async function AdminPedidosPage() {
  const pedidos = await prisma.pedido.findMany({
    orderBy: { criadoEm: 'desc' },
    take: 100,
    include: {
      restaurante: true,
      fazenda: true,
      turma: true,
      requisitante: { select: { nome: true } },
      versoes: { orderBy: { numero: 'desc' }, take: 1, include: { itens: true } },
    },
  })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Todos os Pedidos</h1>
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Restaurante</th>
              <th className="px-4 py-3 text-left">Fazenda / Turma</th>
              <th className="px-4 py-3 text-left">Requisitante</th>
              <th className="px-4 py-3 text-right">Qtd</th>
              <th className="px-4 py-3 text-center">Ver</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const v = p.versoes[0]
              const total = v?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
              return (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-500">#{p.id}</td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2 text-gray-800">{p.restaurante.nome}</td>
                  <td className="px-4 py-2 text-gray-500">{p.fazenda.nome} / {p.turma.nome}</td>
                  <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
                  <td className="px-4 py-2 text-right text-gray-800">{total}</td>
                  <td className="px-4 py-2 text-center">
                    <Link href={`/pedidos/${p.id}`} className="text-green-600 hover:underline text-xs">V{p.versaoAtual}</Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {pedidos.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum pedido</p>}
      </div>
    </div>
  )
}
