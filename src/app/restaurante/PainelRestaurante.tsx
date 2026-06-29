'use client'

import { useEffect, useState, useRef } from 'react'

const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
  ALMOCO_SELF: 'Almoço Self Service',
  JANTAR_SELF: 'Jantar Self Service',
}

const TIPO_ORDEM: Record<string, number> = {
  CAFE_MANHA: 0,
  ALMOCO: 1,
  JANTAR: 2,
  ALMOCO_SELF: 3,
  JANTAR_SELF: 4,
}

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  ENVIADO: 'Enviado',
  CONFIRMADO: 'Confirmado',
}

const STATUS_COLORS: Record<string, string> = {
  ABERTO: 'bg-yellow-100 text-yellow-800',
  ENVIADO: 'bg-blue-100 text-blue-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Item {
  id: number
  tipoRefeicao: string
  quantidade: number
  observacao?: string | null
}

interface Pedido {
  id: number
  status: string
  dataRefeicao: string
  atualizadoEm: string
  fazenda: { nome: string } | null
  turma: { nome: string } | null
  requisitante: { nome: string } | null
  // Contrato fixado no pedido na criação — fonte do preço (imune a transferências do solicitante).
  contratoId: number | null
  nomeVisitante?: string | null
  sobrenomeVisitante?: string | null
  versoes: { itens: Item[] }[]
}

interface DiaSemana {
  data: string
  cafe: number
  almoco: number
  jantar: number
}

interface Fazenda { id: number; nome: string }
interface Turma   { id: number; nome: string; fazendaId: number }

interface PrecoContrato {
  id: number
  contratoId: number
  restauranteId: number
  precoCafeManha: number | null
  precoAlmoco: number | null
  precoJantar: number | null
  precoAlmocoSelf: number | null
  precoJantarSelf: number | null
  contrato: { id: number; nome: string }
}

interface Props {
  restaurante: { id: number; nome: string; linkGrupoWhatsApp?: string | null; precosContrato: PrecoContrato[] }
  pedidosIniciais: Pedido[]
  nomeUsuario: string
  fazendas: Fazenda[]
  turmas: Turma[]
}

function buscarPreco(precosContrato: PrecoContrato[], contratoIds: number[], tipoRefeicao: string): number | null {
  for (const cid of contratoIds) {
    const pc = precosContrato.find((p) => p.contratoId === cid)
    if (pc) {
      const mapa: Record<string, number | null> = {
        CAFE_MANHA: pc.precoCafeManha,
        ALMOCO: pc.precoAlmoco,
        JANTAR: pc.precoJantar,
        ALMOCO_SELF: pc.precoAlmocoSelf,
        JANTAR_SELF: pc.precoJantarSelf,
      }
      return mapa[tipoRefeicao] ?? null
    }
  }
  return null
}

