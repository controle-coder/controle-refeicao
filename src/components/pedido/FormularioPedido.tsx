'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TipoRefeicao } from '@/generated/prisma/enums'

const TIPOS_REFEICAO: { valor: TipoRefeicao; label: string }[] = [
  { valor: 'CAFE_MANHA', label: 'Café da Manhã' },
  { valor: 'ALMOCO', label: 'Almoço' },
  { valor: 'LANCHE', label: 'Lanche' },
  { valor: 'JANTAR', label: 'Jantar' },
  { valor: 'CEIA', label: 'Ceia' },
]

interface Restaurante { id: number; nome: string; telefone: string }
interface Fazenda { id: number; nome: string }
interface Turma { id: number; nome: string; fazendaId: number; fazenda: { nome: string } }
interface Requisitante {
  id: number; nome: string
  fazendaId: number; fazenda: { nome: string }
  turmaId: number; turma: { nome: string }
}

interface Props {
  restaurantes: Restaurante[]
  fazendas: Fazenda[]
  turmas: Turma[]
  requisitantes: Requisitante[]
}

export function FormularioPedido({ restaurantes, fazendas, turmas, requisitantes }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)

  // Etapa 1: quem está pedindo
  const [requisitanteId, setRequisitanteId] = useState<number>(0)

  // Etapa 2: restaurante
  const [restauranteId, setRestauranteId] = useState<number | null>(null)

  // Etapa 3: fazenda/turma (preenchido automaticamente pelo requisitante)
  const [fazendaId, setFazendaId] = useState<number>(0)
  const [turmaId, setTurmaId] = useState<number>(0)

  // Etapa 4: refeições
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [observacao, setObservacao] = useState('')

  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const requisitante = requisitantes.find((r) => r.id === requisitanteId)
  const turmasFiltradas = fazendaId ? turmas.filter((t) => t.fazendaId === fazendaId) : turmas
  const totalRefeicoes = Object.values(quantidades).reduce((s, v) => s + v, 0)

  function selecionarRequisitante(id: number) {
    setRequisitanteId(id)
    const r = requisitantes.find((r) => r.id === id)
    if (r) {
      setFazendaId(r.fazendaId)
      setTurmaId(r.turmaId)
    }
  }

  function handleQuantidade(tipo: string, valor: number) {
    setQuantidades((prev) => ({ ...prev, [tipo]: Math.max(0, valor) }))
  }

  async function handleSubmit() {
    setErro('')
    if (totalRefeicoes === 0) { setErro('Adicione pelo menos uma refeição'); return }
    setCarregando(true)
    try {
      const itens = TIPOS_REFEICAO.filter((t) => (quantidades[t.valor] ?? 0) > 0).map((t) => ({
        tipoRefeicao: t.valor,
        quantidade: quantidades[t.valor],
      }))
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitanteId,
          restauranteId,
          fazendaId,
          turmaId,
          itens,
          observacao: observacao || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao criar pedido'); return }
      router.push(`/pedidos/${data.id}`)
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  const ETAPAS = ['Quem sou eu', 'Restaurante', 'Local', 'Refeições']

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Barra de etapas */}
      <div className="flex border-b">
        {ETAPAS.map((label, i) => {
          const n = i + 1
          return (
            <div key={n} className={`flex-1 py-2.5 text-center text-xs font-medium ${
              etapa === n ? 'text-green-700 border-b-2 border-green-600' :
              etapa > n ? 'text-gray-400' : 'text-gray-300'
            }`}>
              {label}
            </div>
          )
        })}
      </div>

      <div className="p-4">

        {/* Etapa 1: Quem é você */}
        {etapa === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Selecione seu nome para continuar:</p>
            <div className="space-y-2">
              {requisitantes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { selecionarRequisitante(r.id); setEtapa(2) }}
                  className="w-full text-left border rounded-xl p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <div className="font-semibold text-gray-800">{r.nome}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {r.fazenda.nome} · {r.turma.nome}
                  </div>
                </button>
              ))}
            </div>
            {requisitantes.length === 0 && (
              <p className="text-center text-gray-400 py-8">Nenhum requisitante cadastrado</p>
            )}
          </div>
        )}

        {/* Etapa 2: Restaurante */}
        {etapa === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Selecione o restaurante:</p>
            {restaurantes.map((r) => (
              <button
                key={r.id}
                onClick={() => { setRestauranteId(r.id); setEtapa(3) }}
                className="w-full text-left border rounded-xl p-4 hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="font-medium text-gray-800">{r.nome}</div>
                <div className="text-sm text-gray-500">📞 {r.telefone}</div>
              </button>
            ))}
            {restaurantes.length === 0 && (
              <p className="text-center text-gray-400 py-8">Nenhum restaurante cadastrado</p>
            )}
            <button onClick={() => setEtapa(1)} className="w-full border text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
              ← Voltar
            </button>
          </div>
        )}

        {/* Etapa 3: Fazenda/Turma */}
        {etapa === 3 && (
          <div className="space-y-4">
            {requisitante && (
              <div className="bg-green-50 rounded-lg px-4 py-3 text-sm text-green-800">
                <div className="font-medium">{requisitante.nome}</div>
                <div className="text-xs mt-0.5 text-green-600">{requisitante.fazenda.nome} · {requisitante.turma.nome}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fazenda</label>
              <select
                value={fazendaId}
                onChange={(e) => { setFazendaId(Number(e.target.value)); setTurmaId(0) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={0}>Selecione...</option>
                {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
              <select
                value={turmaId}
                onChange={(e) => setTurmaId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value={0}>Selecione...</option>
                {turmasFiltradas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            {erro && <p className="text-red-600 text-sm">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={() => setEtapa(2)} className="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50">← Voltar</button>
              <button
                onClick={() => {
                  if (!fazendaId || !turmaId) { setErro('Selecione fazenda e turma'); return }
                  setErro(''); setEtapa(4)
                }}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Etapa 4: Refeições */}
        {etapa === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Informe as quantidades:</p>
            {TIPOS_REFEICAO.map((tipo) => (
              <div key={tipo.valor} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-gray-700 font-medium">{tipo.label}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleQuantidade(tipo.valor, (quantidades[tipo.valor] ?? 0) - 1)}
                    className="w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-gray-800 text-lg">
                    {quantidades[tipo.valor] ?? 0}
                  </span>
                  <button
                    onClick={() => handleQuantidade(tipo.valor, (quantidades[tipo.valor] ?? 0) + 1)}
                    className="w-9 h-9 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
              placeholder="Observação (opcional)"
            />

            {totalRefeicoes > 0 && (
              <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 font-medium">
                Total: {totalRefeicoes} refeição{totalRefeicoes !== 1 ? 'ões' : ''}
              </div>
            )}

            {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}

            <div className="flex gap-2">
              <button onClick={() => setEtapa(3)} className="flex-1 border text-gray-600 py-2 rounded-lg hover:bg-gray-50">← Voltar</button>
              <button
                onClick={handleSubmit}
                disabled={carregando}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-green-400 font-semibold"
              >
                {carregando ? 'Enviando...' : 'Criar Pedido'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
