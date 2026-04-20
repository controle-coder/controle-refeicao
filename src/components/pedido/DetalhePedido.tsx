'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TipoRefeicao } from '@/generated/prisma/enums'
import { gerarMensagemPedido, gerarLinkWhatsApp } from '@/lib/whatsapp'

const TIPOS_REFEICAO: { valor: TipoRefeicao; label: string }[] = [
  { valor: 'CAFE_MANHA', label: 'Café da Manhã' },
  { valor: 'ALMOCO', label: 'Almoço' },
  { valor: 'JANTAR', label: 'Jantar' },
]

const TIPO_LABELS: Record<TipoRefeicao, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

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

interface Item {
  id: number
  tipoRefeicao: TipoRefeicao
  quantidade: number
  observacao?: string | null
}

interface VersaoPedido {
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
  dataRefeicao: Date | string
  restaurante: { id: number; nome: string; telefone: string; linkGrupoWhatsApp?: string | null }
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: VersaoPedido[]
}

interface Props {
  pedido: Pedido
  sessaoId: number
  sessaoRole: string
}

export function DetalhePedido({ pedido, sessaoId, sessaoRole }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [observacoes, setObservacoes] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modalGrupo, setModalGrupo] = useState<{ mensagem: string; link: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  const versaoAtual = pedido.versoes.find((v) => v.numero === pedido.versaoAtual)

  function podeEditarAgora(): boolean {
    if (pedido.status === 'CANCELADO') return false
    const tipos = versaoAtual?.itens.map((i) => i.tipoRefeicao) ?? []

    const agora = new Date()
    const ref = new Date(pedido.dataRefeicao)
    const ano = ref.getUTCFullYear()
    const mes = ref.getUTCMonth()
    const dia = ref.getUTCDate()

    for (const tipo of tipos) {
      if (tipo === 'CAFE_MANHA' && agora >= new Date(ano, mes, dia - 1, 19, 30)) return false
      if (tipo === 'ALMOCO'     && agora >= new Date(ano, mes, dia, 8, 0))        return false
      if (tipo === 'JANTAR'     && agora >= new Date(ano, mes, dia, 16, 0))       return false
    }
    return true
  }

  const dentroDosPrazo = podeEditarAgora()
  function iniciarEdicao() {
    if (!versaoAtual) return
    const qtds: Record<string, number> = {}
    const obs: Record<string, string> = {}
    versaoAtual.itens.forEach((i) => {
      qtds[i.tipoRefeicao] = i.quantidade
      obs[i.tipoRefeicao] = i.observacao ?? ''
    })
    setQuantidades(qtds)
    setObservacoes(obs)
    setEditando(true)
  }

  async function salvarNovaVersao() {
    setErro('')
    const total = Object.values(quantidades).reduce((s, v) => s + v, 0)
    if (total === 0) {
      setErro('Adicione pelo menos uma refeição')
      return
    }
    setCarregando(true)
    try {
      // Envia TODOS os tipos (incluindo zeros) para que o servidor saiba
      // quais foram zerados intencionalmente vs. quais não foram tocados
      const itens = TIPOS_REFEICAO.map((t) => ({
        tipoRefeicao: t.valor,
        quantidade: quantidades[t.valor] ?? 0,
        observacao: observacoes[t.valor]?.trim() || undefined,
      }))
      const res = await fetch(`/api/pedidos/${pedido.id}/versao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioId: sessaoId, itens }),
      })
      if (!res.ok) {
        const data = await res.json()
        setErro(data.error || 'Erro ao salvar')
        return
      }
      window.location.href = window.location.href
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  async function cancelarPedido() {
    if (!confirm('Deseja cancelar este pedido?')) return
    await fetch(`/api/pedidos/${pedido.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELADO' }),
    })
    router.refresh()
  }

  async function copiarMensagem(mensagem: string) {
    await navigator.clipboard.writeText(mensagem).catch(() => {})
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function enviarWhatsApp() {
    if (!versaoAtual) return
    const mensagem = gerarMensagemPedido({
      versao: pedido.versaoAtual,
      data: new Date(pedido.dataRefeicao),
      fazenda: pedido.fazenda.nome,
      turma: pedido.turma.nome,
      requisitante: pedido.requisitante.nome,
      itens: versaoAtual.itens,
    })

    if (pedido.restaurante.linkGrupoWhatsApp) {
      await navigator.clipboard.writeText(mensagem).catch(() => {})
      setCopiado(false)
      setModalGrupo({ mensagem, link: pedido.restaurante.linkGrupoWhatsApp })
    } else {
      const link = gerarLinkWhatsApp(pedido.restaurante.telefone, mensagem)
      window.open(link, '_blank')
    }

    await fetch(`/api/pedidos/${pedido.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ENVIADO' }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => { window.location.href = '/pedidos/novo' }} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Voltar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-bold text-gray-800">Pedido #{pedido.id}</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[pedido.status]}`}>
            {STATUS_LABELS[pedido.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-gray-500">Data das refeições</div>
          <div className="font-medium text-gray-800">
            {new Date(pedido.dataRefeicao).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
          <div className="text-gray-500">Restaurante</div>
          <div className="font-medium text-gray-800">{pedido.restaurante.nome}</div>
          <div className="text-gray-500">Fazenda</div>
          <div className="font-medium text-gray-800">{pedido.fazenda.nome}</div>
          <div className="text-gray-500">Turma</div>
          <div className="font-medium text-gray-800">{pedido.turma.nome}</div>
          <div className="text-gray-500">Requisitante</div>
          <div className="font-medium text-gray-800">{pedido.requisitante.nome}</div>
          <div className="text-gray-500">Versão</div>
          <div className="font-medium text-gray-800">V{pedido.versaoAtual}</div>
        </div>

        {!editando && versaoAtual && (
          <>
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Refeições (V{versaoAtual.numero})</p>
              <div className="space-y-1">
                {versaoAtual.itens.map((item) => (
                  <div key={item.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{TIPO_LABELS[item.tipoRefeicao]}</span>
                      <span className="font-medium text-gray-800">
                        {item.quantidade} refeição{item.quantidade !== 1 ? 'ões' : ''}
                      </span>
                    </div>
                    {item.observacao && (
                      <p className="text-xs text-gray-400 italic ml-1">↳ {item.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {pedido.status !== 'CANCELADO' && (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={enviarWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5c] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar para Restaurante
                </button>
                {dentroDosPrazo ? (
                  <button
                    onClick={iniciarEdicao}
                    className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Editar / Nova Versão
                  </button>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-1">
                    {versaoAtual?.itens.some((i) => i.tipoRefeicao === 'CAFE_MANHA')
                      ? 'Prazo de edição do Café da Manhã encerrado às 19:30 do dia anterior'
                      : versaoAtual?.itens.some((i) => i.tipoRefeicao === 'ALMOCO')
                      ? 'Prazo de edição do Almoço encerrado às 8:00 do dia da retirada'
                      : 'Prazo de edição do Jantar encerrado às 16:00 do dia da retirada'}
                  </p>
                )}
                {(sessaoRole === 'ADMIN') && (
                  <button
                    onClick={cancelarPedido}
                    className="w-full border border-red-200 text-red-600 py-2 rounded-lg hover:bg-red-50 text-sm"
                  >
                    Cancelar Pedido
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {editando && (
          <div className="border-t pt-3 space-y-4">
            <p className="text-sm font-medium text-gray-700">Nova Versão (V{pedido.versaoAtual + 1})</p>
            {TIPOS_REFEICAO.map((tipo) => (
              <div key={tipo.valor} className="py-2 border-b last:border-0 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">{tipo.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setQuantidades((p) => ({ ...p, [tipo.valor]: Math.max(0, (p[tipo.valor] ?? 0) - 1) }))
                      }
                      className="w-7 h-7 rounded-full border text-gray-600 hover:bg-gray-100 font-bold text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-sm">
                      {quantidades[tipo.valor] ?? 0}
                    </span>
                    <button
                      onClick={() =>
                        setQuantidades((p) => ({ ...p, [tipo.valor]: (p[tipo.valor] ?? 0) + 1 }))
                      }
                      className="w-7 h-7 rounded-full border text-gray-600 hover:bg-gray-100 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={observacoes[tipo.valor] ?? ''}
                  onChange={(e) => setObservacoes((p) => ({ ...p, [tipo.valor]: e.target.value }))}
                  placeholder={`Obs. ${tipo.label} (opcional)`}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
            ))}
            {erro && <p className="text-red-600 text-sm">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setEditando(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNovaVersao}
                disabled={carregando}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 text-sm font-semibold"
              >
                {carregando ? 'Salvando...' : 'Salvar Versão'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal grupo WhatsApp */}
      {modalGrupo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 mb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Enviar para o Grupo</h2>
              <button onClick={() => setModalGrupo(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <p className="text-xs text-gray-500">Mensagem já copiada. Cole no grupo ao abrir o WhatsApp.</p>

            <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
              {modalGrupo.mensagem}
            </pre>

            <div className="flex gap-2">
              <button
                onClick={() => copiarMensagem(modalGrupo.mensagem)}
                className={`flex-1 border py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  copiado
                    ? 'border-green-400 text-green-700 bg-green-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {copiado ? '✓ Copiado!' : 'Copiar novamente'}
              </button>
              <button
                onClick={() => { window.open(modalGrupo.link, '_blank'); setModalGrupo(null) }}
                className="flex-1 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Abrir Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de versões */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Versões</h2>
        <div className="space-y-3">
          {pedido.versoes.map((versao) => (
            <div
              key={versao.id}
              className={`border rounded-lg p-3 text-sm ${
                versao.numero === pedido.versaoAtual
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">
                  V{versao.numero}
                  {versao.numero === pedido.versaoAtual && (
                    <span className="ml-2 text-xs text-green-700 font-normal">(atual)</span>
                  )}
                </span>
                <div className="text-xs text-gray-400">
                  {new Date(versao.criadoEm).toLocaleString('pt-BR')} · {versao.criadoPor.nome}
                </div>
              </div>
              <div className="space-y-1">
                {versao.itens.map((item) => (
                  <div key={item.id}>
                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>{TIPO_LABELS[item.tipoRefeicao]}</span>
                      <span>{item.quantidade}</span>
                    </div>
                    {item.observacao && (
                      <p className="text-gray-400 italic text-xs ml-1">↳ {item.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
