'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Modo = 'refeicoes' | 'financeiro'

const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  ENVIADO: 'Enviado',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
}

interface Restaurante { id: number; nome: string }
interface Fazenda { id: number; nome: string }
interface Turma { id: number; nome: string; fazenda: { nome: string } }

interface ItemRefeicao { tipoRefeicao: string; quantidade: number }
interface Versao { itens: ItemRefeicao[] }
interface Pedido {
  id: number
  dataRefeicao: string
  status: string
  restaurante: { nome: string; precoCafeManha?: number | null; precoAlmoco?: number | null; precoJantar?: number | null }
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: Versao[]
}

function precoDoItem(pedido: Pedido, tipo: string): number | null {
  const mapa: Record<string, number | null | undefined> = {
    CAFE_MANHA: pedido.restaurante.precoCafeManha,
    ALMOCO: pedido.restaurante.precoAlmoco,
    JANTAR: pedido.restaurante.precoJantar,
  }
  return mapa[tipo] ?? null
}

function calcularValor(pedido: Pedido): number {
  return (pedido.versoes[0]?.itens ?? []).reduce((s, i) => {
    const p = precoDoItem(pedido, i.tipoRefeicao)
    return s + (p != null ? p * i.quantidade : 0)
  }, 0)
}

function fmtReal(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
}

