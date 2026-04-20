'use client'

import { useState } from 'react'

const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

const TIPO_ORDEM: Record<string, number> = {
  CAFE_MANHA: 0,
  ALMOCO: 1,
  JANTAR: 2,
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  ENVIADO: 'Enviado',
  CONFIRMADO: 'Confirmado',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
}

interface Item {
  id: number
  tipoRefeicao: string
  quantidade: number
  observacao?: string | null
}

interface Pedido {
  id: number
  status: string
  dataRefeicao: string
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: { itens: Item[] }[]
}

interface Props {
  restaurante: { id: number; nome: string }
  pedidosIniciais: Pedido[]
  nomeUsuario: string
}

function localDateStr(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  return d.toISOString().split('T')[0]
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PainelRestaurante({ restaurante, pedidosIniciais, nomeUsuario }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais)
  const [data, setData] = useState(localDateStr(0))
  const [carregando, setCarregando] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS')

  async function buscarData(novaData: string) {
    setData(novaData)
    setCarregando(true)
    try {
      const res = await fetch(`/api/restaurante/pedidos?data=${novaData}`)
      const data = await res.json()
      setPedidos(Array.isArray(data) ? data : [])
    } catch {
      setPedidos([])
    } finally {
      setCarregando(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/login'
  }

  // Totais consolidados por tipo
  const totais: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0 }
  pedidos.forEach((p) => {
    p.versoes[0]?.itens.forEach((i) => {
      totais[i.tipoRefeicao] = (totais[i.tipoRefeicao] ?? 0) + i.quantidade
    })
  })
  const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0)

  // Filtro por tipo
  const pedidosFiltrados = pedidos.filter((p) => {
    if (tipoFiltro === 'TODOS') return true
    return p.versoes[0]?.itens.some((i) => i.tipoRefeicao === tipoFiltro)
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{restaurante.nome}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Olá, {nomeUsuario}</p>
        </div>
        <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600 mt-1">
          Sair
        </button>
      </div>

      {/* Seletor de data */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <span className="text-sm text-gray-500 shrink-0">Data:</span>
        <input
          type="date"
          value={data}
          onChange={(e) => buscarData(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex gap-1">
          <button
            onClick={() => buscarData(localDateStr(0))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${data === localDateStr(0) ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => buscarData(localDateStr(1))}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${data === localDateStr(1) ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Amanhã
          </button>
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { tipo: 'TODOS', label: 'Total', valor: totalGeral },
          { tipo: 'CAFE_MANHA', label: 'Café', valor: totais.CAFE_MANHA },
          { tipo: 'ALMOCO', label: 'Almoço', valor: totais.ALMOCO },
          { tipo: 'JANTAR', label: 'Jantar', valor: totais.JANTAR },
        ].map(({ tipo, label, valor }) => (
          <button
            key={tipo}
            onClick={() => setTipoFiltro(tipo)}
            className={`rounded-xl p-3 text-center transition-colors border ${
              tipoFiltro === tipo
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-gray-100 shadow-sm hover:bg-green-50'
            }`}
          >
            <div className={`text-2xl font-bold ${tipoFiltro === tipo ? 'text-white' : 'text-gray-800'}`}>{valor}</div>
            <div className={`text-xs mt-0.5 ${tipoFiltro === tipo ? 'text-green-100' : 'text-gray-400'}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {carregando ? 'Carregando...' : `${pedidosFiltrados.length} pedido${pedidosFiltrados.length !== 1 ? 's' : ''} — ${formatarData(data + 'T12:00:00Z')}`}
        </p>

        {!carregando && pedidosFiltrados.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhum pedido para esta data</p>
          </div>
        )}

        {pedidosFiltrados.map((pedido) => {
          const itens = (pedido.versoes[0]?.itens ?? [])
            .filter((i) => tipoFiltro === 'TODOS' || i.tipoRefeicao === tipoFiltro)
            .sort((a, b) => (TIPO_ORDEM[a.tipoRefeicao] ?? 0) - (TIPO_ORDEM[b.tipoRefeicao] ?? 0))

          const total = itens.reduce((s, i) => s + i.quantidade, 0)

          return (
            <div key={pedido.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{pedido.fazenda.nome}</p>
                  <p className="text-xs text-gray-400">{pedido.turma.nome} · {pedido.requisitante.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                    {total} ref.
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pedido.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[pedido.status] ?? pedido.status}
                  </span>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-1.5">
                {itens.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{TIPO_LABELS[item.tipoRefeicao]}</span>
                      <span className="font-semibold text-gray-800">{item.quantidade}</span>
                    </div>
                    {item.observacao && (
                      <p className="text-xs text-gray-400 italic ml-1">↳ {item.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
