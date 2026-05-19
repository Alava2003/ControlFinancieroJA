export const dynamic = 'force-dynamic'

import AnalyticsClient from '@/components/AnalyticsClient'

export default function AnalyticsPage() {
  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
        Visualización
      </h1>
      <AnalyticsClient />
    </div>
  )
}
