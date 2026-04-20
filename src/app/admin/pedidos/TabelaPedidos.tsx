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
  canceladoPor?: { nome: string } | null
  motivoCancelamento?: string | null
  versoes: {
    id: number
    numero: number
    observacao?: string | null
    itens: Item[]
  }[]
}

interface Props {
  pedidos: Pedido[]
  adminId: number
  adminNome: string
}

export function TabelaPedidos({ pedidos, adminId, adminNome }: Props) {
  const [lista, setLista] = useState<Pedido[]>(pedidos)
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const versaoAtual = selecionado
    ? selecionado.versoes.find((v) => v.numero === selecionado.versaoAtual)
    : null
  const total = versaoAtual?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0

  function abrirModal(p: Pedido) {
    setSelecionado(p)
    setCancelando(false)
    setMotivo('')
    setErro('')
  }

  function fechar() {
    setSelecionado(null)
    setCancelando(false)
    setMotivo('')
    setErro('')
  }

  async function confirmarCancelamento() {
    if (!selecionado) return
    setErro('')
    if (motivo.trim().length < 5) {
      setErro('Informe o motivo (mínimo 5 caracteres)')
      return
    }
    setCarregando(true)
    try {
      const res = await fetch(`/api/pedidos/${selecionado.id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelamento: motivo.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao cancelar')
        return
      }
      // Atualiza lista localmente
      setLista((prev) =>
        prev.map((p) =>
          p.id === selecionado.id
            ? {
                ...p,
                status: 'CANCELADO',
                canceladoPor: { nome: adminNome },
                motivoCancelamento: motivo.trim(),
              }
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
            const v = p.versoes[0]
            const totalItens = v?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
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
                <td className="px-4 py-2 text-gray-500">
                  {p.fazenda.nome} / {p.turma.nome}
                </td>
                <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
                <td className="px-4 py-2 text-right text-gray-800">{totalItens}</td>
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

      {lista.length === 0 && (
        <p className="text-center text-gray-400 py-8">Nenhum pedido</p>
      )}

      {/* Modal de detalhes */}
      {selecionado && !cancelando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={fechar}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
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
                      <span className="text-sm text-gray-700">{TIPO_LABELS[item.tipoRefeicao]}</span>
                      <span className="text-sm font-bold text-gray-900">{item.quantidade}</span>
                    </div>
                  ))}
                </div>
                {versaoAtual.observacao && (
                  <p className="text-xs text-gray-500 italic mt-2">Obs: {versaoAtual.observacao}</p>
                )}
              </div>
            )}

            {/* Info de cancelamento (se já cancelado) */}
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

            {/* Ações */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={fechar}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Fechar
              </button>
              {selecionado.status !== 'CANCELADO' && (
                <button
                  onClick={() => setCancelando(true)}
                  className="flex-1 border border-red-200 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                  Cancelar Pedido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de cancelamento */}
      {selecionado && cancelando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setCancelando(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-bold text-gray-800">
                Cancelar Pedido #{selecionado.id}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Esta ação ficará registrada no histórico.
              </p>
            </div>

            {/* Quem está cancelando */}
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">Cancelado por: </span>
              <span className="font-semibold text-gray-800">{adminNome}</span>
            </div>

            {/* Motivo obrigatório */}
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
                onClick={() => setCancelando(false)}
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
