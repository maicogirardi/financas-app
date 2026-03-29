export type TransactionType = "income" | "expense" | "transfer" | "adjustment"

export type Transaction = {
	id: string
	type: TransactionType
	amount: number
	walletFrom?: string
	walletTo?: string
	category?: string
	tag?: string
	description?: string
	date: Date
	paid: boolean
	createdAt: Date
}
