'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Usuario {
  id: number
  nome: string
  login: string
  ativo: boolean
  restaurante: { id: number; nome: string } | null
}

interface Restaurante {
  id: number
  nome: string
}

export function GerenciarUsuariosRestaurante({
  initial,
  restaurantes,
}: {
  initial: Usuario[]
  restaurantes: Restaurante[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nome: '', login: '', pin: '', restauranteId: 0 })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', login: '', pin: '', restauranteId: restaurantes[0]?.id ?? 0 })
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(item: Usuario) {
    setEditando(item)
    setForm({ nome: item.nome, login: item.login, pin: '', restauranteId: item.restaurante?.id ?? 0 })
    setErro('')
    setModalAberto(true)
  }

  async function salvar() {
    setErro('')
    if (!form.nome.trim() || !form.restauranteId) {
      setErro('Preencha nome e restaurante')
      return
    }
    if (!editando && (!form.login.trim() || form.pin.length < 4)) {
      setErro('Login e PIN (mín. 4 dígitos) obrigatórios')
      return
    }
    setCarregando(true)
    try {
      if (editando) {
        const body: Record<string, unknown> = { nome: form.nome }
        if (form.pin.length >= 4) body.pin = form.pin
        const res = await fetch(`/api/usuarios-restaurante/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro'); return }
        const data = await res.json()
        setItems((prev) => prev.map((i) => (i.id === editando.id ? data : i)))
      } else {
        const res = await fetch('/api/usuarios-restaurante', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: form.nome, login: form.login, pin: form.pin, restauranteId: form.restauranteId }),
        })
        if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro'); return }
        const data = await res.json()
        setItems((prev) => [...prev, data])
      }
      setModalAberto(false)
      router.refresh()
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  async function toggleAtivo(item: Usuario) {
    await fetch(`/api/usuarios-restaurante/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !item.ativo }),
    })
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={abrirNovo}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          + Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Login</th>
              <th className="px-4 py-3 text-left">Restaurante</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.nome}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.login}</td>
                <td className="px-4 py-3 text-gray-500">{item.restaurante?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => abrirEditar(item)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => toggleAtivo(item)} className="text-gray-500 hover:underline text-xs">
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum usuário cadastrado</p>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editando ? 'Editar Usuário' : 'Novo Usuário de Restaurante'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restaurante</label>
              <select
                value={form.restauranteId}
                onChange={(e) => setForm((p) => ({ ...p, restauranteId: Number(e.target.value) }))}
                disabled={!!editando}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
              >
                <option value={0}>Selecione...</option>
                {restaurantes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {!editando && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                <input
                  type="text"
                  value={form.login}
                  onChange={(e) => setForm((p) => ({ ...p, login: e.target.value.trim().toLowerCase() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  placeholder="ex: restaurante1"
                  autoCapitalize="none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN {editando && <span className="text-gray-400 text-xs">(deixe em branco para não alterar)</span>}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => setForm((p) => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-center tracking-widest font-mono"
                placeholder="4 a 6 dígitos"
                maxLength={6}
              />
            </div>

            {erro && <p className="text-red-600 text-sm">{erro}</p>}

            <div className="flex gap-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={salvar} disabled={carregando} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 font-semibold">
                {carregando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
