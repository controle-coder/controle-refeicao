import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/relatorios/[tipo]'>) {
  try {
    await requireAdmin()
    const { tipo } = await ctx.params
    const { searchParams } = new URL(request.url)

    const de = searchParams.get('de') ? new Date(searchParams.get('de')!) : undefined
    const ate = searchParams.get('ate') ? new Date(searchParams.get('ate')!) : undefined

    const dateFilter = {
      ...(de || ate
        ? {
            criadoEm: {
              ...(de ? { gte: de } : {}),
              ...(ate ? { lte: ate } : {}),
            },
          }
        : {}),
    }

    if (tipo === 'restaurante') {
      const restauranteId = searchParams.get('restauranteId')
      const pedidos = await prisma.pedido.findMany({
        where: {
          ...(restauranteId ? { restauranteId: Number(restauranteId) } : {}),
          ...dateFilter,
        },
        include: {
          restaurante: true,
          fazenda: true,
          turma: true,
          requisitante: { select: { id: true, nome: true } },
          versoes: {
            orderBy: { numero: 'desc' },
            take: 1,
            include: { itens: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
      })
      return Response.json(pedidos)
    }

    if (tipo === 'fazenda') {
      const fazendaId = searchParams.get('fazendaId')
      const pedidos = await prisma.pedido.findMany({
        where: {
          ...(fazendaId ? { fazendaId: Number(fazendaId) } : {}),
          ...dateFilter,
        },
        include: {
          restaurante: true,
          fazenda: true,
          turma: true,
          requisitante: { select: { id: true, nome: true } },
          versoes: {
            orderBy: { numero: 'desc' },
            take: 1,
            include: { itens: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
      })
      return Response.json(pedidos)
    }

    if (tipo === 'turma') {
      const turmaId = searchParams.get('turmaId')
      const pedidos = await prisma.pedido.findMany({
        where: {
          ...(turmaId ? { turmaId: Number(turmaId) } : {}),
          ...dateFilter,
        },
        include: {
          restaurante: true,
          fazenda: true,
          turma: true,
          requisitante: { select: { id: true, nome: true } },
          versoes: {
            orderBy: { numero: 'desc' },
            take: 1,
            include: { itens: true },
          },
        },
        orderBy: { criadoEm: 'desc' },
      })
      return Response.json(pedidos)
    }

    return Response.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (e: any) {
    return authError(e.message)
  }
}
