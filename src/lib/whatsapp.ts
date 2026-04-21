import { TipoRefeicao } from '@/generated/prisma/enums'

const LABELS_TIPO: Record<TipoRefeicao, string> = {
  CAFE_MANHA: 'Café da Manhã',
  ALMOCO: 'Almoço',
  JANTAR: 'Jantar',
}

const EMOJIS_TIPO: Record<TipoRefeicao, string> = {
  CAFE_MANHA: '☕',
  ALMOCO: '🍽️',
  JANTAR: '🌙',
}

export interface ItemMensagem {
  tipoRefeicao: TipoRefeicao
  quantidade: number
  observacao?: string | null
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
    .map((i) => {
      let linha = `${EMOJIS_TIPO[i.tipoRefeicao]} *${LABELS_TIPO[i.tipoRefeicao]}:* *${i.quantidade}* refeição${i.quantidade !== 1 ? 'ões' : ''}`
      if (i.observacao) linha += `\n   _↳ ${i.observacao}_`
      return linha
    })
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

/**
 * Para grupos: WhatsApp não suporta texto pré-preenchido em links de grupo.
 * A solução é copiar a mensagem para a área de transferência e abrir o grupo.
 * Retorna true se copiou com sucesso.
 */
export async function enviarParaGrupo(linkGrupo: string, mensagem: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(mensagem)
    window.open(linkGrupo, '_blank')
    return true
  } catch {
    // Fallback: abre o grupo mesmo sem copiar
    window.open(linkGrupo, '_blank')
    return false
  }
}
