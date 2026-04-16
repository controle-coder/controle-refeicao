import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Status } from '@/generated/prisma/enums'

const schema = z.object({
  status: z.nativeEnum(Status),
})

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/pedidos/[id]/status'>) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const { status } = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status },
    })

    return Response.json(atualizado)
  } catch (e: any) {
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
