'use client'

import { useState, useMemo } from 'react'

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
  ALMOCO_SELF: 'Almoço Self Service',
  JANTAR_SELF: 'Jantar Self Service',
}
const TIPO_EMOJI: Record<string, string> = {
  CAFE_MANHA: '☕',
  ALMOCO: '🍽️',
  JANTAR: '🌙',
  ALMOCO_SELF: '🍴',
  JANTAR_SELF: '🍴',
}
const TIPOS = ['CAFE_MANHA', 'ALMOCO', 'JANTAR', 'ALMOCO_SELF', 'JANTAR_SELF'] as const

interface Item {
  id: number
  tipoRefeicao: string
  quantidade: number
}

interface Versao {
  id: number
  numero: number
  observacao?: string | null
  criadoEm: Date | string
  criadoPor: { id: number; nome: string } | null
  itens: Item[]
}

interface Pedido {
  id: number
  status: string
  versaoAtual: number
  criadoEm: Date | string
  dataRefeicao?: Date | string
  restaurante: { nome: string }
  fazenda: { nome: string } | null
  turma: { nome: string } | null
  requisitante: { nome: string } | null
  nomeVisitante?: string | null
  sobrenomeVisitante?: string | null
  canceladoPor?: { nome: string } | null
  motivoCancelamento?: string | null
  versoes: Versao[]
}

