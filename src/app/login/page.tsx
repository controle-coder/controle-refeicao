'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [login, setLogin] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, pin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao fazer login')
        return
      }
      if (data.role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/pedidos')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">Pedidos de Refeição</h1>
          <p className="text-gray-500 text-sm mt-1">Acesse com seu login e PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Seu login"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-xl tracking-widest"
              placeholder="••••"
              maxLength={6}
              required
              autoComplete="current-password"
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <Link
            href="/pedidos"
            className="inline-block w-full border border-green-600 text-green-700 hover:bg-green-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            🛒 Ir para Tela de Pedidos
          </Link>
        </div>
      </div>
    </div>
  )
}
