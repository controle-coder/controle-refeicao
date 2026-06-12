import { requireAdmin, authError } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    await requireAdmin()
  } catch (e: unknown) {
    return authError((e as Error).message)
  }

  const [
    contratos,
    restaurantes,
    precosContrato,
    fazendas,
    turmas,
    requisitantes,
    pedidos,
    versoesPedido,
    itensRefeicao,
  ] = await Promise.all([
    prisma.contrato.findMany(),
    prisma.restaurante.findMany(),
    prisma.precoContrato.findMany(),
    prisma.fazenda.findMany(),
    prisma.turma.findMany(),
    prisma.requisitante.findMany(),
    prisma.pedido.findMany(),
    prisma.versaoPedido.findMany(),
    prisma.itemRefeicao.findMany(),
  ])

  const backup = {
    meta: {
      versao: '1.0',
      geradoEm: new Date().toISOString(),
      totalRegistros:
        contratos.length +
        restaurantes.length +
        precosContrato.length +
        fazendas.length +
        turmas.length +
        requisitantes.length +
        pedidos.length +
        versoesPedido.length +
        itensRefeicao.length,
    },
    dados: {
      contratos,
      restaurantes,
      precosContrato,
      fazendas,
      turmas,
      requisitantes,
      pedidos,
      versoesPedido,
      itensRefeicao,
    },
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `backup_${timestamp}.json`

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