export function RelatorioCliente({ restaurantes, fazendas, turmas }: {
  restaurantes: Restaurante[]
  fazendas: Fazenda[]
  turmas: Turma[]
}) {
  const [tipo, setTipo] = useState('restaurante')
  const [filtroId, setFiltroId] = useState<number>(0)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [dados, setDados] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<Modo>('refeicoes')

  async function buscar() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroId) params.set(`${tipo}Id`, String(filtroId))
      if (de) params.set('de', de)
      if (ate) params.set('ate', ate)
      const res = await fetch(`/api/relatorios/${tipo}?${params}`)
      setDados(await res.json())
    } catch {
      setDados([])
    } finally {
      setCarregando(false)
    }
  }

  const opcoes =
    tipo === 'restaurante' ? restaurantes :
    tipo === 'fazenda' ? fazendas :
    turmas.map((t) => ({ id: t.id, nome: `${t.nome} (${t.fazenda.nome})` }))

  // Métricas
  const ativos = dados.filter((p) => p.status !== 'CANCELADO')
  const totalPedidos = dados.length
  const totalRefeicoes = ativos.reduce((s, p) => s + (p.versoes[0]?.itens.reduce((ss, i) => ss + i.quantidade, 0) ?? 0), 0)
  const totalValor = ativos.reduce((s, p) => s + calcularValor(p), 0)
  const confirmados = dados.filter((p) => p.status === 'CONFIRMADO').length
  const taxaConf = totalPedidos > 0 ? Math.round((confirmados / totalPedidos) * 100) : 0
  const temPrecos = ativos.some((p) => calcularValor(p) > 0)

  // Gráfico por tipo
  const porTipo: Record<string, { qtd: number; valor: number }> = {}
  ativos.forEach((p) => {
    p.versoes[0]?.itens.forEach((i) => {
      if (!porTipo[i.tipoRefeicao]) porTipo[i.tipoRefeicao] = { qtd: 0, valor: 0 }
      porTipo[i.tipoRefeicao].qtd += i.quantidade
      const pr = precoDoItem(p, i.tipoRefeicao)
      if (pr != null) porTipo[i.tipoRefeicao].valor += pr * i.quantidade
    })
  })
  const graficoTipo = Object.entries(porTipo).map(([t, v]) => ({
    nome: TIPO_LABELS[t] ?? t,
    Quantidade: v.qtd,
    Valor: parseFloat(v.valor.toFixed(2)),
  }))

  // Gráfico por dia
  const porDia: Record<string, { qtd: number; valor: number }> = {}
  ativos.forEach((p) => {
    const dia = p.dataRefeicao.split('T')[0]
    if (!porDia[dia]) porDia[dia] = { qtd: 0, valor: 0 }
    p.versoes[0]?.itens.forEach((i) => {
      porDia[dia].qtd += i.quantidade
      const pr = precoDoItem(p, i.tipoRefeicao)
      if (pr != null) porDia[dia].valor += pr * i.quantidade
    })
  })
  const graficoDia = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, v]) => ({
      nome: fmtDataCurta(data + 'T12:00:00Z'),
      Quantidade: v.qtd,
      Valor: parseFloat(v.valor.toFixed(2)),
    }))

  function exportarCSV() {
    const cabecalho = ['#', 'Data Refeição', 'Restaurante', 'Fazenda', 'Turma', 'Requisitante', 'Tipo', 'Qtd', 'Preço Unit.', 'Subtotal', 'Status'].join(';')
    const linhas = dados.flatMap((p) =>
      (p.versoes[0]?.itens ?? []).map((i) => {
        const pr = precoDoItem(p, i.tipoRefeicao)
        return [
          p.id,
          fmtData(p.dataRefeicao),
          p.restaurante.nome,
          p.fazenda.nome,
          p.turma.nome,
          p.requisitante.nome,
          TIPO_LABELS[i.tipoRefeicao] ?? i.tipoRefeicao,
          i.quantidade,
          pr != null ? pr.toFixed(2) : '',
          pr != null ? (pr * i.quantidade).toFixed(2) : '',
          STATUS_LABELS[p.status] ?? p.status,
        ].join(';')
      })
    )
    const csv = [cabecalho, ...linhas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const dataKey = modo === 'refeicoes' ? 'Quantidade' : 'Valor'
  const cor = modo === 'refeicoes' ? '#16a34a' : '#2563eb'

  return (
    <div className="space-y-5">

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Agrupar por</label>
            <select
              value={tipo}
              onChange={(e) => { setTipo(e.target.value); setFiltroId(0) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="restaurante">Restaurante</option>
              <option value="fazenda">Fazenda</option>
              <option value="turma">Turma</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Filtrar</label>
            <select
              value={filtroId}
              onChange={(e) => setFiltroId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={0}>Todos</option>
              {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data início</label>
            <input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data fim</label>
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={buscar}
            disabled={carregando}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 text-sm font-semibold transition-colors"
          >
            {carregando ? 'Buscando...' : 'Buscar'}
          </button>
          {dados.length > 0 && (
            <button
              onClick={exportarCSV}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              Exportar CSV
            </button>
          )}
          {dados.length > 0 && temPrecos && (
            <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setModo('refeicoes')}
                className={`px-4 py-2 transition-colors ${modo === 'refeicoes' ? 'bg-green-600 text-white font-semibold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Refeições
              </button>
              <button
                onClick={() => setModo('financeiro')}
                className={`px-4 py-2 transition-colors ${modo === 'financeiro' ? 'bg-blue-600 text-white font-semibold' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Financeiro
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {dados.length > 0 && (
        <div className={`grid gap-3 ${temPrecos ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Pedidos</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{totalPedidos}</p>
            <p className="text-xs text-gray-400 mt-1">{confirmados} confirmados</p>
          </div>
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Refeições</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{totalRefeicoes}</p>
            <p className="text-xs text-gray-400 mt-1">excl. cancelamentos</p>
          </div>
          {temPrecos && (
            <div className="bg-white rounded-xl border border-l-4 border-l-blue-500 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Valor Total</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{fmtReal(totalValor)}</p>
              <p className="text-xs text-gray-400 mt-1">excl. cancelamentos</p>
            </div>
          )}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Confirmação</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{taxaConf}%</p>
            <p className="text-xs text-gray-400 mt-1">{confirmados} de {totalPedidos}</p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {dados.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {modo === 'refeicoes' ? 'Quantidade por tipo' : 'Valor por tipo'}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={graficoTipo} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [modo === 'financeiro' ? fmtReal(Number(v)) : v, dataKey]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey={dataKey} fill={cor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {modo === 'refeicoes' ? 'Evolução diária' : 'Receita por dia'}
            </h3>
            {graficoDia.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={graficoDia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [modo === 'financeiro' ? fmtReal(Number(v)) : v, dataKey]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey={dataKey} fill={cor} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">
                Selecione um período maior para ver a evolução diária
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      {dados.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b flex items-center justify-between bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-700">Detalhe por pedido</h3>
            <span className="text-xs text-gray-400">{totalPedidos} pedidos · {totalRefeicoes} refeições</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Data</th>
                  <th className="px-4 py-3 text-left font-medium">Restaurante</th>
                  <th className="px-4 py-3 text-left font-medium">Fazenda · Turma</th>
                  <th className="px-4 py-3 text-left font-medium">Requisitante</th>
                  <th className="px-4 py-3 text-center font-medium">Refeições</th>
                  {temPrecos && <th className="px-4 py-3 text-right font-medium">Valor</th>}
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dados.map((p) => {
                  const qtd = p.versoes[0]?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
                  const valor = calcularValor(p)
                  const isCancelado = p.status === 'CANCELADO'
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${isCancelado ? 'opacity-40' : ''}`}>
                      <td className="px-4 py-3 text-gray-400 text-xs">#{p.id}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtData(p.dataRefeicao)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{p.restaurante.nome}</td>
                      <td className="px-4 py-3 text-gray-500">{p.fazenda.nome} · {p.turma.nome}</td>
                      <td className="px-4 py-3 text-gray-500">{p.requisitante.nome}</td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-800">{isCancelado ? '—' : qtd}</td>
                      {temPrecos && (
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {!isCancelado && valor > 0 ? fmtReal(valor) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {dados.length === 0 && !carregando && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-sm font-medium text-gray-500">Selecione os filtros e clique em Buscar</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span className="bg-gray-100 px-3 py-1 rounded-full">Refeições por tipo</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Evolução diária</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Valores financeiros</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Exportar CSV</span>
          </div>
        </div>
      )}
    </div>
  )
}
