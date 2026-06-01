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
    const de  = searchParams.get('de')  // YYYY-MM-DD
    const ate = searchParams.get('ate') // YYYY-MM-DD

    if (!de || !ate || !/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
      return Response.json({ error: 'Parâmetros de e ate são obrigatórios (YYYY-MM-DD)' }, { status: 400 })
    }

    const inicio = new Date(de  + 'T00:00:00.000Z')
    const fim    = new Date(ate + 'T23:59:59.999Z')

    const pedidos = await prisma.pedido.findMany({
      where: {
        restauranteId: session.restauranteId,
        dataRefeicao: { gte: inicio, lte: fim },
        status: { not: 'CANCELADO' },
      },
      include: {
        fazenda:      { select: { nome: true } },
        turma:        { select: { nome: true } },
        requisitante: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
      orderBy: [{ dataRefeicao: 'asc' }, { criadoEm: 'asc' }],
    })

    return Response.json(pedidos)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
