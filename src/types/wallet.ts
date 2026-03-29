export type Wallet = {
	id: string
	name: string
	initialBalance: number
	createdAt: Date
	order?: number
	archived?: boolean
}