function formatarReal(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

function localDateStr(offsetDias = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDias)
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function PainelRestaurante({ restaurante, pedidosIniciais, nomeUsuario, fazendas, turmas }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>(pedidosIniciais)
  const [data, setData] = useState(localDateStr(0))
  const [carregando, setCarregando] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS')
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [erroConfirmar, setErroConfirmar] = useState<number | null>(null)
  const [semana, setSemana] = useState<DiaSemana[] | null>(null)
  const [carregandoSemana, setCarregandoSemana] = useState(false)
  const [mostrarSemana, setMostrarSemana] = useState(false)

  // editar pedido
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [qtdsEditar, setQtdsEditar] = useState<Record<string, number>>({ CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 })
  const [obsEditar, setObsEditar] = useState('')
  const [erroEditar, setErroEditar] = useState('')
  const [carregandoEditar, setCarregandoEditar] = useState(false)

  const [podeCCompartilhar, setPodeCompartilhar] = useState(false)

  useEffect(() => {
    setPodeCompartilhar('share' in navigator)
  }, [])

  // exportar CSV
  const [modalExportar, setModalExportar] = useState(false)
  const [exportarDe, setExportarDe] = useState(localDateStr(0))
  const [exportarAte, setExportarAte] = useState(localDateStr(0))
  const [exportandoCSV, setExportandoCSV] = useState(false)
  const [erroExportar, setErroExportar] = useState('')

  // pedido avulso
  const [modalAvulso, setModalAvulso] = useState(false)
  const [avulsoNome, setAvulsoNome] = useState('')
  const [avulsoSobrenome, setAvulsoSobrenome] = useState('')
  const [avulsoData, setAvulsoData] = useState(localDateStr(0))
  const [avulsoFazendaId, setAvulsoFazendaId] = useState<number | ''>('')
  const [avulsoTurmaId, setAvulsoTurmaId] = useState<number | ''>('')
  const [avulsoQtds, setAvulsoQtds] = useState<Record<string, number>>({ CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 })
  const [erroAvulso, setErroAvulso] = useState('')
  const [carregandoAvulso, setCarregandoAvulso] = useState(false)

  async function buscarData(novaData: string) {
    setData(novaData)
    setCarregando(true)
    try {
      const res = await fetch(`/api/restaurante/pedidos?data=${novaData}`)
      const json = await res.json()
      setPedidos(Array.isArray(json) ? json : [])
    } catch {
      setPedidos([])
    } finally {
      setCarregando(false)
    }
  }

  async function toggleSemana() {
    if (mostrarSemana) {
      setMostrarSemana(false)
      return
    }
    setMostrarSemana(true)
    if (semana !== null) return
    setCarregandoSemana(true)
    try {
      const res = await fetch('/api/restaurante/semana')
      const json = await res.json()
      setSemana(Array.isArray(json) ? json : [])
    } catch {
      setSemana([])
    } finally {
      setCarregandoSemana(false)
    }
  }

  async function confirmar(id: number) {
    setConfirmando(id)
    setErroConfirmar(null)
    try {
      const res = await fetch(`/api/restaurante/pedidos/${id}/confirmar`, { method: 'PATCH' })
      if (res.ok) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'CONFIRMADO' } : p))
        )
      } else {
        const json = await res.json().catch(() => ({}))
        console.error('Erro ao confirmar:', res.status, json)
        setErroConfirmar(id)
        setTimeout(() => setErroConfirmar(null), 4000)
      }
    } catch {
      setErroConfirmar(id)
      setTimeout(() => setErroConfirmar(null), 4000)
    } finally {
      setConfirmando(null)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/login'
  }

  async function salvarPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const dataFormatada = formatarData(data + 'T12:00:00Z')

    const totaisLocal: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
    pedidos.forEach((p) => p.versoes[0]?.itens.forEach((i) => {
      totaisLocal[i.tipoRefeicao] = (totaisLocal[i.tipoRefeicao] ?? 0) + i.quantidade
    }))
    const totalLocal = Object.values(totaisLocal).reduce((s, v) => s + v, 0)

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(restaurante.nome, 15, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Pedidos para ${dataFormatada}`, 15, 26)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0)
    doc.text(`Total: ${totalLocal}   Cafe: ${totaisLocal.CAFE_MANHA}   Almoco: ${totaisLocal.ALMOCO}   Jantar: ${totaisLocal.JANTAR}   Almoco Self: ${totaisLocal.ALMOCO_SELF}   Jantar Self: ${totaisLocal.JANTAR_SELF}`, 15, 34)

    doc.setDrawColor(200)
    doc.line(15, 39, 195, 39)

    let y = 49
    const pageH = 280

    pedidos.forEach((pedido) => {
      const itens = (pedido.versoes[0]?.itens ?? [])
        .filter((i) => i.quantidade > 0)
        .sort((a, b) => (TIPO_ORDEM[a.tipoRefeicao] ?? 0) - (TIPO_ORDEM[b.tipoRefeicao] ?? 0))
      if (!itens.length) return

      if (y + (2 + itens.length) * 6 > pageH) { doc.addPage(); y = 20 }

      const fazenda = pedido.fazenda?.nome ?? '—'
      const turma = pedido.turma?.nome ?? '—'
      const req = pedido.requisitante?.nome ?? ([pedido.nomeVisitante, pedido.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante')
      const hora = formatarHora(pedido.atualizadoEm)
      const totalPedido = itens.reduce((s, i) => s + i.quantidade, 0)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(0)
      doc.text(fazenda, 15, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(60)
      doc.text(`${totalPedido} ref.`, 195, y, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(120)
      doc.text(`${turma} · ${req} · ${hora}`, 15, y + 5)

      y += 11

      itens.forEach((item) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(60)
        doc.text(TIPO_LABELS[item.tipoRefeicao], 22, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0)
        doc.text(String(item.quantidade), 195, y, { align: 'right' })
        y += 5.5
      })

      doc.setDrawColor(230)
      doc.line(15, y + 1, 195, y + 1)
      y += 6
    })

    doc.save(`pedidos-${dataFormatada.replace(/\//g, '-')}.pdf`)
  }

  async function exportarCSV() {
    setExportandoCSV(true)
    setErroExportar('')
    try {
      const res = await fetch(`/api/restaurante/pedidos/exportar?de=${exportarDe}&ate=${exportarAte}`)
      if (!res.ok) { setErroExportar('Erro ao buscar pedidos'); return }
      const dados: Pedido[] = await res.json()

      if (dados.length === 0) { setErroExportar('Nenhum pedido no período selecionado'); return }

      const temPrecoLocal = restaurante.precosContrato.length > 0

      const cabecalho = ['Data', 'Fazenda', 'Turma', 'Requisitante', 'Café da Manhã', 'Almoço', 'Jantar', 'Almoço Self Service', 'Jantar Self Service', 'Total', ...(temPrecoLocal ? ['Valor (R$)'] : []), 'Status', 'Horário']

      const linhas = dados.map((p: Pedido) => {
        const itensMap: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
        p.versoes[0]?.itens.forEach((i) => { itensMap[i.tipoRefeicao] = i.quantidade })
        const total = itensMap.CAFE_MANHA + itensMap.ALMOCO + itensMap.JANTAR + itensMap.ALMOCO_SELF + itensMap.JANTAR_SELF
        const dataFmt = formatarData(p.dataRefeicao)
        const fazenda = p.fazenda?.nome ?? ''
        const turma = p.turma?.nome ?? ''
        const req = p.requisitante?.nome ?? ([p.nomeVisitante, p.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante')
        const status = STATUS_LABELS[p.status] ?? p.status
        const hora = formatarHora(p.atualizadoEm)

        const cols = [dataFmt, fazenda, turma, req, itensMap.CAFE_MANHA, itensMap.ALMOCO, itensMap.JANTAR, itensMap.ALMOCO_SELF, itensMap.JANTAR_SELF, total]

        if (temPrecoLocal) {
          const contratoIds = p.contratoId != null ? [p.contratoId] : []
          let valor = 0
          for (const tipo of ['CAFE_MANHA', 'ALMOCO', 'JANTAR', 'ALMOCO_SELF', 'JANTAR_SELF']) {
            const preco = buscarPreco(restaurante.precosContrato, contratoIds, tipo)
            if (preco != null) valor += preco * itensMap[tipo]
          }
          cols.push(valor.toFixed(2).replace('.', ','))
        }

        cols.push(status, hora)
        return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')
      })

      const csv = '﻿' + [cabecalho.map((c) => `"${c}"`).join(';'), ...linhas].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pedidos-${exportarDe}-a-${exportarAte}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setModalExportar(false)
    } catch {
      setErroExportar('Erro de conexão')
    } finally {
      setExportandoCSV(false)
    }
  }

  async function compartilharWhatsApp() {
    const dataFormatada = formatarData(data + 'T12:00:00Z')
    const totaisLocal: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
    pedidos.forEach((p) => p.versoes[0]?.itens.forEach((i) => {
      totaisLocal[i.tipoRefeicao] = (totaisLocal[i.tipoRefeicao] ?? 0) + i.quantidade
    }))
    const totalLocal = Object.values(totaisLocal).reduce((s, v) => s + v, 0)

    let texto = `*${restaurante.nome}*\n📅 ${dataFormatada}\n\n`
    texto += `📊 *Resumo do dia*\nTotal: *${totalLocal}* refeições\n`
    if (totaisLocal.CAFE_MANHA > 0)  texto += `☕ Café da Manhã: *${totaisLocal.CAFE_MANHA}*\n`
    if (totaisLocal.ALMOCO > 0)      texto += `🍽️ Almoço: *${totaisLocal.ALMOCO}*\n`
    if (totaisLocal.JANTAR > 0)      texto += `🌙 Jantar: *${totaisLocal.JANTAR}*\n`
    if (totaisLocal.ALMOCO_SELF > 0) texto += `🍴 Almoço Self Service: *${totaisLocal.ALMOCO_SELF}*\n`
    if (totaisLocal.JANTAR_SELF > 0) texto += `🍴 Jantar Self Service: *${totaisLocal.JANTAR_SELF}*\n`

    if (pedidos.length > 0) {
      texto += `\n*Pedidos:*\n`
      pedidos.forEach((p) => {
        const qtd = p.versoes[0]?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
        const fazenda = p.fazenda?.nome ?? '—'
        const turma = p.turma?.nome ?? '—'
        texto += `• #${p.id} — ${fazenda} (${turma}): *${qtd}* ref.\n`
      })
    }

    if ('share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: { text: string }) => Promise<void> }).share({ text: texto })
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
    }
  }

  const TIPOS = ['CAFE_MANHA', 'ALMOCO', 'JANTAR', 'ALMOCO_SELF', 'JANTAR_SELF'] as const


  function abrirEditar(pedido: Pedido) {
    const mapa: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
    for (const item of pedido.versoes[0]?.itens ?? []) mapa[item.tipoRefeicao] = item.quantidade
    setQtdsEditar(mapa)
    setObsEditar('')
    setErroEditar('')
    setEditandoId(pedido.id)
  }

  async function salvarEditar() {
    if (!editandoId) return
    if (obsEditar.trim().length < 5) { setErroEditar('Informe a observação (mínimo 5 caracteres)'); return }
    if (!TIPOS.some((t) => qtdsEditar[t] > 0)) { setErroEditar('Informe pelo menos uma refeição com quantidade > 0'); return }
    setCarregandoEditar(true)
    setErroEditar('')
    try {
      const res = await fetch(`/api/restaurante/pedidos/${editandoId}/editar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: TIPOS.map((t) => ({ tipoRefeicao: t, quantidade: qtdsEditar[t] ?? 0 })),
          observacao: obsEditar.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErroEditar(json.error || 'Erro ao editar'); return }
      setPedidos((prev) => prev.map((p) => (p.id === editandoId ? { ...p, ...json } : p)))
      setEditandoId(null)
    } catch {
      setErroEditar('Erro de conexão')
    } finally {
      setCarregandoEditar(false)
    }
  }

  function abrirAvulso() {
    setAvulsoNome('')
    setAvulsoSobrenome('')
    setAvulsoData(data)
    setAvulsoFazendaId('')
    setAvulsoTurmaId('')
    setAvulsoQtds({ CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 })
    setErroAvulso('')
    setModalAvulso(true)
  }

  const enviandoAvulsoRef = useRef(false)

  async function salvarAvulso() {
    if (enviandoAvulsoRef.current) return
    if (!avulsoNome.trim()) { setErroAvulso('Informe o nome'); return }
    if (!avulsoSobrenome.trim()) { setErroAvulso('Informe o sobrenome'); return }
    if (!TIPOS.some((t) => avulsoQtds[t] > 0)) { setErroAvulso('Informe pelo menos uma refeição'); return }
    enviandoAvulsoRef.current = true
    setCarregandoAvulso(true)
    setErroAvulso('')
    try {
      const res = await fetch('/api/restaurante/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeVisitante: avulsoNome.trim(),
          sobrenomeVisitante: avulsoSobrenome.trim(),
          dataRefeicao: avulsoData,
          ...(avulsoFazendaId ? { fazendaId: avulsoFazendaId } : {}),
          ...(avulsoTurmaId  ? { turmaId:  avulsoTurmaId  } : {}),
          itens: TIPOS.map((t) => ({ tipoRefeicao: t, quantidade: avulsoQtds[t] ?? 0 })),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setErroAvulso(json.error || 'Erro ao lançar pedido'); return }
      if (avulsoData === data) setPedidos((prev) => [...prev, json])
      setModalAvulso(false)
    } catch {
      setErroAvulso('Erro de conexão')
    } finally {
      enviandoAvulsoRef.current = false
      setCarregandoAvulso(false)
    }
  }

  // Totais consolidados por tipo
  const totais: Record<string, number> = { CAFE_MANHA: 0, ALMOCO: 0, JANTAR: 0, ALMOCO_SELF: 0, JANTAR_SELF: 0 }
  pedidos.forEach((p) => {
    p.versoes[0]?.itens.forEach((i) => {
      totais[i.tipoRefeicao] = (totais[i.tipoRefeicao] ?? 0) + i.quantidade
    })
  })
  const totalGeral = Object.values(totais).reduce((s, v) => s + v, 0)

  const confirmados = pedidos.filter((p) => p.status === 'CONFIRMADO').length
  const pendentes = pedidos.length - confirmados

  // Valor total do dia (só se houver preços cadastrados)
  const temPrecos = restaurante.precosContrato.length > 0
  let valorTotalDia = 0
  if (temPrecos) {
    pedidos.forEach((p) => {
      const contratoIds = p.contratoId != null ? [p.contratoId] : []
      p.versoes[0]?.itens.forEach((i) => {
        const preco = buscarPreco(restaurante.precosContrato, contratoIds, i.tipoRefeicao)
        if (preco != null) valorTotalDia += preco * i.quantidade
      })
    })
  }

  const pedidosFiltrados = pedidos.filter((p) => {
    if (tipoFiltro === 'TODOS') return true
    return p.versoes[0]?.itens.some((i) => i.tipoRefeicao === tipoFiltro)
  })

  return (
    <>
      {/* Cabeçalho apenas na impressão */}
      <div className="hidden print:block p-4 border-b mb-4">
        <h1 className="text-lg font-bold">{restaurante.nome}</h1>
        <p className="text-sm text-gray-600">Pedidos para {formatarData(data + 'T12:00:00Z')}</p>
        <div className="flex gap-6 mt-1 text-sm">
          <span>Total: <strong>{totalGeral}</strong></span>
          <span>Café: <strong>{totais.CAFE_MANHA}</strong></span>
          <span>Almoço: <strong>{totais.ALMOCO}</strong></span>
          <span>Jantar: <strong>{totais.JANTAR}</strong></span>
          <span>Almoço Self: <strong>{totais.ALMOCO_SELF}</strong></span>
          <span>Jantar Self: <strong>{totais.JANTAR_SELF}</strong></span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 print:py-0 print:px-2">

        {/* Header */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{restaurante.nome}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Olá, {nomeUsuario}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={abrirAvulso}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              + Pedido Avulso
            </button>
            {restaurante.linkGrupoWhatsApp && (
              <a
                href={restaurante.linkGrupoWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            )}
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">
              Sair
            </button>
          </div>
        </div>

        {/* Seletor de data */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 print:hidden">
          <span className="text-sm text-gray-500 shrink-0">Data:</span>
          <input
            type="date"
            value={data}
            onChange={(e) => buscarData(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-1">
            <button
              onClick={() => buscarData(localDateStr(0))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${data === localDateStr(0) ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => buscarData(localDateStr(1))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${data === localDateStr(1) ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Amanhã
            </button>
            <button
              onClick={toggleSemana}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mostrarSemana ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Semana
            </button>
          </div>
        </div>

        {/* Vista da semana */}
        {mostrarSemana && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 print:hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Próximos 7 dias</h2>
            {carregandoSemana ? (
              <p className="text-xs text-gray-400 text-center py-4">Carregando...</p>
            ) : semana && semana.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b">
                    <th className="text-left pb-2 font-medium">Data</th>
                    <th className="text-center pb-2 font-medium">Café</th>
                    <th className="text-center pb-2 font-medium">Almoço</th>
                    <th className="text-center pb-2 font-medium">Jantar</th>
                    <th className="text-center pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {semana.map((dia) => {
                    const d = new Date(dia.data + 'T12:00:00Z')
                    const nomeDia = DIAS_SEMANA[d.getUTCDay()]
                    const total = dia.cafe + dia.almoco + dia.jantar
                    const isHoje = dia.data === localDateStr(0)
                    return (
                      <tr key={dia.data} className={isHoje ? 'font-semibold' : ''}>
                        <td className="py-2 text-gray-700">
                          <span className={`mr-1 ${isHoje ? 'text-green-600' : 'text-gray-400'}`}>{nomeDia}</span>
                          {formatarData(dia.data + 'T12:00:00Z')}
                          {isHoje && <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded">hoje</span>}
                        </td>
                        <td className="text-center py-2 text-gray-600">{dia.cafe || '—'}</td>
                        <td className="text-center py-2 text-gray-600">{dia.almoco || '—'}</td>
                        <td className="text-center py-2 text-gray-600">{dia.jantar || '—'}</td>
                        <td className="text-center py-2 font-bold text-gray-800">{total || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum pedido nos próximos 7 dias</p>
            )}
          </div>
        )}

        {/* Totais por tipo */}
        <div className="grid grid-cols-3 gap-2 print:hidden">
          {[
            { tipo: 'TODOS', label: 'Total', valor: totalGeral },
            { tipo: 'CAFE_MANHA', label: 'Café', valor: totais.CAFE_MANHA },
            { tipo: 'ALMOCO', label: 'Almoço', valor: totais.ALMOCO },
            { tipo: 'JANTAR', label: 'Jantar', valor: totais.JANTAR },
            { tipo: 'ALMOCO_SELF', label: 'Almoço Self', valor: totais.ALMOCO_SELF },
            { tipo: 'JANTAR_SELF', label: 'Jantar Self', valor: totais.JANTAR_SELF },
          ].map(({ tipo, label, valor }) => (
            <button
              key={tipo}
              onClick={() => setTipoFiltro(tipo)}
              className={`rounded-xl p-3 text-center transition-colors border ${
                tipoFiltro === tipo
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-white border-gray-100 shadow-sm hover:bg-green-50'
              }`}
            >
              <div className={`text-2xl font-bold ${tipoFiltro === tipo ? 'text-white' : 'text-gray-800'}`}>{valor}</div>
              <div className={`text-xs mt-0.5 ${tipoFiltro === tipo ? 'text-green-100' : 'text-gray-400'}`}>{label}</div>
            </button>
          ))}
        </div>

        {/* Status de confirmação + valor do dia + botão imprimir */}
        <div className="flex items-center gap-3 print:hidden flex-wrap">
          {pedidos.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-bold">{confirmados}</span>
                <span className="text-xs">confirmado{confirmados !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm">
                <span className="font-bold">{pendentes}</span>
                <span className="text-xs">pendente{pendentes !== 1 ? 's' : ''}</span>
              </div>
              {temPrecos && valorTotalDia > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm">
                  <span className="text-xs">Total:</span>
                  <span className="font-bold">{formatarReal(valorTotalDia)}</span>
                </div>
              )}
            </>
          )}
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => { setExportarDe(localDateStr(-6)); setExportarAte(localDateStr(0)); setErroExportar(''); setModalExportar(true) }}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <line x1="10" y1="9" x2="8" y2="9"/>
              </svg>
              Exportar CSV
            </button>
            {podeCCompartilhar && (
              <button
                onClick={compartilharWhatsApp}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartilhar
              </button>
            )}
            <button
              onClick={salvarPDF}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V3m0 12-4-4m4 4 4-4"/>
                <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
              </svg>
              Salvar PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide print:hidden">
            {carregando ? 'Carregando...' : `${pedidosFiltrados.length} pedido${pedidosFiltrados.length !== 1 ? 's' : ''} — ${formatarData(data + 'T12:00:00Z')}`}
          </p>

          {!carregando && pedidosFiltrados.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center print:hidden">
              <p className="text-gray-400 text-sm">Nenhum pedido para esta data</p>
            </div>
          )}

          {pedidosFiltrados.map((pedido) => {
            const itens = (pedido.versoes[0]?.itens ?? [])
              .filter((i) => tipoFiltro === 'TODOS' || i.tipoRefeicao === tipoFiltro)
              .sort((a, b) => (TIPO_ORDEM[a.tipoRefeicao] ?? 0) - (TIPO_ORDEM[b.tipoRefeicao] ?? 0))

            const total = itens.reduce((s, i) => s + i.quantidade, 0)
            const isConfirmado = pedido.status === 'CONFIRMADO'

            // Subtotal financeiro do pedido (todos os itens, não só os filtrados)
            let subtotalPedido: number | null = null
            if (temPrecos) {
              const contratoIds = pedido.contratoId != null ? [pedido.contratoId] : []
              subtotalPedido = 0
              ;(pedido.versoes[0]?.itens ?? []).forEach((i) => {
                const preco = buscarPreco(restaurante.precosContrato, contratoIds, i.tipoRefeicao)
                if (preco != null) subtotalPedido! += preco * i.quantidade
              })
            }

            return (
              <div
                key={pedido.id}
                className={`bg-white rounded-xl border shadow-sm p-4 space-y-3 transition-colors print:border print:shadow-none print:rounded-none print:border-x-0 print:border-t-0 ${isConfirmado ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{pedido.fazenda?.nome ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {pedido.turma?.nome ?? '—'} · {pedido.requisitante?.nome ?? ([pedido.nomeVisitante, pedido.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante')}
                      <span className="ml-1.5 text-gray-300">·</span>
                      <span className="ml-1.5">{formatarHora(pedido.atualizadoEm)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 rounded-full px-2 py-0.5">
                      {total} ref.
                    </span>
                    {subtotalPedido != null && subtotalPedido > 0 && (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 rounded-full px-2 py-0.5">
                        {formatarReal(subtotalPedido)}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full print:hidden ${STATUS_COLORS[pedido.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[pedido.status] ?? pedido.status}
                    </span>
                  </div>
                </div>

                {/* Itens */}
                <div className="space-y-1.5">
                  {itens.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{TIPO_LABELS[item.tipoRefeicao]}</span>
                        <span className="font-semibold text-gray-800">{item.quantidade}</span>
                      </div>
                      {item.observacao && (
                        <p className="text-xs text-gray-400 italic ml-1">↳ {item.observacao}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Botão confirmar */}
                {!isConfirmado && (
                  <div className="print:hidden">
                    <button
                      onClick={() => confirmar(pedido.id)}
                      disabled={confirmando === pedido.id}
                      className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-green-400 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {confirmando === pedido.id ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                          </svg>
                          Confirmando...
                        </>
                      ) : '✓ Confirmar Entrega'}
                    </button>
                    {erroConfirmar === pedido.id && (
                      <p className="text-center text-xs text-red-600 mt-1.5">
                        Erro ao confirmar. Tente novamente ou recarregue a página.
                      </p>
                    )}
                  </div>
                )}

                {isConfirmado && (
                  <div className="print:hidden flex items-center justify-center gap-1.5 bg-green-100 text-green-700 rounded-lg py-2.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-sm font-semibold">Entrega confirmada</span>
                  </div>
                )}

                <div className="print:hidden">
                  <button
                    onClick={() => abrirEditar(pedido)}
                    className="w-full border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-medium py-2 rounded-lg transition-colors"
                  >
                    Editar Pedido
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal editar pedido ── */}
      {editandoId !== null && (() => {
        const pedidoEditando = pedidos.find((p) => p.id === editandoId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditandoId(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div>
                <h2 className="text-base font-bold text-gray-800">Editar Pedido #{editandoId}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pedidoEditando?.fazenda?.nome ?? '—'} · {pedidoEditando?.requisitante?.nome ?? ([pedidoEditando?.nomeVisitante, pedidoEditando?.sobrenomeVisitante].filter(Boolean).join(' ') || 'Visitante')}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Quantidades</p>
                {TIPOS.map((tipo) => (
                  <div key={tipo} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-600">{TIPO_LABELS[tipo]}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQtdsEditar((p) => ({ ...p, [tipo]: Math.max(0, (p[tipo] ?? 0) - 1) }))}
                        className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                      >−</button>
                      <span className="w-8 text-center font-bold text-gray-900">{qtdsEditar[tipo] ?? 0}</span>
                      <button
                        onClick={() => setQtdsEditar((p) => ({ ...p, [tipo]: (p[tipo] ?? 0) + 1 }))}
                        className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Observação <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={obsEditar}
                  onChange={(e) => { setObsEditar(e.target.value); setErroEditar('') }}
                  placeholder="Descreva o motivo da alteração..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={3}
                  autoFocus
                />
                {erroEditar && <p className="text-xs text-red-600">{erroEditar}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditandoId(null)}
                  disabled={carregandoEditar}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
                >Cancelar</button>
                <button
                  onClick={salvarEditar}
                  disabled={carregandoEditar}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-semibold"
                >{carregandoEditar ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal exportar CSV ── */}
      {modalExportar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalExportar(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-gray-800">Exportar CSV</h2>
              <p className="text-xs text-gray-500 mt-0.5">Selecione o período para exportar os pedidos.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Data inicial</label>
                <input
                  type="date"
                  value={exportarDe}
                  onChange={(e) => { setExportarDe(e.target.value); setErroExportar('') }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Data final</label>
                <input
                  type="date"
                  value={exportarAte}
                  min={exportarDe}
                  onChange={(e) => { setExportarAte(e.target.value); setErroExportar('') }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Hoje', de: localDateStr(0), ate: localDateStr(0) },
                { label: 'Últimos 7 dias', de: localDateStr(-6), ate: localDateStr(0) },
                { label: 'Últimos 30 dias', de: localDateStr(-29), ate: localDateStr(0) },
              ].map(({ label, de, ate }) => (
                <button
                  key={label}
                  onClick={() => { setExportarDe(de); setExportarAte(ate); setErroExportar('') }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${exportarDe === de && exportarAte === ate ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {erroExportar && <p className="text-xs text-red-600">{erroExportar}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setModalExportar(false)}
                disabled={exportandoCSV}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >Cancelar</button>
              <button
                onClick={exportarCSV}
                disabled={exportandoCSV || !exportarDe || !exportarAte}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                {exportandoCSV ? 'Exportando...' : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 15V3m0 12-4-4m4 4 4-4"/>
                      <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"/>
                    </svg>
                    Baixar CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal pedido avulso ── */}
      {modalAvulso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalAvulso(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-bold text-gray-800">Pedido Avulso</h2>
              <p className="text-xs text-gray-500 mt-0.5">Para quem chegou sem cadastro.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={avulsoNome}
                  onChange={(e) => { setAvulsoNome(e.target.value); setErroAvulso('') }}
                  placeholder="Nome"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Sobrenome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={avulsoSobrenome}
                  onChange={(e) => { setAvulsoSobrenome(e.target.value); setErroAvulso('') }}
                  placeholder="Sobrenome"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Data das refeições</label>
              <input
                type="date"
                value={avulsoData}
                onChange={(e) => setAvulsoData(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {fazendas.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Fazenda</label>
                <select
                  value={avulsoFazendaId}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    setAvulsoFazendaId(val)
                    setAvulsoTurmaId('')
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Selecione —</option>
                  {fazendas.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {avulsoFazendaId !== '' && turmas.filter((t) => t.fazendaId === avulsoFazendaId).length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Turma</label>
                <select
                  value={avulsoTurmaId}
                  onChange={(e) => setAvulsoTurmaId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Selecione —</option>
                  {turmas.filter((t) => t.fazendaId === avulsoFazendaId).map((t) => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Refeições</p>
              {TIPOS.map((tipo) => (
                <div key={tipo} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600">{TIPO_LABELS[tipo]}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAvulsoQtds((p) => ({ ...p, [tipo]: Math.max(0, (p[tipo] ?? 0) - 1) }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                    >−</button>
                    <span className="w-8 text-center font-bold text-gray-900">{avulsoQtds[tipo] ?? 0}</span>
                    <button
                      onClick={() => setAvulsoQtds((p) => ({ ...p, [tipo]: (p[tipo] ?? 0) + 1 }))}
                      className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center font-bold"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            {erroAvulso && <p className="text-xs text-red-600">{erroAvulso}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setModalAvulso(false)}
                disabled={carregandoAvulso}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >Cancelar</button>
              <button
                onClick={salvarAvulso}
                disabled={carregandoAvulso}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 text-sm font-semibold"
              >{carregandoAvulso ? 'Salvando...' : 'Lançar Pedido'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
