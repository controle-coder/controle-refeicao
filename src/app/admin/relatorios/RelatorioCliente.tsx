'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type Modo = 'refeicoes' | 'financeiro'

const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
  ALMOCO_SELF: 'Almoço Self Service',
  JANTAR_SELF: 'Jantar Self Service',
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
interface Fazenda { id: number; nome: string; turmas: { id: number }[] }
interface Turma { id: number; nome: string; fazendaId: number; fazenda: { nome: string } }
interface Contrato {
  id: number; nome: string; numero?: string | null
  fazendas:      { id: number }[]
  turmas:        { id: number }[]
  restaurantes:  { id: number }[]
  requisitantes: { id: number }[]
}
interface Requisitante { id: number; nome: string; fazendaId?: number | null; turmaId?: number | null }

interface PrecoContrato {
  id: number
  contratoId: number
  restauranteId: number
  precoCafeManha: number | null
  precoAlmoco: number | null
  precoJantar: number | null
  precoAlmocoSelf: number | null
  precoJantarSelf: number | null
}
interface ItemRefeicao { tipoRefeicao: string; quantidade: number; observacao?: string | null }
interface Versao { itens: ItemRefeicao[] }
interface ContratoPedido { id: number; nome: string; numero?: string | null; precosContrato: PrecoContrato[] }
interface Pedido {
  id: number
  dataRefeicao: string
  status: string
  restaurante: { id: number; nome: string }
  fazenda: { nome: string } | null
  turma: { nome: string } | null
  requisitante: { nome: string } | null
  // Contrato fixado no pedido na criação — fonte do preço (imune a transferências do solicitante).
  contrato: ContratoPedido | null
  nomeVisitante?: string | null
  sobrenomeVisitante?: string | null
  versoes: Versao[]
}

