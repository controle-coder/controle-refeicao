'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/gestor/pedidos',    label: 'Pedidos',    icon: '📋' },
  { href: '/gestor/relatorios', label: 'Relatórios', icon: '📈' },
]

export function GestorNav() {
  const pathname = usePathname()

  return (
    <>
      <nav className="w-48 bg-gray-950 shrink-0 hidden md:flex flex-col border-r border-gray-800">
        <div className="p-3 space-y-0.5">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-600 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                }`}
              >
                <span className="text-base w-5 text-center leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex z-50">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] transition-colors ${
                isActive ? 'text-green-400' : 'text-gray-500 hover:text-gray-200'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
