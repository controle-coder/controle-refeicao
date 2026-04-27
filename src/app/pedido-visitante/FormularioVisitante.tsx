'use client'

import { useState } from 'react'

const TIPOS_REFEICAO = [
  { valor: 'CAFE_MANHA', label: 'Café da Manhã' },
  { valor: 'ALMOCO', label: 'Almoço' },
  { valor: 'JANTAR', label: 'Jantar' },
]

function localDateStr(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

interface Restaurante { id: number; nome: string }
interface Props { restaurantes: Restaurante[] }

export function FormularioVisitante({ restaurantes }: Props) {
  const [etapa, setEtapa] = useState(1)
  const [nome, setNome] = useState('')
  const [sobrenome, setSobrenome] = useState('')
  const [restauranteId, setRestauranteId] = useState<number | null>(null)
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [dataRefeicao, setDataRefeicao] = useState(() => localDateStr(1))
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function handleQuantidade(tipo: string, valor: number) {
    setQuantidades((prev) => ({ ...prev, [tipo]: Math.max(0, valor) }))
  }

  const totalRefeicoes = Object.values(quantidades).reduce((s, v) => s + v, 0)
  const restauranteSelecionado = restaurantes.find((r) => r.id === restauranteId)

  async function handleSubmit() {
    setErro('')
    if (totalRefeicoes === 0) { setErro('Adicione pelo menos uma refeição'); return }
    setCarregando(true)
    try {
      const itens = TIPOS_REFEICAO
        .filter((t) => (quantidades[t.valor] ?? 0) > 0)
        .map((t) => ({ tipoRefeicao: t.valor, quantidade: quantidades[t.valor] }))

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeVisitante: nome.trim(),
          sobrenomeVisitante: sobrenome.trim(),
          restauranteId,
          dataRefeicao,
          itens,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao criar pedido'); return }
      window.location.href = `/pedidos/${data.id}`
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">Pedido Rápido</h1>
          <p className="text-gray-400 text-sm mt-1">Para quem não está cadastrado</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">

          {/* Etapa 1: Nome e Sobrenome */}
          {etapa === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Seus dados:</p>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => { setNome(e.target.value); setErro('') }}
                  placeholder="Ex: João"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Sobrenome</label>
                <input
                  type="text"
                  value={sobrenome}
                  onChange={(e) => { setSobrenome(e.target.value); setErro('') }}
                  placeholder="Ex: Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-300"
                />
              </div>

              {erro && <p className="text-red-600 text-sm">{erro}</p>}

              <button
                onClick={() => {
                  if (!nome.trim() || !sobrenome.trim()) {
                    setErro('Preencha nome e sobrenome')
                    return
                  }
                  setErro('')
                  setEtapa(2)
                }}
                className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] mt-1"
              >
                Próximo →
              </button>

              <div className="text-center">
                <a href="/identificar" className="text-xs text-gray-400 hover:text-gray-600">
                  ← Estou cadastrado
                </a>
              </div>
            </div>
          )}

          {/* Etapa 2: Restaurante */}
          {etapa === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Escolha o restaurante:</p>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {restaurantes.length === 0 ? (
                  <p className="text-center text-gray-400 py-6 text-sm">Nenhum restaurante disponível</p>
                ) : (
                  restaurantes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setRestauranteId(r.id); setEtapa(3) }}
                      className="w-full text-left border border-gray-100 bg-gray-50 hover:border-green-500 hover:bg-green-50 rounded-xl px-4 py-3 transition-colors"
                    >
                      <p className="font-semibold text-sm text-gray-800">{r.nome}</p>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setEtapa(1)}
                className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                ← Voltar
              </button>
            </div>
          )}

          {/* Etapa 3: Refeições */}
          {etapa === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-lg px-4 py-2.5 text-sm">
                <span className="font-semibold text-green-800">{nome} {sobrenome}</span>
                <span className="text-green-400 mx-2">·</span>
                <span className="text-green-700">{restauranteSelecionado?.nome}</span>
              </div>

              <p className="text-sm font-medium text-gray-700">Quantidades:</p>

              {TIPOS_REFEICAO.map((tipo) => (
                <div key={tipo.valor} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-gray-700 font-medium text-sm">{tipo.label}</span>
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

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Data das refeições</label>
                <input
                  type="date"
                  value={dataRefeicao}
                  onChange={(e) => setDataRefeicao(e.target.value)}
                  min={localDateStr(0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400">Padrão: próximo dia. Altere se necessário.</p>
              </div>

              {totalRefeicoes > 0 && (
                <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800 font-medium">
                  Total: {totalRefeicoes} refeição{totalRefeicoes !== 1 ? 'ões' : ''}
                </div>
              )}

              {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => setEtapa(2)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
                >
                  ← Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={carregando}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-green-400 font-semibold text-sm"
                >
                  {carregando ? 'Enviando...' : 'Criar Pedido'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
