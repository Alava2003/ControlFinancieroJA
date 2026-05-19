export type AccountType = 'banco' | 'efectivo'
export type TransactionType = 'ingreso' | 'gasto' | 'transferencia'
export type LoanStatus = 'pendiente' | 'pagado'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  balance: number
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  type: TransactionType
  amount: number
  category: string | null
  description: string | null
  date: string
  to_account_id: string | null
  created_at: string
  accounts?: Account
}

export interface Loan {
  id: string
  user_id: string
  debtor_name: string
  amount: number
  date: string
  status: LoanStatus
  origin_account_id: string | null
  description: string | null
  paid_at: string | null
  created_at: string
  accounts?: Account
}
