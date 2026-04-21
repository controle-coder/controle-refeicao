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

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
  atualizadoEm: string
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: { itens: Item[] }[]
}

interface DiaSemana {
  data: string
  cafe: number
  almoco: number
  jantar: number
}

interface Props {
  restaurante: { id: number; nome: string; linkGrupoWhatsApp?: string | null }
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

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function PainelRestaurante({ restaurante, pedidosIniciais, nomeUsuario }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais)
  const [data, setData] = useState(localDateStr(0))
  const [carregando, setCarregando] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS')
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [semana, setSemana] = useState<DiaSemana[] | null>(null)
  const [carregandoSemana, setCarregandoSemana] = useState(false)
  const [mostrarSemana, setMostrarSemana] = useState(false)

  async function buscarData(novaData: string) {
    setData(novaData)
    setCarregando(true)
    try {
      const res = await fetch(`/api/restaurante/pedidos?data=${novaData}`)
      const json = await res.json()
      setPedidos(Array.isArray(json) ? json : [])
    } catch {
      setPedidos([])
    } finally {
      setCarregando(false)
    }
  }

  async function toggleSemana() {
    if (mostrarSemana) {
      setMostrarSemana(false)
      return
    }
    setMostrarSemana(true)
    if (semana !== null) return
    setCarregandoSemana(true)
    try {
      const res = await fetch('/api/restaurante/semana')
      const json = await res.json()
      setSemana(Array.isArray(json) ? json : [])
    } catch {
      setSemana([])
    } finally {
      setCarregandoSemana(false)
    }
  }

  async function confirmar(id: number) {
    setConfirmando(id)
    try {
      const res = await fetch(`/api/restaurante/pedidos/${id}/confirmar`, { method: 'PATCH' })
      if (res.ok) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'CONFIRMADO' } : p))
        )
      }
    } finally {
      setConfirmando(null)
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

  const confirmados = pedidos.filter((p) => p.status === 'CONFIRMADO').length
  const pendentes = pedidos.length - confirmados

  const pedidosFiltrados = pedidos.filter((p) => {
    if (tipoFiltro === 'TODOS') return true
    return p.versoes[0]?.itens.some((i) => i.tipoRefeicao === tipoFiltro)
  })

  return (
    <>
      {/* Cabeçalho apenas na impressão */}
      <div className="hidden print:block p-4 border-b mb-4">
        <h1 className="text-lg font-bold">{restaurante.nome}</h1>
        <p className="text-sm text-gray-600">Pedidos para {formatarData(data + 'T12:00:00Z')}</p>
        <div className="flex gap-6 mt-1 text-sm">
          <span>Total: <strong>{totalGeral}</strong></span>
          <span>Café: <strong>{totais.CAFE_MANHA}</strong></span>
          <span>Almoço: <strong>{totais.ALMOCO}</strong></span>
          <span>Jantar: <strong>{totais.JANTAR}</strong></span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 print:py-0 print:px-2">

        {/* Header */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{restaurante.nome}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Olá, {nomeUsuario}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {restaurante.linkGrupoWhatsApp && (
              <a
                href={restaurante.linkGrupoWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
              Sair
            </button>
          </div>
        </div>

        {/* Seletor de data */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 print:hidden">
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
            <button
              onClick={toggleSemana}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mostrarSemana ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Semana
            </button>
          </div>
        </div>

        {/* Vista da semana */}
        {mostrarSemana && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 print:hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Próximos 7 dias</h2>
            {carregandoSemana ? (
              <p className="text-xs text-gray-400 text-center py-4">Carregando...</p>
            ) : semana && semana.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-medium">Data</th>
                    <th className="text-center pb-2 font-medium">Café</th>
                    <th className="text-center pb-2 font-medium">Almoço</th>
                    <th className="text-center pb-2 font-medium">Jantar</th>
                    <th className="text-center pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {semana.map((dia) => {
                    const d = new Date(dia.data + 'T12:00:00Z')
                    const nomeDia = DIAS_SEMANA[d.getUTCDay()]
                    const total = dia.cafe + dia.almoco + dia.jantar
                    const isHoje = dia.data === localDateStr(0)
                    return (
                      <tr key={dia.data} className={isHoje ? 'font-semibold' : ''}>
                        <td className="py-2 text-gray-700">
                          <span className={`mr-1 ${isHoje ? 'text-green-600' : 'text-gray-400'}`}>{nomeDia}</span>
                          {formatarData(dia.data + 'T12:00:00Z')}
                          {isHoje && <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded">hoje</span>}
                        </td>
                        <td className="text-center py-2 text-gray-600">{dia.cafe || '—'}</td>
                        <td className="text-center py-2 text-gray-600">{dia.almoco || '—'}</td>
                        <td className="text-center py-2 text-gray-600">{dia.jantar || '—'}</td>
                        <td className="text-center py-2 font-bold text-gray-800">{total || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum pedido nos próximos 7 dias</p>
            )}
          </div>
        )}

        {/* Totais por tipo */}
        <div className="grid grid-cols-4 gap-2 print:hidden">
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

        {/* Status de confirmação + botão imprimir */}
        <div className="flex items-center gap-3 print:hidden">
          {pedidos.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-bold">{confirmados}</span>
                <span className="text-xs">confirmado{confirmados !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-bold">{pendentes}</span>
                <span className="text-xs">pendente{pendentes !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir
          </button>
        </div>

        {/* Lista de pedidos */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide print:hidden">
            {carregando ? 'Carregando...' : `${pedidosFiltrados.length} pedido${pedidosFiltrados.length !== 1 ? 's' : ''} — ${formatarData(data + 'T12:00:00Z')}`}
          </p>

          {!carregando && pedidosFiltrados.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center print:hidden">
              <p className="text-gray-400 text-sm">Nenhum pedido para esta data</p>
            </div>
          )}

          {pedidosFiltrados.map((pedido) => {
            const itens = (pedido.versoes[0]?.itens ?? [])
              .filter((i) => tipoFiltro === 'TODOS' || i.tipoRefeicao === tipoFiltro)
              .sort((a, b) => (TIPO_ORDEM[a.tipoRefeicao] ?? 0) - (TIPO_ORDEM[b.tipoRefeicao] ?? 0))

            const total = itens.reduce((s, i) => s + i.quantidade, 0)
            const isConfirmado = pedido.status === 'CONFIRMADO'

            return (
              <div
                key={pedido.id}
                className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 transition-colors print:border print:shadow-none print:rounded-none print:border-x-0 print:border-t-0 ${isConfirmado ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{pedido.fazenda.nome}</p>
                    <p className="text-xs text-gray-400">
                      {pedido.turma.nome} · {pedido.requisitante.nome}
                      <span className="ml-1.5 text-gray-300">·</span>
                      <span className="ml-1.5">{formatarHora(pedido.atualizadoEm)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                      {total} ref.
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full print:hidden ${STATUS_COLORS[pedido.status] ?? 'bg-gray-100 text-gray-600'}`}>
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

                {/* Botão confirmar */}
                {!isConfirmado && (
                  <button
                    onClick={() => confirmar(pedido.id)}
                    disabled={confirmando === pedido.id}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold py-2 rounded-lg transition-colors print:hidden"
                  >
                    {confirmando === pedido.id ? 'Confirmando...' : '✓ Confirmar Recebimento'}
                  </button>
                )}

                {isConfirmado && (
                  <p className="text-center text-xs text-green-600 font-medium py-1 print:hidden">✓ Recebimento confirmado</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