function precoDoItem(pedido: Pedido, tipo: string): number | null {
  // Preço vem do contrato gravado no pedido (Pedido.contratoId), não dos contratos atuais do solicitante.
  const pc = pedido.contrato?.precosContrato.find((p) => p.restauranteId === pedido.restaurante.id)
  if (!pc) return null
  const mapa: Record<string, number | null | undefined> = {
    CAFE_MANHA: pc.precoCafeManha,
    ALMOCO: pc.precoAlmoco,
    JANTAR: pc.precoJantar,
    ALMOCO_SELF: pc.precoAlmocoSelf,
    JANTAR_SELF: pc.precoJantarSelf,
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
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
}

export function RelatorioCliente({ restaurantes, fazendas, turmas, contratos, requisitantes }: {
  restaurantes: Restaurante[]
  fazendas: Fazenda[]
  turmas: Turma[]
  contratos: Contrato[]
  requisitantes: Requisitante[]
}) {
  const [filtroContratoId,    setFiltroContratoId]    = useState<number>(0)
  const [filtroFazendaId,     setFiltroFazendaId]     = useState<number>(0)
  const [filtroTurmaId,       setFiltroTurmaId]       = useState<number>(0)
  const [filtroSolicitanteId, setFiltroSolicitanteId] = useState<number>(0)
  const [filtroRestauranteId, setFiltroRestauranteId] = useState<number>(0)
  const [deText, setDeText] = useState('')
  const [ateText, setAteText] = useState('')
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [erroDe, setErroDe] = useState('')
  const [erroAte, setErroAte] = useState('')
  const [dados, setDados] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<Modo>('refeicoes')

  // ── Cascade: opções disponíveis conforme seleções superiores ──────────────
  // Ordem: Contrato → Restaurante → Solicitante → Fazenda → Turma

  const contratoSel    = contratos.find(c => c.id === filtroContratoId) ?? null
  const solicitanteSel = requisitantes.find(r => r.id === filtroSolicitanteId) ?? null

  const restaurantesOpcoes = contratoSel
    ? restaurantes.filter(r => contratoSel.restaurantes.some(cr => cr.id === r.id))
    : restaurantes

  const solicitantesOpcoes = contratoSel
    ? requisitantes.filter(s => contratoSel.requisitantes.some(cr => cr.id === s.id))
    : requisitantes

  const fazendasOpcoes = (() => {
    let r = fazendas
    if (contratoSel)    r = r.filter(f => contratoSel.fazendas.some(cf => cf.id === f.id))
    if (solicitanteSel?.fazendaId) r = r.filter(f => f.id === solicitanteSel.fazendaId)
    return r
  })()

  const turmasOpcoes = (() => {
    let r = turmas
    if (contratoSel)               r = r.filter(t => contratoSel.turmas.some(ct => ct.id === t.id))
    if (solicitanteSel?.turmaId)   r = r.filter(t => t.id === solicitanteSel.turmaId)
    if (filtroFazendaId)           r = r.filter(t => t.fazendaId === filtroFazendaId)
    return r
  })()

  // ── Handlers com reset em cascata ─────────────────────────────────────────

  function handleContratoChange(id: number) {
    setFiltroContratoId(id)
    setFiltroRestauranteId(0)
    setFiltroSolicitanteId(0)
    setFiltroFazendaId(0)
    setFiltroTurmaId(0)
  }

  function handleSolicitanteChange(id: number) {
    setFiltroSolicitanteId(id)
    setFiltroFazendaId(0)
    setFiltroTurmaId(0)
  }

  function handleFazendaChange(id: number) {
    setFiltroFazendaId(id)
    setFiltroTurmaId(0)
  }

  function handleTurmaChange(id: number) {
    setFiltroTurmaId(id)
  }

  function formatarEntradaData(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
  }

  function parseBRDate(str: string): string | null {
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!m) return null
    const d = +m[1], mo = +m[2], y = +m[3]
    const date = new Date(y, mo - 1, d)
    if (date.getFullYear() !== y || date.getMonth() + 1 !== mo || date.getDate() !== d) return null
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function handleDeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatarEntradaData(e.target.value)
    setDeText(formatted)
    if (!formatted) { setErroDe(''); setDe(''); return }
    if (formatted.length === 10) {
      const iso = parseBRDate(formatted)
      if (!iso) { setErroDe('Data inválida'); setDe('') }
      else { setErroDe(''); setDe(iso) }
    } else {
      setErroDe(''); setDe('')
    }
  }

  function handleAteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatarEntradaData(e.target.value)
    setAteText(formatted)
    if (!formatted) { setErroAte(''); setAte(''); return }
    if (formatted.length === 10) {
      const iso = parseBRDate(formatted)
      if (!iso) { setErroAte('Data inválida'); setAte('') }
      else { setErroAte(''); setAte(iso) }
    } else {
      setErroAte(''); setAte('')
    }
  }

  // ── Buscar ────────────────────────────────────────────────────────────────

  async function buscar() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroContratoId)    params.set('contratoId',     String(filtroContratoId))
      if (filtroFazendaId)     params.set('fazendaId',      String(filtroFazendaId))
      if (filtroTurmaId)       params.set('turmaId',        String(filtroTurmaId))
      if (filtroSolicitanteId) params.set('requisitanteId', String(filtroSolicitanteId))
      if (filtroRestauranteId) params.set('restauranteId',  String(filtroRestauranteId))
      if (de)  params.set('de',  de)
      if (ate) params.set('ate', ate)
      const res = await fetch(`/api/relatorios/fazenda?${params}`)
      setDados(await res.json())
    } catch {
      setDados([])
    } finally {
      setCarregando(false)
    }
  }

  // ── Métricas ──────────────────────────────────────────────────────────────

  const ativos        = dados.filter((p) => p.status !== 'CANCELADO')
  const totalPedidos  = dados.length
  const totalRefeicoes = ativos.reduce((s, p) => s + (p.versoes[0]?.itens.reduce((ss, i) => ss + i.quantidade, 0) ?? 0), 0)
  const totalValor    = ativos.reduce((s, p) => s + calcularValor(p), 0)
  const confirmados   = dados.filter((p) => p.status === 'CONFIRMADO').length
  const taxaConf      = totalPedidos > 0 ? Math.round((confirmados / totalPedidos) * 100) : 0
  const temPrecos     = ativos.some((p) => calcularValor(p) > 0)

  // ── Gráfico por tipo ──────────────────────────────────────────────────────

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

  // ── Gráfico por dia ───────────────────────────────────────────────────────

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

  // ── Gráfico por contrato ──────────────────────────────────────────────────

  const porContrato: Record<string, { qtd: number; valor: number }> = {}
  ativos.forEach((p) => {
    const chave = p.contrato
      ? (p.contrato.numero ? `${p.contrato.numero} – ${p.contrato.nome}` : p.contrato.nome)
      : 'Sem contrato'
    if (!porContrato[chave]) porContrato[chave] = { qtd: 0, valor: 0 }
    p.versoes[0]?.itens.forEach((i) => {
      porContrato[chave].qtd += i.quantidade
      const pr = precoDoItem(p, i.tipoRefeicao)
      if (pr != null) porContrato[chave].valor += pr * i.quantidade
    })
  })
  const graficoContrato = Object.entries(porContrato)
    .sort(([, a], [, b]) => b.qtd - a.qtd)
    .map(([nome, v]) => ({
      nome,
      Quantidade: v.qtd,
      Valor: parseFloat(v.valor.toFixed(2)),
    }))

  // ── CSV ───────────────────────────────────────────────────────────────────

  function exportarCSV() {
    const cabecalho = ['#', 'Data Refeição', 'Restaurante', 'Fazenda', 'Turma', 'Requisitante', 'Tipo', 'Qtd', 'Preço Unit.', 'Subtotal', 'Status', 'Colaboradores'].join(';')
    const linhas = ativos.flatMap((p) =>
      (p.versoes[0]?.itens ?? []).map((i) => {
        const pr = precoDoItem(p, i.tipoRefeicao)
        return [
          p.id,
          fmtData(p.dataRefeicao),
          p.restaurante.nome,
          p.fazenda?.nome ?? '—',
          p.turma?.nome ?? '—',
          p.requisitante?.nome ?? ([p.nomeVisitante, p.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante'),
          TIPO_LABELS[i.tipoRefeicao] ?? i.tipoRefeicao,
          i.quantidade,
          pr != null ? pr.toFixed(2).replace('.', ',') : '',
          pr != null ? (pr * i.quantidade).toFixed(2).replace('.', ',') : '',
          STATUS_LABELS[p.status] ?? p.status,
          i.observacao ?? '',
        ].join(';')
      })
    )
    const csv = [cabecalho, ...linhas].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `relatorio-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const dataKey = modo === 'refeicoes' ? 'Quantidade' : 'Valor'
  const cor     = modo === 'refeicoes' ? '#16a34a' : '#2563eb'

  // ── Select helper ─────────────────────────────────────────────────────────

  const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400'
  const labelCls  = 'block text-xs font-medium text-gray-500 mb-1.5'

  return (
    <div className="space-y-5">

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-5 space-y-4">

        {/* Linha 1: Contrato → Restaurante → Solicitante → Fazenda → Turma */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Contrato</label>
            <select
              value={filtroContratoId}
              onChange={(e) => handleContratoChange(Number(e.target.value))}
              className={selectCls}
            >
              <option value={0}>Todos</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero ? `${c.numero} – ${c.nome}` : c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Restaurante</label>
            <select
              value={filtroRestauranteId}
              onChange={(e) => setFiltroRestauranteId(Number(e.target.value))}
              className={selectCls}
            >
              <option value={0}>Todos</option>
              {restaurantesOpcoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Solicitante</label>
            <select
              value={filtroSolicitanteId}
              onChange={(e) => handleSolicitanteChange(Number(e.target.value))}
              className={selectCls}
            >
              <option value={0}>Todos</option>
              {solicitantesOpcoes.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Fazenda</label>
            <select
              value={filtroFazendaId}
              onChange={(e) => handleFazendaChange(Number(e.target.value))}
              disabled={fazendasOpcoes.length === 0}
              className={selectCls}
            >
              <option value={0}>Todas</option>
              {fazendasOpcoes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Linha 2: Turma + Datas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Turma</label>
            <select
              value={filtroTurmaId}
              onChange={(e) => handleTurmaChange(Number(e.target.value))}
              disabled={turmasOpcoes.length === 0}
              className={selectCls}
            >
              <option value={0}>Todas</option>
              {turmasOpcoes.map((t) => (
                <option key={t.id} value={t.id}>{t.nome} ({t.fazenda.nome})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Data início</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={deText}
              onChange={handleDeChange}
              maxLength={10}
              className={`${selectCls} ${erroDe ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {erroDe && <p className="text-xs text-red-500 mt-1">{erroDe}</p>}
          </div>

          <div>
            <label className={labelCls}>Data fim</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="dd/mm/aaaa"
              value={ateText}
              onChange={handleAteChange}
              maxLength={10}
              className={`${selectCls} ${erroAte ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {erroAte && <p className="text-xs text-red-500 mt-1">{erroAte}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={buscar}
            disabled={carregando || !!erroDe || !!erroAte}
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
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
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

          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              {modo === 'refeicoes' ? 'Quantidade por contrato' : 'Valor por contrato'}
            </h3>
            {graficoContrato.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={graficoContrato} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v) => [modo === 'financeiro' ? fmtReal(Number(v)) : v, dataKey]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  />
                  <Bar dataKey={dataKey} fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">
                Nenhum dado disponível
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
                      <td className="px-4 py-3 text-gray-500">{p.fazenda?.nome ?? '—'} · {p.turma?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.requisitante?.nome ?? ([p.nomeVisitante, p.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante')}
                      </td>
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
            <span className="bg-gray-100 px-3 py-1 rounded-full">Por contrato</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Valores financeiros</span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">Exportar CSV</span>
          </div>
        </div>
      )}
    </div>
  )
}
