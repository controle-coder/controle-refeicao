/**
 * Backfill: preenche Pedido.contratoId nos pedidos existentes.
 *
 * Para cada pedido com requisitante e sem contrato, encontra o contrato do
 * requisitante que cobre o restaurante (preferindo o que tem preço) e grava.
 * Pedidos sem contrato que cubra o restaurante ficam null (ex.: solicitante
 * transferido para um contrato que não inclui aquele restaurante) → seguem "—".
 *
 * Rodar com:  npx tsx --env-file=.env prisma/backfill-contrato-pedido.ts
 */
import { prisma } from '../src/lib/prisma'
import { resolverContratoPedido } from '../src/lib/versioning'

async function main() {
  const pedidos = await prisma.pedido.findMany({
    where: { contratoId: null, requisitanteId: { not: null } },
    select: { id: true, requisitanteId: true, restauranteId: true },
    orderBy: { id: 'asc' },
  })

  console.log(`Pedidos a avaliar: ${pedidos.length}`)
  let atualizados = 0
  let semContrato = 0

  for (const p of pedidos) {
    const contratoId = await resolverContratoPedido(prisma, p.requisitanteId, p.restauranteId)
    if (contratoId == null) {
      semContrato++
      continue
    }
    await prisma.pedido.update({ where: { id: p.id }, data: { contratoId } })
    atualizados++
  }

  console.log(`✓ Atualizados com contrato: ${atualizados}`)
  console.log(`• Sem contrato que cubra o restaurante (mantidos null): ${semContrato}`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
