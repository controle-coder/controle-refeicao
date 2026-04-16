import { prisma } from './prisma'
import { TipoRefeicao, Status } from '@/generated/prisma/enums'

export interface ItemInput {
  tipoRefeicao: TipoRefeicao
  quantidade: number
}

export interface CriarPedidoInput {
  restauranteId: number
  fazendaId: number
  turmaId: number
  requisitanteId: number
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
    const pedido = await tx.pedido.create({
      data: {
        restauranteId: input.restauranteId,
        fazendaId: input.fazendaId,
        turmaId: input.turmaId,
        requisitanteId: input.requisitanteId,
        versaoAtual: 1,
        status: Status.ABERTO,
      },
    })

    const versao = await tx.versaoPedido.create({
      data: {
        pedidoId: pedido.id,
        numero: 1,
        observacao: input.observacao,
        criadoPorId: input.requisitanteId,
        itens: {
          create: input.itens
            .filter((i) => i.quantidade > 0)
            .map((i) => ({
              tipoRefeicao: i.tipoRefeicao,
              quantidade: i.quantidade,
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

    const novoNumero = pedido.versaoAtual + 1

    const versao = await tx.versaoPedido.create({
      data: {
        pedidoId: pedido.id,
        numero: novoNumero,
        observacao: input.observacao,
        criadoPorId: input.usuarioId,
        itens: {
          create: input.itens
            .filter((i) => i.quantidade > 0)
            .map((i) => ({
              tipoRefeicao: i.tipoRefeicao,
              quantidade: i.quantidade,
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
