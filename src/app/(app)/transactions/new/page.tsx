export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import TransactionForm from '@/components/TransactionForm'
import type { Account } from '@/lib/types'

export default async function NewTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at')

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-5" style={{ color: 'var(--text-primary)' }}>
        Nueva Transacción
      </h1>
      <TransactionForm accounts={accounts as Account[] ?? []} />
    </div>
  )
}
