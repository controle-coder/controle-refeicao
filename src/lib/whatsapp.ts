import { TipoRefeicao } from '@/generated/prisma/enums'

const LABELS_TIPO: Record<TipoRefeicao, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  LANCHE: 'Lanche',
  JANTAR: 'Jantar',
  CEIA: 'Ceia',
}

export interface ItemMensagem {
  tipoRefeicao: TipoRefeicao
  quantidade: number
}

export interface DadosMensagem {
  versao: number
  data: Date
  fazenda: string
  turma: string
  requisitante: string
  itens: ItemMensagem[]
  observacao?: string | null
}

export function gerarMensagemPedido(dados: DadosMensagem): string {
  const dataFormatada = dados.data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const itensLinhas = dados.itens
    .filter((i) => i.quantidade > 0)
    .map(
      (i) =>
        `• ${LABELS_TIPO[i.tipoRefeicao]}: ${i.quantidade} refeição${i.quantidade !== 1 ? 'ões' : ''}`
    )
    .join('\n')

  let mensagem = `*PEDIDO DE REFEIÇÃO - V${dados.versao}*\n`
  mensagem += `📅 Data: ${dataFormatada}\n`
  mensagem += `🏭 Fazenda: ${dados.fazenda}\n`
  mensagem += `👥 Turma: ${dados.turma}\n`
  mensagem += `👤 Requisitante: ${dados.requisitante}\n\n`
  mensagem += `*ITENS:*\n${itensLinhas}`

  if (dados.observacao) {
    mensagem += `\n\n*Observação:* ${dados.observacao}`
  }

  mensagem += `\n\n_Enviado via Sistema de Pedidos_`

  return mensagem
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  // Garantir que telefone contenha apenas dígitos
  const tel = telefone.replace(/\D/g, '')
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`
}
