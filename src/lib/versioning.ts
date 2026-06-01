import { prisma } from './prisma'
import { TipoRefeicao, Status } from '@/generated/prisma/enums'
import type { Prisma } from '@/generated/prisma/client'

/**
 * Resolve o contrato que cobre o restaurante para um requisitante, no momento da criação.
 * O contrato fica gravado no pedido (Pedido.contratoId), tornando o valor do histórico
 * imune a transferências futuras do solicitante entre contratos.
 *
 * Regras:
 * - Visitante (sem requisitanteId) → null.
 * - Entre os contratos do requisitante que incluem o restaurante, prefere o que tem
 *   PrecoContrato cadastrado para ele; senão usa qualquer um que o cubra; senão null.
 */
export async function resolverContratoPedido(
  tx: Prisma.TransactionClient,
  requisitanteId: number | null | undefined,
  restauranteId: number,
): Promise<number | null> {
  if (!requisitanteId) return null

  const contratos = await tx.contrato.findMany({
    where: {
      requisitantes: { some: { id: requisitanteId } },
      restaurantes: { some: { id: restauranteId } },
    },
    select: {
      id: true,
      precosContrato: { where: { restauranteId }, select: { id: true } },
    },
    orderBy: { id: 'asc' },
  })

  if (contratos.length === 0) return null
  const comPreco = contratos.find((c) => c.precosContrato.length > 0)
  return (comPreco ?? contratos[0]).id
}

export interface ItemInput {
  tipoRefeicao: TipoRefeicao
  quantidade: number
  observacao?: string
}

export interface CriarPedidoInput {
  restauranteId: number
  fazendaId?: number
  turmaId?: number
  requisitanteId?: number
  nomeVisitante?: string
  sobrenomeVisitante?: string
  dataRefeicao: Date
  itens: ItemInput[]
  observacao?: string
}

export interface CriarNovaVersaoInput {
  pedidoId: number
  usuarioId: number
  itens: ItemInput[]
  observacao?: string
}

export async function criarPedido(input: CriarPedidoInput) {
  return prisma.$transaction(async (tx) => {
    // Verificação de duplicata: mesmo requisitante/visitante, restaurante e data nos últimos 2 min
    const janela = new Date(Date.now() - 2 * 60 * 1000)
    const duplicateWhere: Record<string, unknown> = {
      restauranteId: input.restauranteId,
      dataRefeicao: input.dataRefeicao,
      criadoEm: { gte: janela },
    }
    if (input.requisitanteId) {
      duplicateWhere.requisitanteId = input.requisitanteId
    } else {
      duplicateWhere.nomeVisitante = input.nomeVisitante
      duplicateWhere.sobrenomeVisitante = input.sobrenomeVisitante
    }
    const existente = await tx.pedido.findFirst({ where: duplicateWhere })
    if (existente) {
      throw new Error('PEDIDO_DUPLICADO')
    }

    const contratoId = await resolverContratoPedido(tx, input.requisitanteId, input.restauranteId)

    const pedido = await tx.pedido.create({
      data: {
        restauranteId: input.restauranteId,
        fazendaId: input.fazendaId ?? null,
        turmaId: input.turmaId ?? null,
        requisitanteId: input.requisitanteId ?? null,
        contratoId,
        nomeVisitante: input.nomeVisitante ?? null,
        sobrenomeVisitante: input.sobrenomeVisitante ?? null,
        dataRefeicao: input.dataRefeicao,
        versaoAtual: 1,
        status: Status.ABERTO,
      },
    })

    const versao = await tx.versaoPedido.create({
      data: {
        pedidoId: pedido.id,
        numero: 1,
        observacao: input.observacao,
        criadoPorId: input.requisitanteId ?? null,
        itens: {
          create: input.itens
            .filter((i) => i.quantidade > 0)
            .map((i) => ({
              tipoRefeicao: i.tipoRefeicao,
              quantidade: i.quantidade,
              observacao: i.observacao || null,
            })),
        },
      },
      include: { itens: true },
    })

    return { pedido, versao }
  })
}

export async function criarNovaVersao(input: CriarNovaVersaoInput) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUniqueOrThrow({
      where: { id: input.pedidoId },
    })

    if (pedido.status === Status.CANCELADO) {
      throw new Error('Pedido cancelado não pode ser editado')
    }

    // Buscar itens da versão atual para mesclar
    const versaoAtual = await tx.versaoPedido.findFirst({
      where: { pedidoId: pedido.id, numero: pedido.versaoAtual },
      include: { itens: true },
    })
    const itensAnteriores = versaoAtual?.itens ?? []

    // Tipos mencionados no input (enviados pelo usuário)
    const tiposNoInput = new Set(input.itens.map((i) => i.tipoRefeicao))

    // Mescla:
    // - Itens do input com quantidade > 0 → usam o novo valor
    // - Itens do input com quantidade = 0 → removidos (intencionalmente zerados)
    // - Itens da versão anterior NÃO mencionados no input → carregados automaticamente
    const itensMesclados: ItemInput[] = [
      ...input.itens.filter((i) => i.quantidade > 0),
      ...itensAnteriores
        .filter((i) => !tiposNoInput.has(i.tipoRefeicao) && i.quantidade > 0)
        .map((i) => ({ tipoRefeicao: i.tipoRefeicao, quantidade: i.quantidade, observacao: i.observacao ?? undefined })),
    ]

    if (itensMesclados.length === 0) {
      throw new Error('A nova versão precisa ter pelo menos uma refeição')
    }

    const novoNumero = pedido.versaoAtual + 1

    const versao = await tx.versaoPedido.create({
      data: {
        pedidoId: pedido.id,
        numero: novoNumero,
        observacao: input.observacao,
        criadoPorId: input.usuarioId,
        itens: {
          create: itensMesclados.map((i) => ({
            tipoRefeicao: i.tipoRefeicao,
            quantidade: i.quantidade,
            observacao: i.observacao || null,
          })),
        },
      },
      include: { itens: true },
    })

    const pedidoAtualizado = await tx.pedido.update({
      where: { id: pedido.id },
      data: {
        versaoAtual: novoNumero,
        status: Status.ABERTO,
      },
    })

    return { pedido: pedidoAtualizado, versao }
  })
}
