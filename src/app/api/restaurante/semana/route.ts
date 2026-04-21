import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const hoje = new Date()
    const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate(), 0, 0, 0))
    const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + 6, 23, 59, 59, 999))

    const pedidos = await prisma.pedido.findMany({
      where: {
        restauranteId: session.restauranteId,
        dataRefeicao: { gte: inicio, lte: fim },
        status: { not: 'CANCELADO' },
      },
      select: {
        dataRefeicao: true,
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          select: { itens: { select: { tipoRefeicao: true, quantidade: true } } },
        },
      },
    })

    // Inicializa os 7 dias
    const porDia: Record<string, { cafe: number; almoco: number; jantar: number }> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + i))
      porDia[d.toISOString().split('T')[0]] = { cafe: 0, almoco: 0, jantar: 0 }
    }

    pedidos.forEach((p) => {
      const key = p.dataRefeicao.toISOString().split('T')[0]
      if (!porDia[key]) return
      p.versoes[0]?.itens.forEach((item) => {
        if (item.tipoRefeicao === 'CAFE_MANHA') porDia[key].cafe += item.quantidade
        else if (item.tipoRefeicao === 'ALMOCO') porDia[key].almoco += item.quantidade
        else if (item.tipoRefeicao === 'JANTAR') porDia[key].jantar += item.quantidade
      })
    })

    const resultado = Object.entries(porDia).map(([data, totais]) => ({ data, ...totais }))
    return Response.json(resultado)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
