'use client'

import { useState } from 'react'

interface Item { id: number; nome: string }
interface Turma { id: number; nome: string; fazendaId: number; fazenda?: { nome: string } }
interface PrecoContrato {
  id: number
  contratoId: number
  restauranteId: number
  precoCafeManha: number | null
  precoAlmoco: number | null
  precoJantar: number | null
  linkGrupoWhatsApp: string | null
}
interface Contrato {
  id: number
  nome: string
  numero: string | null
  descricao: string | null
  anotacoes: string | null
  ativo: boolean
  criadoEm: string
  _count: { requisitantes: number }
  fazendas: Item[]
  restaurantes: Item[]
  turmas: Turma[]
  precosContrato: PrecoContrato[]
}

interface PrecoForm {
  precoCafeManha: string
  precoAlmoco: string
  precoJantar: string
  linkGrupoWhatsApp: string
}

interface Props {
  initial: Contrato[]
  fazendas: Item[]
  restaurantes: Item[]
  turmas: Turma[]
}

export function GerenciarContratos({ initial, fazendas, restaurantes, turmas }: Props) {
  const [items, setItems] = useState(initial)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)
  const [form, setForm] = useState({
    nome: '', numero: '', descricao: '', anotacoes: '',
    fazendaIds: [] as number[],
    restauranteIds: [] as number[],
    turmaIds: [] as number[],
  })
  const [precos, setPrecos] = useState<Record<number, PrecoForm>>({})
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<'ativos' | 'inativos'>('ativos')

  const itensFiltrados = items.filter((i) => abaAtiva === 'ativos' ? i.ativo : !i.ativo)

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', numero: '', descricao: '', anotacoes: '', fazendaIds: [], restauranteIds: [], turmaIds: [] })
    setPrecos({})
    setErro('')
    setModalAberto(true)
  }

  function abrirEditar(item: Contrato) {
    setEditando(item)
    setForm({
      nome: item.nome,
      numero: item.numero ?? '',
      descricao: item.descricao ?? '',
      anotacoes: item.anotacoes ?? '',
      fazendaIds: item.fazendas.map((f) => f.id),
      restauranteIds: item.restaurantes.map((r) => r.id),
      turmaIds: item.turmas.map((t) => t.id),
    })
    const precosMap: Record<number, PrecoForm> = {}
    for (const p of item.precosContrato) {
      precosMap[p.restauranteId] = {
        precoCafeManha: p.precoCafeManha != null ? String(p.precoCafeManha) : '',
        precoAlmoco: p.precoAlmoco != null ? String(p.precoAlmoco) : '',
        precoJantar: p.precoJantar != null ? String(p.precoJantar) : '',
        linkGrupoWhatsApp: p.linkGrupoWhatsApp ?? '',
      }
    }
    setPrecos(precosMap)
    setErro('')
    setModalAberto(true)
  }

  function toggleId(field: 'fazendaIds' | 'restauranteIds' | 'turmaIds', id: number) {
    setForm((p) => {
      const arr = p[field]
      return { ...p, [field]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] }
    })
  }

  const parsePreco = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    return isNaN(n) ? null : n
  }

  function setPrecoField(restId: number, field: keyof PrecoForm, value: string) {
    setPrecos((prev) => ({
      ...prev,
      [restId]: { ...(prev[restId] ?? { precoCafeManha: '', precoAlmoco: '', precoJantar: '', linkGrupoWhatsApp: '' }), [field]: value },
    }))
  }

  async function salvar() {
    if (!form.nome.trim()) { setErro('Nome obrigatório'); return }
    setCarregando(true)
    try {
      const precosArray = form.restauranteIds.map((restId) => {
        const p = precos[restId] ?? { precoCafeManha: '', precoAlmoco: '', precoJantar: '', linkGrupoWhatsApp: '' }
        return {
          restauranteId: restId,
          precoCafeManha: parsePreco(p.precoCafeManha),
          precoAlmoco: parsePreco(p.precoAlmoco),
          precoJantar: parsePreco(p.precoJantar),
          linkGrupoWhatsApp: p.linkGrupoWhatsApp.trim() || null,
        }
      })
      const body = {
        nome: form.nome.trim(),
        numero: form.numero.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        anotacoes: form.anotacoes.trim() || undefined,
        fazendaIds: form.fazendaIds,
        restauranteIds: form.restauranteIds,
        turmaIds: form.turmaIds,
        precos: precosArray,
      }
      const url = editando ? `/api/contratos/${editando.id}` : '/api/contratos'
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json(); setErro(d.error || 'Erro'); return }
      const data = await res.json()
      setModalAberto(false)
      if (editando) setItems((p) => p.map((i) => (i.id === editando.id ? data : i)))
      else setItems((p) => [...p, data])
    } catch { setErro('Erro de conexão') }
    finally { setCarregando(false) }
  }

  async function toggleAtivo(item: Contrato) {
    const res = await fetch(`/api/contratos/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !item.ativo }),
    })
    if (res.ok) {
      const data = await res.json()
      setItems((p) => p.map((i) => (i.id === item.id ? data : i)))
    }
  }

  // Turmas filtradas por fazendas selecionadas no form
  const turmasFiltradas = form.fazendaIds.length > 0
    ? turmas.filter((t) => form.fazendaIds.includes(t.fazendaId))
    : turmas

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setAbaAtiva('ativos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              abaAtiva === 'ativos' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Ativos ({items.filter((i) => i.ativo).length})
          </button>
          <button
            onClick={() => setAbaAtiva('inativos')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              abaAtiva === 'inativos' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Inativos ({items.filter((i) => !i.ativo).length})
          </button>
        </div>
        <button onClick={abrirNovo} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium">
          + Novo Contrato
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Vínculos</th>
              <th className="px-4 py-3 text-center">Requisitantes</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div>{item.nome}</div>
                  {item.descricao && <div className="text-xs text-gray-400 truncate max-w-xs">{item.descricao}</div>}
                  {item.anotacoes && (
                    <div className="text-xs text-amber-600 mt-1 max-w-xs whitespace-pre-line line-clamp-2" title={item.anotacoes}>
                      📝 {item.anotacoes}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{item.numero ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.restaurantes.map((r) => {
                      const pc = item.precosContrato.find((p) => p.restauranteId === r.id)
                      const precoStr = pc
                        ? [pc.precoCafeManha, pc.precoAlmoco, pc.precoJantar].filter((v) => v != null).map((v) => `R$${v!.toFixed(2).replace('.', ',')}`).join(' / ')
                        : null
                      return (
                        <span key={r.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          🍴 {r.nome}{precoStr ? ` (${precoStr})` : ''}
                        </span>
                      )
                    })}
                    {item.fazendas.map((f) => (
                      <span key={f.id} className="text-xs bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">🏭 {f.nome}</span>
                    ))}
                    {item.turmas.map((t) => (
                      <span key={t.id} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">👥 {t.nome}</span>
                    ))}
                    {item.restaurantes.length === 0 && item.fazendas.length === 0 && item.turmas.length === 0 && (
                      <span className="text-xs text-gray-400">Sem vínculos</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-700">{item._count.requisitantes}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
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
        {itensFiltrados.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {abaAtiva === 'ativos' ? 'Nenhum contrato ativo' : 'Nenhum contrato inativo'}
          </p>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">{editando ? 'Editar Contrato' : 'Novo Contrato'}</h2>

            {/* Campos básicos */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome <span className="text-red-500">*</span></label>
                <input type="text" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Contrato Fazenda A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                <input type="text" value={form.numero} onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                  placeholder="Ex: 2024/001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  placeholder="Detalhes do contrato (opcional)" rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Anotações / Particularidades</label>
                <textarea value={form.anotacoes} onChange={(e) => setForm((p) => ({ ...p, anotacoes: e.target.value }))}
                  placeholder="Ex: Não aceita pedido após 15h, somente almoço aos sábados..." rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none" />
              </div>
            </div>

            {/* Restaurantes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">🍴 Restaurantes vinculados</label>
              <div className="border border-gray-200 rounded-lg divide-y max-h-36 overflow-y-auto">
                {restaurantes.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Nenhum restaurante cadastrado</p>}
                {restaurantes.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={form.restauranteIds.includes(r.id)}
                      onChange={() => toggleId('restauranteIds', r.id)} className="accent-green-600" />
                    <span className="text-sm text-gray-700">{r.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preços por restaurante */}
            {form.restauranteIds.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">💰 Preços por restaurante (R$)</label>
                <div className="border border-gray-200 rounded-lg divide-y">
                  {form.restauranteIds.map((restId) => {
                    const rest = restaurantes.find((r) => r.id === restId)
                    const p = precos[restId] ?? { precoCafeManha: '', precoAlmoco: '', precoJantar: '', linkGrupoWhatsApp: '' }
                    return (
                      <div key={restId} className="px-3 py-2 space-y-1.5">
                        <p className="text-sm font-medium text-gray-700">{rest?.nome}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { label: 'Cafe', field: 'precoCafeManha' as const },
                            { label: 'Almoco', field: 'precoAlmoco' as const },
                            { label: 'Jantar', field: 'precoJantar' as const },
                          ]).map(({ label, field }) => (
                            <div key={field}>
                              <label className="block text-[10px] text-gray-400 mb-0.5">{label}</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={p[field]}
                                onChange={(e) => setPrecoField(restId, field, e.target.value)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="mt-1.5">
                          <label className="block text-[10px] text-gray-400 mb-0.5">Link Grupo WhatsApp</label>
                          <input
                            type="url"
                            placeholder="https://chat.whatsapp.com/XXXXX"
                            value={p.linkGrupoWhatsApp}
                            onChange={(e) => setPrecoField(restId, 'linkGrupoWhatsApp', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Fazendas */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">🏭 Fazendas vinculadas</label>
              <div className="border border-gray-200 rounded-lg divide-y max-h-36 overflow-y-auto">
                {fazendas.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">Nenhuma fazenda cadastrada</p>}
                {fazendas.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={form.fazendaIds.includes(f.id)}
                      onChange={() => toggleId('fazendaIds', f.id)} className="accent-green-600" />
                    <span className="text-sm text-gray-700">{f.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Turmas — filtradas pelas fazendas selecionadas */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                👥 Turmas vinculadas
                {form.fazendaIds.length > 0 && <span className="text-gray-400 font-normal ml-1">(das fazendas selecionadas)</span>}
              </label>
              <div className="border border-gray-200 rounded-lg divide-y max-h-40 overflow-y-auto">
                {turmasFiltradas.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">
                  {form.fazendaIds.length > 0 ? 'Nenhuma turma nas fazendas selecionadas' : 'Nenhuma turma cadastrada'}
                </p>}
                {turmasFiltradas.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={form.turmaIds.includes(t.id)}
                      onChange={() => toggleId('turmaIds', t.id)} className="accent-green-600" />
                    <span className="text-sm text-gray-700">
                      {t.nome}
                      {t.fazenda && <span className="text-xs text-gray-400 ml-1">({t.fazenda.nome})</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {erro && <p className="text-red-600 text-sm">{erro}</p>}
            <div className="flex gap-2 pt-1">
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
