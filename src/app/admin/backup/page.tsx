'use client'

import { useState } from 'react'

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleDownload() {
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/admin/backup')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao gerar backup')
      }

      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="(.+)"/)
      const filename = match?.[1] || 'backup.json'

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      setStatus({ type: 'success', message: `Backup "${filename}" baixado com sucesso.` })
    } catch (e: unknown) {
      setStatus({ type: 'error', message: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Backup</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-1">Backup JSON (via navegador)</h2>
          <p className="text-sm text-gray-400">
            Exporta todos os dados do sistema (contratos, restaurantes, fazendas, turmas,
            requisitantes, pedidos e itens) em um arquivo JSON. O download inclui metadados
            como data de exportacao e total de registros.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={loading}
          className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm px-5 py-2.5 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Gerando backup...' : 'Baixar backup JSON'}
        </button>

        {status && (
          <p className={`text-sm ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {status.message}
          </p>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3 mt-4">
        <h2 className="text-lg font-semibold mb-1">Backup SQL (via servidor)</h2>
        <p className="text-sm text-gray-400">
          Para um backup completo do banco (schema + dados), use o script no servidor:
        </p>
        <pre className="bg-gray-950 text-gray-300 text-xs p-3 rounded-lg overflow-x-auto">
          {`# Backup manual\n./scripts/backup.sh\n\n# Agendar backup diario (crontab -e)\n0 3 * * * cd /caminho/do/projeto && ./scripts/backup.sh`}
        </pre>
        <p className="text-xs text-gray-500">
          Os dumps SQL sao salvos em <code className="text-gray-400">./backups/</code> e limpos automaticamente apos 30 dias.
        </p>
      </div>
    </div>
  )
}
