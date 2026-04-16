'use client'

import { useState } from 'react'

interface Fazenda { id: number; nome: string }
interface Turma { id: number; nome: string; ativo: boolean; fazendaId: number; fazenda: Fazenda }

export function GerenciarTurmas({ initial, fazendas }: { initial: Turma[]; fazendas: Fazenda[] }) {
  const [items, setItems] = useState(initial)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Turma | null>(null)
  const [form, setForm] = useState({ nome: '', fazendaId: 0 })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function abrirNovo() { setEditando(null); setForm({ nome: '', fazendaId: 0 }); setErro(''); setModalAberto(true) }
  function abrirEditar(item: Turma) { setEditando(item); setForm({ nome: item.nome, fazendaId: item.fazendaId }); setErro(''); setModalAberto(true) }

  async function salvar() {
    if (!form.nome.trim() || !form.fazendaId) { setErro('Preencha todos os campos'); return }
    setCarregando(true)
    try {
      const url = editando ? `/api/turmas/${editando.id}` : '/api/turmas'
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro'); return }
      const data = await res.json()
      setModalAberto(false)
      if (editando) setItems((p) => p.map((i) => (i.id === editando.id ? data : i)))
      else setItems((p) => [...p, data])
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  async function toggleAtivo(item: Turma) {
    await fetch(`/api/turmas/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: !item.ativo }) })
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, ativo: !i.ativo } : i)))
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={abrirNovo} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">+ Nova Turma</button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Fazenda</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.nome}</td>
                <td className="px-4 py-3 text-gray-500">{item.fazenda.nome}</td>
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
        {items.length === 0 && <p className="text-center text-gray-400 py-8">Nenhuma turma cadastrada</p>}
      </div>
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">{editando ? 'Editar Turma' : 'Nova Turma'}</h2>
            <input type="text" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Nome da turma"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
            <select value={form.fazendaId} onChange={(e) => setForm((p) => ({ ...p, fazendaId: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value={0}>Selecione a fazenda...</option>
              {fazendas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
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
