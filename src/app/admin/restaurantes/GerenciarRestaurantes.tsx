'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Restaurante {
  id: number
  nome: string
  telefone: string
  linkGrupoWhatsApp: string | null
  precoCafeManha: number | null
  precoAlmoco: number | null
  precoJantar: number | null
  ativo: boolean
}

export function GerenciarRestaurantes({ initial }: { initial: Restaurante[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Restaurante | null>(null)
  const [form, setForm] = useState({ nome: '', telefone: '', linkGrupoWhatsApp: '', precoCafeManha: '', precoAlmoco: '', precoJantar: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', telefone: '', linkGrupoWhatsApp: '', precoCafeManha: '', precoAlmoco: '', precoJantar: '' })
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(item: Restaurante) {
    setEditando(item)
    setForm({
      nome: item.nome,
      telefone: item.telefone,
      linkGrupoWhatsApp: item.linkGrupoWhatsApp ?? '',
      precoCafeManha: item.precoCafeManha != null ? String(item.precoCafeManha) : '',
      precoAlmoco: item.precoAlmoco != null ? String(item.precoAlmoco) : '',
      precoJantar: item.precoJantar != null ? String(item.precoJantar) : '',
    })
    setErro('')
    setModalAberto(true)
  }

  async function salvar() {
    setErro('')
    if (!form.nome.trim() || !form.telefone.trim()) {
      setErro('Preencha Nome e Telefone')
      return
    }
    setCarregando(true)
    try {
      const url = editando ? `/api/restaurantes/${editando.id}` : '/api/restaurantes'
      const method = editando ? 'PUT' : 'POST'
      const parsePreco = (v: string) => {
        const n = parseFloat(v.replace(',', '.'))
        return isNaN(n) ? null : n
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          telefone: form.telefone,
          linkGrupoWhatsApp: form.linkGrupoWhatsApp.trim() || null,
          precoCafeManha: parsePreco(form.precoCafeManha),
          precoAlmoco: parsePreco(form.precoAlmoco),
          precoJantar: parsePreco(form.precoJantar),
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErro(d.error || 'Erro ao salvar')
        return
      }
      setModalAberto(false)
      router.refresh()
      const data = await res.json()
      if (editando) {
        setItems((prev) => prev.map((i) => (i.id === editando.id ? data : i)))
      } else {
        setItems((prev) => [...prev, data])
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  async function toggleAtivo(item: Restaurante) {
    await fetch(`/api/restaurantes/${item.id}`, {
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
          + Novo Restaurante
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Preços (R$)</th>
              <th className="px-4 py-3 text-left">Grupo WhatsApp</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{item.nome}</td>
                <td className="px-4 py-3 text-gray-500">{item.telefone}</td>
                <td className="px-4 py-3 text-gray-500 text-xs space-y-0.5">
                  {item.precoCafeManha != null && <div>☕ R$ {item.precoCafeManha.toFixed(2).replace('.', ',')}</div>}
                  {item.precoAlmoco != null && <div>🍽️ R$ {item.precoAlmoco.toFixed(2).replace('.', ',')}</div>}
                  {item.precoJantar != null && <div>🌙 R$ {item.precoJantar.toFixed(2).replace('.', ',')}</div>}
                  {item.precoCafeManha == null && item.precoAlmoco == null && item.precoJantar == null && (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {item.linkGrupoWhatsApp ? (
                    <a
                      href={item.linkGrupoWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-xs"
                    >
                      Ver grupo
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => abrirEditar(item)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleAtivo(item)}
                    className="text-gray-500 hover:underline text-xs"
                  >
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum restaurante cadastrado</p>
        )}
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {editando ? 'Editar Restaurante' : 'Novo Restaurante'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone <span className="text-gray-400 text-xs">(somente dígitos, ex: 5565999990001)</span>
              </label>
              <input
                type="tel"
                value={form.telefone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, telefone: e.target.value.replace(/\D/g, '') }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link do Grupo WhatsApp <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="url"
                placeholder="https://chat.whatsapp.com/XXXXXX"
                value={form.linkGrupoWhatsApp}
                onChange={(e) => setForm((p) => ({ ...p, linkGrupoWhatsApp: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se preenchido, o botão WhatsApp copiará a mensagem e abrirá o grupo automaticamente.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço por refeição <span className="text-gray-400 text-xs">(opcional, R$)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '☕ Café', key: 'precoCafeManha' as const },
                  { label: '🍽️ Almoço', key: 'precoAlmoco' as const },
                  { label: '🌙 Jantar', key: 'precoJantar' as const },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                ))}
              </div>
            </div>
            {erro && <p className="text-red-600 text-sm">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={carregando}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 font-semibold"
              >
                {carregando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
