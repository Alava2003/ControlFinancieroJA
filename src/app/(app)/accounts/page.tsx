export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import AccountsClient from '@/components/AccountsClient'
import type { Account } from '@/lib/types'

export default async function AccountsPage() {
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
        Mis Cuentas
      </h1>
      <AccountsClient accounts={accounts as Account[] ?? []} />
    </div>
  )
}
