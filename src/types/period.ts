export type Period = {
	id: string
	year: number
	month: number
	openingBalances: Record<string, number>
	createdAt: Date
}
