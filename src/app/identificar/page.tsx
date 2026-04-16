'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Requisitante {
  id: number
  nome: string
  fazenda: { nome: string }
  turma: { nome: string }
}

export default function IdentificarPage() {
  const router = useRouter()
  const [requisitantes, setRequisitantes] = useState<Requisitante[]>([])
  const [selecionado, setSelecionado] = useState<number>(0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/auth/identificar')
      .then((r) => r.json())
      .then(setRequisitantes)
  }, [])

  async function handleEntrar() {
    if (!selecionado) {
      setErro('Selecione seu nome')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch('/api/auth/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisitanteId: selecionado }),
      })
      if (!res.ok) {
        setErro('Erro ao identificar')
        return
      }
      router.push('/pedidos')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  const pessoa = requisitantes.find((r) => r.id === selecionado)

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">Quem é você?</h1>
          <p className="text-gray-500 text-sm mt-1">Selecione seu nome para continuar</p>
        </div>

        <div className="space-y-4">
          <select
            value={selecionado}
            onChange={(e) => setSelecionado(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
          >
            <option value={0}>Selecione seu nome...</option>
            {requisitantes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>

          {pessoa && (
            <div className="bg-green-50 rounded-lg px-4 py-3 text-sm text-green-800 space-y-0.5">
              <div>🏭 {pessoa.fazenda.nome}</div>
              <div>👥 {pessoa.turma.nome}</div>
            </div>
          )}

          {erro && (
            <p className="text-red-600 text-sm text-center">{erro}</p>
          )}

          <button
            onClick={handleEntrar}
            disabled={carregando || !selecionado}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition-colors text-base"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center">
            <a href="/login" className="text-xs text-gray-400 hover:text-gray-600">
              Admin? Entrar com senha →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
