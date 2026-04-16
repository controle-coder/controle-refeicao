import Link from 'next/link'

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <Link href="/pedidos/novo" className="font-bold text-lg">
          🍽️ Pedidos de Refeição
        </Link>
        <Link
          href="/login"
          className="text-green-200 hover:text-white text-sm"
        >
          Admin →
        </Link>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto p-4">{children}</main>
    </div>
  )
}
