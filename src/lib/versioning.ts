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
        .map((i) => ({ tipoRefeicao: i.tipoRefeicao, quantidade: i.quantidade })),
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
