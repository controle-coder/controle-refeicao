import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get('data') // YYYY-MM-DD

    // Data alvo: parâmetro ou hoje
    const dataAlvo = dataParam ?? new Date().toISOString().split('T')[0]
    const inicioDia = new Date(dataAlvo + 'T00:00:00.000Z')
    const fimDia    = new Date(dataAlvo + 'T23:59:59.999Z')

    const pedidos = await prisma.pedido.findMany({
      where: {
        restauranteId: session.restauranteId,
        dataRefeicao: { gte: inicioDia, lte: fimDia },
        status: { not: 'CANCELADO' },
      },
      include: {
        fazenda: { select: { nome: true } },
        turma: { select: { nome: true } },
        requisitante: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
      orderBy: { criadoEm: 'asc' },
    })

    return Response.json(pedidos)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
