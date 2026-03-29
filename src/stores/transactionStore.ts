import { reactive } from "vue"
import type { Transaction } from "@/types/transaction"
import {
	createTransactionDoc,
	deleteTransactionsByWalletDoc,
	subscribeTransactions
} from "@/services/transactions"

const state = reactive({
	transactions: [] as Transaction[],
	isLoaded: false,
	error: ""
})
let unsubscribeTransactions: null | (() => void) = null

export function useTransactionStore() {
	function setTransactions(transactions: Transaction[]) {
		state.transactions.splice(0, state.transactions.length, ...transactions)
		state.isLoaded = true
	}

	function clearTransactions() {
		if (unsubscribeTransactions) {
			unsubscribeTransactions()
			unsubscribeTransactions = null
		}

		state.transactions.splice(0, state.transactions.length)
		state.isLoaded = false
		state.error = ""
	}

	function startTransactionsSync() {
		clearTransactions()

		unsubscribeTransactions = subscribeTransactions(
			transactions => {
				setTransactions(transactions)
			},
			error => {
				state.error = error.message
				state.isLoaded = true
			}
		)
	}

	async function createTransaction(data: Omit<Transaction, "id" | "createdAt">) {
		await createTransactionDoc(data)
	}

	async function createAdjustmentTransaction(
		walletId: string,
		currentBalance: number,
		newBalance: number,
		description?: string
	) {
		const amount = Math.abs(newBalance - currentBalance)

		if (amount === 0) return

		await createTransaction({
			type: "adjustment",
			amount,
			walletFrom: newBalance < currentBalance ? walletId : undefined,
			walletTo: newBalance > currentBalance ? walletId : undefined,
			description: description?.trim() || undefined,
			date: new Date(),
			paid: true
		})
	}

	function getWalletBalance(walletId: string, initialBalance = 0) {
		return state.transactions.reduce((balance, transaction) => {
			switch (transaction.type) {
				case "income":
					return transaction.walletTo === walletId
						? balance + transaction.amount
						: balance
				case "expense":
					return transaction.walletFrom === walletId
						? balance - transaction.amount
						: balance
				case "transfer":
					if (transaction.walletFrom === walletId) {
						return balance - transaction.amount
					}

					if (transaction.walletTo === walletId) {
						return balance + transaction.amount
					}

					return balance
				case "adjustment":
					if (transaction.walletFrom === walletId) {
						return balance - transaction.amount
					}

					if (transaction.walletTo === walletId) {
						return balance + transaction.amount
					}

					return balance
				default:
					return balance
			}
		}, initialBalance)
	}

	async function deleteTransactionsByWallet(walletId: string) {
		await deleteTransactionsByWalletDoc(walletId)
	}

	return {
		transactions: state.transactions,
		isLoaded: state.isLoaded,
		error: state.error,
		startTransactionsSync,
		clearTransactions,
		createTransaction,
		createAdjustmentTransaction,
		deleteTransactionsByWallet,
		getWalletBalance
	}
}
