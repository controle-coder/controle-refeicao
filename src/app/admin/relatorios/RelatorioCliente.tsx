'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TIPO_LABELS: Record<string, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  LANCHE: 'Lanche',
  JANTAR: 'Jantar',
  CEIA: 'Ceia',
}

interface Restaurante { id: number; nome: string }
interface Fazenda { id: number; nome: string }
interface Turma { id: number; nome: string; fazenda: { nome: string } }

interface ItemRefeicao { tipoRefeicao: string; quantidade: number }
interface Versao { itens: ItemRefeicao[] }
interface Pedido {
  id: number
  criadoEm: string
  status: string
  restaurante: { nome: string }
  fazenda: { nome: string }
  turma: { nome: string }
  requisitante: { nome: string }
  versoes: Versao[]
}

export function RelatorioCliente({ restaurantes, fazendas, turmas }: { restaurantes: Restaurante[]; fazendas: Fazenda[]; turmas: Turma[] }) {
  const [tipo, setTipo] = useState('restaurante')
  const [filtroId, setFiltroId] = useState<number>(0)
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [dados, setDados] = useState<Pedido[]>([])
  const [carregando, setCarregando] = useState(false)

  async function buscar() {
    setCarregando(true)
    try {
      const params = new URLSearchParams()
      if (filtroId) params.set(`${tipo}Id`, String(filtroId))
      if (de) params.set('de', de)
      if (ate) params.set('ate', ate)
      const res = await fetch(`/api/relatorios/${tipo}?${params}`)
      const data = await res.json()
      setDados(data)
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

  // Agregar por tipo de refeição
  const agregado: Record<string, number> = {}
  dados.forEach((p) => {
    p.versoes[0]?.itens.forEach((item) => {
      agregado[item.tipoRefeicao] = (agregado[item.tipoRefeicao] ?? 0) + item.quantidade
    })
  })
  const graficoData = Object.entries(agregado).map(([tipo, total]) => ({
    nome: TIPO_LABELS[tipo] ?? tipo,
    total,
  }))

  const totalGeral = Object.values(agregado).reduce((s, v) => s + v, 0)

  function exportarCSV() {
    const linhas = [
      ['#', 'Data', 'Restaurante', 'Fazenda', 'Turma', 'Requisitante', 'Tipo', 'Quantidade'].join(';'),
      ...dados.flatMap((p) =>
        (p.versoes[0]?.itens ?? []).map((item) =>
          [p.id, new Date(p.criadoEm).toLocaleDateString('pt-BR'), p.restaurante.nome, p.fazenda.nome, p.turma.nome, p.requisitante.nome, TIPO_LABELS[item.tipoRefeicao] ?? item.tipoRefeicao, item.quantidade].join(';')
        )
      ),
    ].join('\n')
    const blob = new Blob(['\uFEFF' + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de Relatório</label>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setFiltroId(0) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="restaurante">Por Restaurante</option>
              <option value="fazenda">Por Fazenda</option>
              <option value="turma">Por Turma</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filtrar por</label>
            <select value={filtroId} onChange={(e) => setFiltroId(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value={0}>Todos</option>
              {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={buscar} disabled={carregando}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400 text-sm font-medium">
            {carregando ? 'Buscando...' : 'Buscar'}
          </button>
          {dados.length > 0 && (
            <button onClick={exportarCSV}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {dados.length > 0 && (
        <>
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">Resumo</h2>
              <span className="text-sm text-gray-500">{dados.length} pedidos · {totalGeral} refeições</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graficoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Restaurante</th>
                  <th className="px-4 py-3 text-left">Fazenda / Turma</th>
                  <th className="px-4 py-3 text-left">Requisitante</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((p) => {
                  const total = p.versoes[0]?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0
                  return (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">#{p.id}</td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(p.criadoEm).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-2 text-gray-800">{p.restaurante.nome}</td>
                      <td className="px-4 py-2 text-gray-500">{p.fazenda.nome} / {p.turma.nome}</td>
                      <td className="px-4 py-2 text-gray-500">{p.requisitante.nome}</td>
                      <td className="px-4 py-2 text-right font-medium">{total}</td>
                      <td className="px-4 py-2 text-gray-500">{p.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {dados.length === 0 && !carregando && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p>Selecione os filtros e clique em Buscar</p>
        </div>
      )}
    </div>
  )
}
