export type Wallet = {
	id: string
	name: string
	color?: string
	initialBalance: number
	createdAt: Date
	order?: number
	archived?: boolean
}
