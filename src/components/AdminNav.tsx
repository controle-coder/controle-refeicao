'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
  exact?: boolean
}

interface NavSection {
  title?: string
  items: NavItem[]
}

const sections: NavSection[] = [
  {
    items: [
      { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { href: '/admin/restaurantes',         label: 'Restaurantes',  icon: '🍴' },
      { href: '/admin/fazendas',             label: 'Fazendas',      icon: '🌿' },
      { href: '/admin/turmas',               label: 'Turmas',        icon: '👥' },
      { href: '/admin/contratos',            label: 'Contratos',     icon: '📄' },
      { href: '/admin/requisitantes',        label: 'Requisitantes', icon: '👤' },
      { href: '/admin/usuarios-restaurante', label: 'Usuários',      icon: '🍽️' },
    ],
  },
  {
    title: 'Operações',
    items: [
      { href: '/admin/pedidos',    label: 'Pedidos',    icon: '📋' },
      { href: '/admin/relatorios', label: 'Relatórios', icon: '📈' },
      { href: '/admin/backup',     label: 'Backup',     icon: '💾' },
    ],
  },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Sidebar desktop */}
      <nav className="w-52 bg-gray-950 shrink-0 hidden md:flex flex-col border-r border-gray-800">
        <div className="flex-1 p-3 space-y-5 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
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
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 flex z-50">
        {sections.flatMap((s) => s.items).slice(0, 5).map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
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
