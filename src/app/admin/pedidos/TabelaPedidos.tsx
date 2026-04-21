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
const TIPO_EMOJI: Record<string, string> = {
  CAFE_MANHA: '☕',
  ALMOCO: '🍽️',
  JANTAR: '🌙',
}
const TIPOS = ['CAFE_MANHA', 'ALMOCO', 'JANTAR'] as const

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
  criadoPor: { id: number; nome: string }
  itens: Item[]
}

interface Pedido {
  id: number
  status: string
  versaoAtual: number
  criadoEm: Date | string
  dataRefeicao?: Date | string
  restaurante: { nome: string }
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  canceladoPor?: { nome: string } | null
  motivoCancelamento?: string | null
  versoes: Versao[]
}

interface Props {
  pedidos: Pedido[]
  adminId: number
  adminNome: string
}

type Modal = 'detalhe' | 'cancelar' | 'editar'

export function TabelaPedidos({ pedidos, adminId, adminNome }: Props) {
  const [lista, setLista] = useState<Pedido[]>(pedidos)
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [modal, setModal] = useState<Modal>('detalhe')

  // cancelar
  const [motivo, setMotivo] = useState('')

  // editar
  const [qtds, setQtds] = useState<Record<string, number>>({ CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0 })
  const [motivoEdicao, setMotivoEdicao] = useState('')
  const [historicoAberto, setHistoricoAberto] = useState(false)

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

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

  function abrirEditar() {
    if (!versaoAtual) return
    const mapa: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0 }
    for (const item of versaoAtual.itens) mapa[item.tipoRefeicao] = item.quantidade
    setQtds(mapa)
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
          {lista.map((p) => {
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
                <td className="px-4 py-2 text-gray-500">{p.fazenda.nome} / {p.turma.nome}</td>
                <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
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

      {lista.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum pedido</p>}

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
              <span className="text-gray-500">Restaurante</span>
              <span className="font-medium text-gray-800">{selecionado.restaurante.nome}</span>
              <span className="text-gray-500">Fazenda</span>
              <span className="font-medium text-gray-800">{selecionado.fazenda.nome}</span>
              <span className="text-gray-500">Turma</span>
              <span className="font-medium text-gray-800">{selecionado.turma.nome}</span>
              <span className="text-gray-500">Requisitante</span>
              <span className="font-medium text-gray-800">{selecionado.requisitante.nome}</span>
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
                            Por: <span className="font-medium">{v.criadoPor.nome}</span>
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
              {selecionado.status !== 'CANCELADO' && (
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
