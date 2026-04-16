'use client'

import { useState } from 'react'

interface Fazenda {
  id: number
  nome: string
  ativo: boolean
}

export function GerenciarFazendas({ initial }: { initial: Fazenda[] }) {
  const [items, setItems] = useState(initial)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Fazenda | null>(null)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function abrirNovo() {
    setEditando(null)
    setNome('')
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(item: Fazenda) {
    setEditando(item)
    setNome(item.nome)
    setErro('')
    setModalAberto(true)
  }

  async function salvar() {
    if (!nome.trim()) { setErro('Informe o nome'); return }
    setCarregando(true)
    try {
      const url = editando ? `/api/fazendas/${editando.id}` : '/api/fazendas'
      const method = editando ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro'); return }
      const data = await res.json()
      setModalAberto(false)
      if (editando) setItems((p) => p.map((i) => (i.id === editando.id ? data : i)))
      else setItems((p) => [...p, data])
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  async function toggleAtivo(item: Fazenda) {
    await fetch(`/api/fazendas/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !item.ativo }),
    })
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={abrirNovo} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
          + Nova Fazenda
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.nome}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => abrirEditar(item)} className="text-blue-600 hover:underline text-xs">Editar</button>
                  <button onClick={() => toggleAtivo(item)} className="text-gray-500 hover:underline text-xs">{item.ativo ? 'Desativar' : 'Ativar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma fazenda cadastrada</p>}
      </div>
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editando ? 'Editar Fazenda' : 'Nova Fazenda'}</h2>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da fazenda"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            {erro && <p className="text-red-600 text-sm">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={() => setModalAberto(false)} className="flex-1 border text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
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
