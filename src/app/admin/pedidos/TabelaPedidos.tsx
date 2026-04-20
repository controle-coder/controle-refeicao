'use client'

import { useState } from 'react'

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  ENVIADO: 'Enviado',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
}
const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}
const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

interface Item {
  id: number
  tipoRefeicao: string
  quantidade: number
}

interface Pedido {
  id: number
  status: string
  versaoAtual: number
  criadoEm: Date | string
  restaurante: { nome: string }
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: {
    id: number
    numero: number
    observacao?: string | null
    itens: Item[]
  }[]
}

export function TabelaPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)

  const versaoAtual = selecionado
    ? selecionado.versoes.find((v) => v.numero === selecionado.versaoAtual)
    : null

  const total = versaoAtual?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0

  return (
    <>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Data</th>
            <th className="px-4 py-3 text-left">Restaurante</th>
            <th className="px-4 py-3 text-left">Fazenda / Turma</th>
            <th className="px-4 py-3 text-left">Requisitante</th>
            <th className="px-4 py-3 text-right">Qtd</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => {
            const v = p.versoes[0]
            const total = v?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
            return (
              <tr
                key={p.id}
                className="border-t hover:bg-green-50 cursor-pointer transition-colors"
                onClick={() => setSelecionado(p)}
              >
                <td className="px-4 py-2 text-gray-500">#{p.id}</td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                  {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2 text-gray-800">{p.restaurante.nome}</td>
                <td className="px-4 py-2 text-gray-500">
                  {p.fazenda.nome} / {p.turma.nome}
                </td>
                <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
                <td className="px-4 py-2 text-right text-gray-800">{total}</td>
                <td className="px-4 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}
                  >
                    {STATUS_LABELS[p.status]}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {pedidos.length === 0 && (
        <p className="text-center text-gray-400 py-8">Nenhum pedido</p>
      )}

      {/* Modal de detalhes */}
      {selecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelecionado(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Pedido #{selecionado.id}
                </h2>
                <p className="text-xs text-gray-400">
                  {new Date(selecionado.criadoEm).toLocaleDateString('pt-BR')} · V
                  {selecionado.versaoAtual}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[selecionado.status]}`}
              >
                {STATUS_LABELS[selecionado.status]}
              </span>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">Restaurante</span>
              <span className="font-medium text-gray-800">{selecionado.restaurante.nome}</span>
              <span className="text-gray-500">Fazenda</span>
              <span className="font-medium text-gray-800">{selecionado.fazenda.nome}</span>
              <span className="text-gray-500">Turma</span>
              <span className="font-medium text-gray-800">{selecionado.turma.nome}</span>
              <span className="text-gray-500">Requisitante</span>
              <span className="font-medium text-gray-800">{selecionado.requisitante.nome}</span>
            </div>

            {/* Refeições */}
            {versaoAtual && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Refeições · {total} no total
                </p>
                <div className="space-y-2">
                  {versaoAtual.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {TIPO_LABELS[item.tipoRefeicao]}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {item.quantidade}
                      </span>
                    </div>
                  ))}
                </div>
                {versaoAtual.observacao && (
                  <p className="text-xs text-gray-500 italic mt-2">
                    Obs: {versaoAtual.observacao}
                  </p>
                )}
              </div>
            )}

            {/* Fechar */}
            <button
              onClick={() => setSelecionado(null)}
              className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
