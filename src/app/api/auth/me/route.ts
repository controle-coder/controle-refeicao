import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session.id) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }
  return Response.json({
    id: session.id,
    nome: session.nome,
    role: session.role,
    fazendaId: session.fazendaId,
    turmaId: session.turmaId,
  })
}

export async function DELETE() {
  const session = await getSession()
  session.destroy()
  return Response.json({ ok: true })
}
