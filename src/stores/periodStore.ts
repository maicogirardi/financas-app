import { reactive } from "vue"
import type { Period } from "@/types/period"
import {
	buildPeriodId,
	deletePeriodDoc,
	subscribePeriods,
	upsertPeriodDoc
} from "@/services/periods"

const state = reactive({
	periods: [] as Period[],
	isLoaded: false,
	error: ""
})

let unsubscribePeriods: null | (() => void) = null

export function usePeriodStore() {
	function upsertLocalPeriod(period: Period) {
		const existingIndex = state.periods.findIndex(item => item.id === period.id)

		if (existingIndex >= 0) {
			state.periods.splice(existingIndex, 1, period)
			return
		}

		state.periods.push(period)
		state.periods.sort((a, b) => {
			if (a.year !== b.year) {
				return a.year - b.year
			}

			return a.month - b.month
		})
	}

	function setPeriods(periods: Period[]) {
		periods.forEach(period => {
			upsertLocalPeriod(period)
		})
		state.isLoaded = true
	}

	function clearPeriods() {
		if (unsubscribePeriods) {
			unsubscribePeriods()
			unsubscribePeriods = null
		}

		state.periods.splice(0, state.periods.length)
		state.isLoaded = false
		state.error = ""
	}

	function startPeriodsSync() {
		console.log("startPeriodsSync called")

		clearPeriods()

		unsubscribePeriods = subscribePeriods(
			periods => {
				console.log("periods received", periods)
				setPeriods(periods)
			},
			error => {
				console.error("period sync error", error)
				state.error = error.message
				state.isLoaded = true
			}
		)
	}

	async function ensurePeriod(year: number, month: number, openingBalances: Record<string, number>) {
		try {
			state.error = ""
			const id = buildPeriodId(year, month)

			await upsertPeriodDoc(id, {
				year,
				month,
				openingBalances,
				createdAt: new Date()
			})

			upsertLocalPeriod({
				id,
				year,
				month,
				openingBalances,
				createdAt: new Date()
			})

			return id
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to ensure period"
			throw error
		}
	}

	async function deletePeriod(id: string) {
		try {
			state.error = ""
			await deletePeriodDoc(id)
			const existingIndex = state.periods.findIndex(period => period.id === id)

			if (existingIndex >= 0) {
				state.periods.splice(existingIndex, 1)
			}
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Failed to delete period"
			throw error
		}
	}

	function getPeriodById(id: string) {
		return state.periods.find(period => period.id === id)
	}

	function getPeriodByYearMonth(year: number, month: number) {
		return state.periods.find(period => period.year === year && period.month === month)
	}

	return {
		get periods() {
			return state.periods
		},
		get isLoaded() {
			return state.isLoaded
		},
		get error() {
			return state.error
		},
		startPeriodsSync,
		clearPeriods,
		ensurePeriod,
		deletePeriod,
		getPeriodById,
		getPeriodByYearMonth
	}
}
