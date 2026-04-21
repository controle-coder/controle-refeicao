'use client'

import { useState, useEffect } from 'react'

interface Requisitante {
  id: number
  nome: string
  fazenda: { nome: string }
  turma: { nome: string }
}

export default function IdentificarPage() {
  const [requisitantes, setRequisitantes] = useState<Requisitante[]>([])
  const [selecionado, setSelecionado] = useState<number>(0)
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    fetch('/api/auth/identificar')
      .then((r) => r.json())
      .then((data) => setRequisitantes(data))
      .finally(() => setCarregandoLista(false))
  }, [])

  async function handleEntrar() {
    if (!selecionado) return
    setEntrando(true)
    setErro('')
    try {
      const res = await fetch('/api/auth/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitanteId: selecionado }),
      })
      if (!res.ok) {
        setErro('Erro ao identificar')
        setEntrando(false)
        return
      }
      window.location.href = '/pedidos'
    } catch {
      setErro('Erro de conexão')
      setEntrando(false)
    }
  }

  const filtrados = requisitantes.filter((r) =>
    r.nome.toLowerCase().includes(busca.toLowerCase())
  )

  const pessoa = requisitantes.find((r) => r.id === selecionado)

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">Quem é você?</h1>
          <p className="text-gray-400 text-sm mt-1">Toque no seu nome para continuar</p>
        </div>

        {carregandoLista ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <svg className="animate-spin w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
            <span className="text-sm">Carregando lista...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Busca (só exibe com 5+ pessoas) */}
            {requisitantes.length >= 5 && (
              <input
                type="text"
                placeholder="Buscar nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-300"
              />
            )}

            {/* Lista de cards */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
              {filtrados.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">Nenhum nome encontrado</p>
              ) : (
                filtrados.map((r) => {
                  const ativo = selecionado === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelecionado(r.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${
                        ativo
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <p className={`font-semibold text-sm ${ativo ? 'text-green-800' : 'text-gray-800'}`}>
                        {ativo && <span className="mr-1.5">✓</span>}
                        {r.nome}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.fazenda.nome} · {r.turma.nome}</p>
                    </button>
                  )
                })
              )}
            </div>

            {erro && <p className="text-red-600 text-sm text-center">{erro}</p>}

            <button
              onClick={handleEntrar}
              disabled={!selecionado || entrando}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-base mt-1"
            >
              {entrando ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Entrando...
                </span>
              ) : (
                pessoa ? `Entrar como ${pessoa.nome.split(' ')[0]}` : 'Entrar'
              )}
            </button>

            <div className="text-center">
              <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">
                Admin? Entrar com senha →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