function nomeRequisitantePedido(p: Pedido): string {
  if (p.requisitante) return p.requisitante.nome
  return [p.nomeVisitante, p.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante'
}

interface Props {
  pedidos: Pedido[]
  adminId: number
  adminNome: string
  readonly?: boolean
}

type Modal = 'detalhe' | 'cancelar' | 'editar'

const POR_PAGINA = 25

export function TabelaPedidos({ pedidos, adminId, adminNome, readonly = false }: Props) {
  const [lista, setLista] = useState<Pedido[]>(pedidos)
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [modal, setModal] = useState<Modal>('detalhe')

  // filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroDataDe, setFiltroDataDe] = useState('')
  const [filtroDataAte, setFiltroDataAte] = useState('')
  const [pagina, setPagina] = useState(1)

  // cancelar
  const [motivo, setMotivo] = useState('')

  // editar
  const [qtds, setQtds] = useState<Record<string, number>>({ CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 })
  const [novaData, setNovaData] = useState('')
  const [motivoEdicao, setMotivoEdicao] = useState('')
  const [historicoAberto, setHistoricoAberto] = useState(false)

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const filtrados = useMemo(() => {
    let resultado = lista

    if (filtroStatus) {
      resultado = resultado.filter((p) => p.status === filtroStatus)
    }

    if (filtroDataDe) {
      const de = new Date(filtroDataDe + 'T00:00:00Z')
      resultado = resultado.filter((p) => {
        const d = new Date(p.dataRefeicao ?? p.criadoEm)
        return d >= de
      })
    }

    if (filtroDataAte) {
      const ate = new Date(filtroDataAte + 'T23:59:59Z')
      resultado = resultado.filter((p) => {
        const d = new Date(p.dataRefeicao ?? p.criadoEm)
        return d <= ate
      })
    }

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      resultado = resultado.filter((p) => {
        const id = `#${p.id}`
        const restaurante = p.restaurante.nome.toLowerCase()
        const fazenda = p.fazenda?.nome?.toLowerCase() ?? ''
        const turma = p.turma?.nome?.toLowerCase() ?? ''
        const req = nomeRequisitantePedido(p).toLowerCase()
        return (
          id.includes(termo) ||
          restaurante.includes(termo) ||
          fazenda.includes(termo) ||
          turma.includes(termo) ||
          req.includes(termo)
        )
      })
    }

    return resultado
  }, [lista, busca, filtroStatus, filtroDataDe, filtroDataAte])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginados = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  function mudaFiltro() {
    setPagina(1)
  }

  const versaoAtual = selecionado
    ? selecionado.versoes.find((v) => v.numero === selecionado.versaoAtual)
    : null
  const total = versaoAtual?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0

  function abrirModal(p: Pedido) {
    setSelecionado(p)
    setModal('detalhe')
    setMotivo('')
    setMotivoEdicao('')
    setErro('')
    setHistoricoAberto(false)
  }

  function fechar() {
    setSelecionado(null)
    setMotivo('')
    setMotivoEdicao('')
    setErro('')
    setHistoricoAberto(false)
  }

  function toInputDate(d: Date | string | undefined): string {
    if (!d) return ''
    const dt = new Date(d)
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function abrirEditar() {
    if (!versaoAtual) return
    const mapa: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
    for (const item of versaoAtual.itens) mapa[item.tipoRefeicao] = item.quantidade
    setQtds(mapa)
    setNovaData(toInputDate(selecionado?.dataRefeicao))
    setMotivoEdicao('')
    setErro('')
    setModal('editar')
  }

  async function salvarEdicao() {
    if (!selecionado) return
    if (motivoEdicao.trim().length < 5) {
      setErro('Informe o motivo da edição (mínimo 5 caracteres)')
      return
    }
    const algumPositivo = TIPOS.some((t) => qtds[t] > 0)
    if (!algumPositivo) {
      setErro('Informe pelo menos uma refeição com quantidade maior que zero')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/admin/pedidos/${selecionado.id}/editar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: TIPOS.map((t) => ({ tipoRefeicao: t, quantidade: qtds[t] })),
          motivo: motivoEdicao.trim(),
          ...(novaData ? { dataRefeicao: novaData } : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao editar'); return }
      setLista((prev) => prev.map((p) => (p.id === selecionado.id ? data : p)))
      setSelecionado(data)
      setModal('detalhe')
      setHistoricoAberto(true)
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  async function reverterCancelamento() {
    if (!selecionado) return
    if (!confirm('Deseja reverter o cancelamento deste pedido? Ele voltará ao status ABERTO.')) return
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/pedidos/${selecionado.id}/reverter-cancelamento`, {
        method: 'PATCH',
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao reverter'); return }
      setLista((prev) => prev.map((p) => (p.id === selecionado.id ? data : p)))
      setSelecionado(data)
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  async function confirmarCancelamento() {
    if (!selecionado) return
    if (motivo.trim().length < 5) {
      setErro('Informe o motivo (mínimo 5 caracteres)')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/pedidos/${selecionado.id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: motivo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao cancelar'); return }
      setLista((prev) =>
        prev.map((p) =>
          p.id === selecionado.id
            ? { ...p, status: 'CANCELADO', canceladoPor: { nome: adminNome }, motivoCancelamento: motivo.trim() }
            : p
        )
      )
      fechar()
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      {/* ── Filtros ── */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); mudaFiltro() }}
            placeholder="Buscar por #, restaurante, fazenda, turma, requisitante..."
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={filtroStatus}
            onChange={(e) => { setFiltroStatus(e.target.value); mudaFiltro() }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos os status</option>
            <option value="ABERTO">Aberto</option>
            <option value="ENVIADO">Enviado</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">Data refeicao:</span>
          <input
            type="date"
            value={filtroDataDe}
            onChange={(e) => { setFiltroDataDe(e.target.value); mudaFiltro() }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-gray-400">ate</span>
          <input
            type="date"
            value={filtroDataAte}
            onChange={(e) => { setFiltroDataAte(e.target.value); mudaFiltro() }}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {(busca || filtroStatus || filtroDataDe || filtroDataAte) && (
            <button
              onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroDataDe(''); setFiltroDataAte(''); mudaFiltro() }}
              className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
            >
              Limpar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

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
          {paginados.map((p) => {
            const vAtual = p.versoes.find((v) => v.numero === p.versaoAtual) ?? p.versoes[p.versoes.length - 1]
            const totalItens = vAtual?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
            return (
              <tr
                key={p.id}
                className="border-t hover:bg-green-50 cursor-pointer transition-colors"
                onClick={() => abrirModal(p)}
              >
                <td className="px-4 py-2 text-gray-500">#{p.id}</td>
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                  {new Date(p.criadoEm).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-2 text-gray-800">{p.restaurante.nome}</td>
                <td className="px-4 py-2 text-gray-500">{p.fazenda?.nome ?? '—'} / {p.turma?.nome ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{nomeRequisitantePedido(p)}</td>
                <td className="px-4 py-2 text-right text-gray-800">{totalItens}</td>
                <td className="px-4 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                    {p.versaoAtual > 1 && <span className="ml-1 opacity-60">V{p.versaoAtual}</span>}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {paginados.length === 0 && (
        <p className="text-center text-gray-400 py-8">
          {lista.length === 0 ? 'Nenhum pedido' : 'Nenhum pedido encontrado com os filtros aplicados'}
        </p>
      )}

      {/* ── Paginação ── */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina(1)}
              disabled={paginaAtual <= 1}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &laquo;
            </button>
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &lsaquo;
            </button>
            <span className="px-3 py-1 text-xs font-medium text-gray-700">
              {paginaAtual} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setPagina(totalPaginas)}
              disabled={paginaAtual >= totalPaginas}
              className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}

      {/* ── Modal detalhe ── */}
      {selecionado && modal === 'detalhe' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={fechar}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Pedido #{selecionado.id}</h2>
                <p className="text-xs text-gray-400">
                  {new Date(selecionado.criadoEm).toLocaleDateString('pt-BR')} · V{selecionado.versaoAtual}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[selecionado.status]}`}>
                {STATUS_LABELS[selecionado.status]}
              </span>
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {selecionado.dataRefeicao && (
                <>
                  <span className="text-gray-500">Data das refeições</span>
                  <span className="font-medium text-gray-800">
                    {new Date(selecionado.dataRefeicao).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                </>
              )}
              <span className="text-gray-500">Restaurante</span>
              <span className="font-medium text-gray-800">{selecionado.restaurante.nome}</span>
              <span className="text-gray-500">Fazenda</span>
              <span className="font-medium text-gray-800">{selecionado.fazenda?.nome ?? '—'}</span>
              <span className="text-gray-500">Turma</span>
              <span className="font-medium text-gray-800">{selecionado.turma?.nome ?? '—'}</span>
              <span className="text-gray-500">Requisitante</span>
              <span className="font-medium text-gray-800">{nomeRequisitantePedido(selecionado)}</span>
            </div>

            {/* Refeições da versão atual */}
            {versaoAtual && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Refeições · {total} no total
                </p>
                <div className="space-y-2">
                  {versaoAtual.itens.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700">
                        {TIPO_EMOJI[item.tipoRefeicao]} {TIPO_LABELS[item.tipoRefeicao]}
                      </span>
                      <span className="text-sm font-bold text-gray-900">{item.quantidade}</span>
                    </div>
                  ))}
                </div>
                {versaoAtual.observacao && (
                  <p className="text-xs text-gray-500 italic mt-2">Obs: {versaoAtual.observacao}</p>
                )}
              </div>
            )}

            {/* Info de cancelamento */}
            {selecionado.status === 'CANCELADO' && (
              <div className="border-t pt-3 space-y-1">
                <p className="text-xs font-semibold text-red-600 uppercase">Cancelamento</p>
                {selecionado.canceladoPor && (
                  <p className="text-xs text-gray-600">
                    Por: <span className="font-medium">{selecionado.canceladoPor.nome}</span>
                  </p>
                )}
                {selecionado.motivoCancelamento && (
                  <p className="text-xs text-gray-600">
                    Motivo: <span className="italic">{selecionado.motivoCancelamento}</span>
                  </p>
                )}
              </div>
            )}

            {/* Histórico de versões */}
            {selecionado.versoes.length > 1 && (
              <div className="border-t pt-3">
                <button
                  onClick={() => setHistoricoAberto((v) => !v)}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase hover:text-gray-700"
                >
                  <span>{historicoAberto ? '▾' : '▸'}</span>
                  Histórico de edições ({selecionado.versoes.length - 1})
                </button>
                {historicoAberto && (
                  <div className="mt-2 space-y-2">
                    {[...selecionado.versoes].reverse().map((v) => {
                      const isAtual = v.numero === selecionado.versaoAtual
                      return (
                        <div
                          key={v.id}
                          className={`rounded-lg px-3 py-2 text-xs space-y-1 ${isAtual ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${isAtual ? 'text-blue-700' : 'text-gray-600'}`}>
                              V{v.numero}{isAtual ? ' (atual)' : ''}
                            </span>
                            <span className="text-gray-400">
                              {new Date(v.criadoEm).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-600">
                            Por: <span className="font-medium">{v.criadoPor?.nome ?? 'Visitante'}</span>
                          </p>
                          <div className="flex gap-3 flex-wrap">
                            {v.itens.map((i) => (
                              <span key={i.id} className="text-gray-600">
                                {TIPO_EMOJI[i.tipoRefeicao]} {i.quantidade}
                              </span>
                            ))}
                          </div>
                          {v.observacao && (
                            <p className="text-gray-500 italic">"{v.observacao}"</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <button onClick={fechar} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm">
                Fechar
              </button>
              {!readonly && selecionado.status !== 'CANCELADO' && (
                <>
                  <button
                    onClick={abrirEditar}
                    className="flex-1 border border-blue-200 text-blue-600 py-2 rounded-lg hover:bg-blue-50 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => { setModal('cancelar'); setErro('') }}
                    className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </>
              )}
              {!readonly && selecionado.status === 'CANCELADO' && (
                <button
                  onClick={reverterCancelamento}
                  disabled={carregando}
                  className="flex-1 border border-amber-300 text-amber-700 py-2 rounded-lg hover:bg-amber-50 text-sm font-medium disabled:opacity-50"
                >
                  {carregando ? 'Revertendo...' : 'Reverter Cancelamento'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar ── */}
      {selecionado && modal === 'editar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal('detalhe')}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-bold text-gray-800">Editar Pedido #{selecionado.id}</h2>
              <p className="text-xs text-gray-500 mt-0.5">A edição ficará registrada no histórico.</p>
            </div>

            {/* Quem está editando */}
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-blue-600">Editado por: </span>
              <span className="font-semibold text-blue-800">{adminNome}</span>
            </div>

            {/* Data da refeição */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Data das refeições</label>
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Quantidades */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Quantidades</p>
              {TIPOS.map((tipo) => (
                <div key={tipo} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-gray-600 flex items-center gap-1.5">
                    <span>{TIPO_EMOJI[tipo]}</span>
                    <span>{TIPO_LABELS[tipo]}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQtds((p) => ({ ...p, [tipo]: Math.max(0, (p[tipo] ?? 0) - 1) }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-bold text-gray-900">{qtds[tipo] ?? 0}</span>
                    <button
                      onClick={() => setQtds((p) => ({ ...p, [tipo]: (p[tipo] ?? 0) + 1 }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Motivo obrigatório */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Motivo da edição <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivoEdicao}
                onChange={(e) => { setMotivoEdicao(e.target.value); setErro('') }}
                placeholder="Descreva o motivo da alteração..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                rows={3}
                autoFocus
              />
              {erro && <p className="text-xs text-red-600">{erro}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setModal('detalhe'); setErro('') }}
                disabled={carregando}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Voltar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={carregando}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-semibold"
              >
                {carregando ? 'Salvando...' : 'Salvar Edição'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cancelar ── */}
      {selecionado && modal === 'cancelar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal('detalhe')}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-bold text-gray-800">Cancelar Pedido #{selecionado.id}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Esta ação ficará registrada no histórico.</p>
            </div>

            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">Cancelado por: </span>
              <span className="font-semibold text-gray-800">{adminNome}</span>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Motivo do cancelamento <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setErro('') }}
                placeholder="Descreva o motivo do cancelamento..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                rows={3}
                autoFocus
              />
              {erro && <p className="text-xs text-red-600">{erro}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setModal('detalhe'); setErro('') }}
                disabled={carregando}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Voltar
              </button>
              <button
                onClick={confirmarCancelamento}
                disabled={carregando}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400 text-sm font-semibold"
              >
                {carregando ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
