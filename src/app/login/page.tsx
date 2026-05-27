'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [nomeAdmin, setNomeAdmin] = useState('')

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
        setNomeAdmin(data.nome)
      } else if (data.role === 'RESTAURANTE') {
        window.location.href = '/restaurante'
      } else if (data.role === 'GESTOR') {
        window.location.href = '/gestor'
      } else {
        window.location.href = '/pedidos'
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  // Tela de escolha para admin
  if (nomeAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">👋</div>
            <h1 className="text-xl font-bold text-gray-800">Olá, {nomeAdmin.split(' ')[0]}!</h1>
            <p className="text-gray-500 text-sm mt-1">O que deseja fazer?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { window.location.href = '/admin' }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-left px-5 flex items-center gap-3"
            >
              <span className="text-2xl">⚙️</span>
              <div>
                <p className="font-semibold">Painel Admin</p>
                <p className="text-green-200 text-xs font-normal">Gerenciar pedidos, relatórios e cadastros</p>
              </div>
            </button>

            <button
              onClick={() => { window.location.href = '/pedidos' }}
              className="w-full bg-white border-2 border-green-600 hover:bg-green-50 text-green-700 font-semibold py-3.5 rounded-xl transition-colors text-left px-5 flex items-center gap-3"
            >
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="font-semibold">Fazer Pedido</p>
                <p className="text-green-500 text-xs font-normal">Solicitar refeição normalmente</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
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
              onChange={(e) => setLogin(e.target.value.trim())}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Seu login"
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
      </div>
    </div>
  )
}
