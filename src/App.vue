<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import {
	BALANCE_ADJUSTMENT_CATEGORY_ID,
	BALANCE_ADJUSTMENT_CATEGORY_NAME,
	TRANSFER_CATEGORY_ID,
	TRANSFER_CATEGORY_NAME,
	TRANSFER_CATEGORY_LABEL,
	useCategoryStore
} from "@/stores/categoryStore"
import { buildPeriodId } from "@/services/periods"
import { usePeriodStore } from "@/stores/periodStore"
import { useTransactionStore } from "@/stores/transactionStore"
import { useWalletStore } from "@/stores/walletStore"
import { loginWithGoogle, logout, onUserChanged } from "@/services/auth"

const walletStore = useWalletStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const periodStore = usePeriodStore()

const user = ref(null)
const authReady = ref(false)
const isSubmitting = ref(false)
const currentPage = ref("dashboard")

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)

const walletName = ref("")
const walletBalance = ref(0)
const walletBalanceInput = ref("")
const isWalletModalOpen = ref(false)

const adjustingWalletId = ref("")
const adjustmentBalance = ref(0)
const adjustmentBalanceInput = ref("")
const adjustmentDescription = ref("")

const deleteWalletId = ref("")
const deleteCategoryId = ref("")
const deleteTransactionId = ref("")
const deletePeriodId = ref("")

const isCategoryModalOpen = ref(false)
const editingCategoryId = ref("")
const categoryName = ref("")
const draggedCategoryId = ref("")
const dragOverCategoryId = ref("")

const isPeriodModalOpen = ref(false)
const periodModalYear = ref(new Date().getFullYear())
const periodModalMonth = ref(new Date().getMonth() + 1)

const isEntryModalOpen = ref(false)
const editingTransactionId = ref("")
const entryDescription = ref("")
const entryType = ref("expense")
const entryCategoryId = ref("")
const entryWalletId = ref("")
const entryTargetWalletId = ref("")
const entryAmount = ref(0)
const entryAmountInput = ref("")
const entryDate = ref("")
const entryAdjustmentDirection = ref("increase")
const entryFormError = ref("")

const isDataReady = computed(() =>
	authReady.value &&
	(!user.value || (
		walletStore.isLoaded &&
		transactionStore.isLoaded &&
		categoryStore.isLoaded &&
		periodStore.isLoaded
	))
)

const appError = computed(() =>
	walletStore.error || transactionStore.error || categoryStore.error || periodStore.error || ""
)

const availableYears = computed(() => {
	const years = Array.from(new Set(periodStore.periods.map(period => period.year))).sort((a, b) => b - a)
	return years.length > 0 ? years : [selectedYear.value]
})

const monthOptions = [
	{ value: 1, label: "01" },
	{ value: 2, label: "02" },
	{ value: 3, label: "03" },
	{ value: 4, label: "04" },
	{ value: 5, label: "05" },
	{ value: 6, label: "06" },
	{ value: 7, label: "07" },
	{ value: 8, label: "08" },
	{ value: 9, label: "09" },
	{ value: 10, label: "10" },
	{ value: 11, label: "11" },
	{ value: 12, label: "12" }
]

const availableMonths = computed(() => {
	const months = periodStore.periods
		.filter(period => period.year === selectedYear.value)
		.map(period => period.month)
		.sort((a, b) => a - b)

	if (months.length === 0) {
		return monthOptions.filter(option => option.value === selectedMonth.value)
	}

	return monthOptions.filter(option => months.includes(option.value))
})

const selectedPeriodId = computed(() => buildPeriodId(selectedYear.value, selectedMonth.value))
const selectedPeriod = computed(() => periodStore.getPeriodById(selectedPeriodId.value))

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
})

const entryMinDate = computed(() => formatDateValue(new Date(selectedYear.value, selectedMonth.value - 1, 1)))
const entryMaxDate = computed(() => formatDateValue(new Date(selectedYear.value, selectedMonth.value, 0)))

const filteredTransactions = computed(() =>
	transactionStore.transactions.filter(transaction => {
		if (transaction.periodId) {
			return transaction.periodId === selectedPeriodId.value
		}

		const date = new Date(transaction.date)
		return date.getFullYear() === selectedYear.value && date.getMonth() + 1 === selectedMonth.value
	})
)

const groupedTransactions = computed(() => {
	return categoryStore.categories
		.filter(category =>
			category.id === TRANSFER_CATEGORY_ID ||
			(category.name !== TRANSFER_CATEGORY_NAME && category.name !== TRANSFER_CATEGORY_LABEL)
		)
		.map(category => {
			const items = filteredTransactions.value.filter(transaction =>
				transaction.categoryId
					? transaction.categoryId === category.id
					: transaction.category === category.name
			)

			return {
				id: category.id,
				title: category.name,
				items
			}
		})
		.filter(group =>
			(group.id !== TRANSFER_CATEGORY_ID && group.id !== BALANCE_ADJUSTMENT_CATEGORY_ID) ||
			group.items.length > 0
		)
})

const dashboardWallets = computed(() =>
	walletStore.wallets.map(wallet => ({
		...wallet,
		balance: getWalletBalanceForPeriod(wallet)
	}))
)

let stopAuthListener = null

onMounted(() => {
	window.addEventListener("keydown", handleModalKeydown)

	stopAuthListener = onUserChanged(currentUser => {
		user.value = currentUser
		authReady.value = true

		if (currentUser) {
			walletStore.startWalletsSync()
			transactionStore.startTransactionsSync()
			categoryStore.startCategoriesSync()
			periodStore.startPeriodsSync()
			return
		}

		walletStore.clearWallets()
		transactionStore.clearTransactions()
		categoryStore.clearCategories()
		periodStore.clearPeriods()
		closeAllModals()
	})
})

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown)

	if (stopAuthListener) {
		stopAuthListener()
	}

	walletStore.clearWallets()
	transactionStore.clearTransactions()
	categoryStore.clearCategories()
	periodStore.clearPeriods()
})

watch(
	() => ({
		walletsLoaded: walletStore.isLoaded,
		periodsLoaded: periodStore.isLoaded,
		hasUser: Boolean(user.value)
	}),
	async state => {
		if (!state.hasUser || !state.walletsLoaded || !state.periodsLoaded) return

		const currentYear = new Date().getFullYear()
		const currentMonth = new Date().getMonth() + 1
		const currentPeriod = periodStore.getPeriodByYearMonth(currentYear, currentMonth)

		if (!currentPeriod) {
			const openingBalances = Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

			await periodStore.ensurePeriod(currentYear, currentMonth, openingBalances)
			selectedYear.value = currentYear
			selectedMonth.value = currentMonth
			return
		}

		if (!periodStore.getPeriodByYearMonth(selectedYear.value, selectedMonth.value)) {
			const latestPeriod = periodStore.periods[periodStore.periods.length - 1]

			if (latestPeriod) {
				selectedYear.value = latestPeriod.year
				selectedMonth.value = latestPeriod.month
			}
		}
	},
	{ immediate: true }
)

watch(selectedYear, year => {
	const hasSelectedMonth = periodStore.getPeriodByYearMonth(year, selectedMonth.value)

	if (hasSelectedMonth) return

	const firstMonth = availableMonths.value[0]

	if (firstMonth) {
		selectedMonth.value = firstMonth.value
	}
})

function closeAllModals() {
	closeWalletModal()
	closeAdjustmentModal()
	closeCategoryModal()
	closeEntryModal()
	closeDeleteWalletModal()
	closeDeleteCategoryModal()
	closeDeleteTransactionModal()
	closePeriodModal()
	closeDeletePeriodModal()
}

function formatDateDisplay(date) {
	const current = new Date(date)
	const day = `${current.getDate()}`.padStart(2, "0")
	const month = `${current.getMonth() + 1}`.padStart(2, "0")
	const year = current.getFullYear()
	return `${day}/${month}/${year}`
}

function formatDateValue(date) {
	const current = new Date(date)
	const year = current.getFullYear()
	const month = `${current.getMonth() + 1}`.padStart(2, "0")
	const day = `${current.getDate()}`.padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatCurrency(value) {
	return currencyFormatter.format(Number(value ?? 0))
}

function normalizeCurrencyText(value) {
	const raw = String(value ?? "").replace("R$ ", "")
	const sanitized = raw.replace(/[^\d,]/g, "")
	const firstCommaIndex = sanitized.indexOf(",")

	if (firstCommaIndex < 0) {
		const integerOnly = sanitized.replace(/^0+(?=\d)/, "")
		return integerOnly
	}

	const integerPart = sanitized.slice(0, firstCommaIndex).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "")
	const decimalPart = sanitized.slice(firstCommaIndex + 1).replace(/[^\d]/g, "").slice(0, 2)

	return `${integerPart || "0"},${decimalPart}`
}

function parseCurrencyInput(value) {
	const normalized = normalizeCurrencyText(value)
	const [integerPart = "0", decimalPart = ""] = normalized.split(",")
	const integerValue = Number(integerPart || "0")
	const fractionValue = Number(decimalPart.padEnd(2, "0") || "0")
	return integerValue + (fractionValue / 100)
}

function getCurrencyField(field) {
	switch (field) {
		case "wallet":
			return { model: walletBalance, input: walletBalanceInput }
		case "adjustment":
			return { model: adjustmentBalance, input: adjustmentBalanceInput }
		case "entry":
			return { model: entryAmount, input: entryAmountInput }
		default:
			return null
	}
}

function syncCurrencyInput(model, input, event) {
	const target = event?.target instanceof HTMLInputElement ? event.target : null
	const rawValue = target?.value ?? ""
	const normalizedInput = normalizeCurrencyText(rawValue)
	const parsedValue = parseCurrencyInput(normalizedInput)
	const displayValue = normalizedInput ? `R$ ${normalizedInput}` : "R$ "

	model.value = parsedValue
	input.value = displayValue

	if (target && target.value !== displayValue) {
		target.value = displayValue
	}
}

function syncCurrencyFieldInput(field, event) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	syncCurrencyInput(currencyField.model, currencyField.input, event)
}

function setCurrencyInput(model, input, value) {
	model.value = Number(value ?? 0)
	input.value = formatCurrency(model.value)
}

function parseDateInput(value) {
	if (!value) return null

	const date = new Date(`${value}T12:00:00`)
	return Number.isNaN(date.getTime()) ? null : date
}

function buildDefaultEntryDate() {
	const now = new Date()
	const currentDay = now.getDate()
	const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate()

	return new Date(
		selectedYear.value,
		selectedMonth.value - 1,
		Math.min(currentDay, lastDay),
		12,
		0,
		0
	)
}

function getActiveModalActions() {
	if (isWalletModalOpen.value) {
		return {
			confirm: addWallet,
			cancel: closeWalletModal
		}
	}

	if (adjustingWalletId.value) {
		return {
			confirm: saveAdjustment,
			cancel: closeAdjustmentModal
		}
	}

	if (isCategoryModalOpen.value) {
		return {
			confirm: saveCategory,
			cancel: closeCategoryModal
		}
	}

	if (isPeriodModalOpen.value) {
		return {
			confirm: savePeriod,
			cancel: closePeriodModal
		}
	}

	if (isEntryModalOpen.value) {
		return {
			confirm: saveEntry,
			cancel: closeEntryModal
		}
	}

	if (deleteWalletId.value) {
		return {
			confirm: confirmDeleteWallet,
			cancel: closeDeleteWalletModal
		}
	}

	if (deleteCategoryId.value) {
		return {
			confirm: confirmDeleteCategory,
			cancel: closeDeleteCategoryModal
		}
	}

	if (deleteTransactionId.value) {
		return {
			confirm: confirmDeleteTransaction,
			cancel: closeDeleteTransactionModal
		}
	}

	if (deletePeriodId.value) {
		return {
			confirm: confirmDeletePeriod,
			cancel: closeDeletePeriodModal
		}
	}

	return null
}

function handleModalKeydown(event) {
	if (isSubmitting.value) return

	const modalActions = getActiveModalActions()

	if (!modalActions) return

	if (event.key === "Escape") {
		event.preventDefault()
		modalActions.cancel()
		return
	}

	if (event.key !== "Enter" || event.shiftKey) return

	const activeTag = document.activeElement?.tagName

	if (activeTag === "TEXTAREA") return

	event.preventDefault()
	void modalActions.confirm()
}

function handleModalEnter(action, event) {
	if (isSubmitting.value) return

	if (event?.target instanceof HTMLTextAreaElement) return

	event?.preventDefault?.()

	switch (action) {
		case "wallet":
			void addWallet()
			return
		case "adjustment":
			void saveAdjustment()
			return
		case "category":
			void saveCategory()
			return
		case "period":
			void savePeriod()
			return
		case "entry":
			void saveEntry()
			return
		case "delete-wallet":
			void confirmDeleteWallet()
			return
		case "delete-category":
			void confirmDeleteCategory()
			return
		case "delete-transaction":
			void confirmDeleteTransaction()
			return
		case "delete-period":
			void confirmDeletePeriod()
			return
		default:
			return
	}
}

function handleCurrencyFocus(model, input, event) {
	const target = event?.target

	if (model.value === 0) {
		input.value = "R$ "

		if (target instanceof HTMLInputElement) {
			target.value = "R$ "
			requestAnimationFrame(() => {
				target.setSelectionRange(target.value.length, target.value.length)
			})
		}
	}
}

function handleCurrencyFieldFocus(field, event) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	handleCurrencyFocus(currencyField.model, currencyField.input, event)
}

function handleCurrencyBlur(model, input) {
	setCurrencyInput(model, input, model.value)
}

function handleCurrencyFieldBlur(field) {
	const currencyField = getCurrencyField(field)

	if (!currencyField) return

	handleCurrencyBlur(currencyField.model, currencyField.input)
}

function handleCurrencyKeydown(event) {
	const allowedKeys = [
		"Backspace",
		"Delete",
		"Tab",
		"Enter",
		"Escape",
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"ArrowDown",
		"Home",
		"End"
	]

	if (
		event.ctrlKey ||
		event.metaKey ||
		allowedKeys.includes(event.key) ||
		/^\d$/.test(event.key) ||
		event.key === ","
	) {
		return
	}

	event.preventDefault()
}

function hasText(value) {
	return String(value ?? "").trim().length > 0
}

function isAdjustmentBalanceMissing() {
	return adjustmentBalance.value <= 0
}

function isWalletNameMissing() {
	return !hasText(walletName.value)
}

function isWalletBalanceMissing() {
	return walletBalance.value <= 0
}

function isAdjustmentDescriptionMissing() {
	return !hasText(adjustmentDescription.value)
}

function isCategoryNameMissing() {
	return !hasText(categoryName.value)
}

function isPeriodYearMissing() {
	return !Number.isFinite(periodModalYear.value) || periodModalYear.value <= 0
}

function isEntryCategoryMissing() {
	return entryType.value !== "adjustment" && entryType.value !== "transfer" && !entryCategoryId.value
}

function isEntryWalletMissing() {
	return !entryWalletId.value
}

function isEntryTargetWalletMissing() {
	return entryType.value === "transfer" && !entryTargetWalletId.value
}

function isEntryDateMissing() {
	return !entryDate.value
}

function isEntryAmountMissing() {
	return entryAmount.value <= 0
}

function isEntryDescriptionMissing() {
	return !hasText(entryDescription.value)
}

setCurrencyInput(walletBalance, walletBalanceInput, 0)
setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, 0)
setCurrencyInput(entryAmount, entryAmountInput, 0)

function getSelectedCategory() {
	return categoryStore.entryCategories.find(category => category.id === entryCategoryId.value)
}

function isDateInSelectedPeriod(date) {
	return (
		date.getFullYear() === selectedYear.value &&
		date.getMonth() + 1 === selectedMonth.value
	)
}

function getOpeningBalance(wallet) {
	return selectedPeriod.value?.openingBalances?.[wallet.id] ?? wallet.initialBalance
}

function buildNextPeriodDate(year, month) {
	return month === 12
		? { year: year + 1, month: 1 }
		: { year, month: month + 1 }
}

function buildPreviousPeriodDate(year, month) {
	return month === 1
		? { year: year - 1, month: 12 }
		: { year, month: month - 1 }
}

function buildClonedDateForNextPeriod(date, nextYear, nextMonth) {
	const original = new Date(date)
	const day = original.getDate()
	const lastDay = new Date(nextYear, nextMonth, 0).getDate()
	return new Date(nextYear, nextMonth - 1, Math.min(day, lastDay), 12, 0, 0)
}

function getWalletBalanceForPeriod(wallet) {
	const openingBalance = getOpeningBalance(wallet)

	return transactionStore.transactions.reduce((balance, transaction) => {
		const belongsToSelectedPeriod = transaction.periodId
			? transaction.periodId === selectedPeriodId.value
			: isDateInSelectedPeriod(new Date(transaction.date))

		if (!belongsToSelectedPeriod || !transaction.paid) {
			return balance
		}

		switch (transaction.type) {
			case "income":
				return transaction.walletTo === wallet.id ? balance + transaction.amount : balance
			case "expense":
				return transaction.walletFrom === wallet.id ? balance - transaction.amount : balance
			case "transfer":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			case "adjustment":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			default:
				return balance
		}
	}, openingBalance)
}

function getWalletBalanceForPeriodId(wallet, periodId) {
	const period = periodStore.getPeriodById(periodId)
	const openingBalance = period?.openingBalances?.[wallet.id] ?? wallet.initialBalance

	return transactionStore.transactions.reduce((balance, transaction) => {
		if (transaction.periodId !== periodId || !transaction.paid) {
			return balance
		}

		switch (transaction.type) {
			case "income":
				return transaction.walletTo === wallet.id ? balance + transaction.amount : balance
			case "expense":
				return transaction.walletFrom === wallet.id ? balance - transaction.amount : balance
			case "transfer":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			case "adjustment":
				if (transaction.walletFrom === wallet.id) {
					return balance - transaction.amount
				}

				if (transaction.walletTo === wallet.id) {
					return balance + transaction.amount
				}

				return balance
			default:
				return balance
		}
	}, openingBalance)
}

function getTransactionsForPeriod(periodId) {
	return transactionStore.transactions.filter(transaction => {
		if (transaction.periodId) {
			return transaction.periodId === periodId
		}

		const date = new Date(transaction.date)
		return buildPeriodId(date.getFullYear(), date.getMonth() + 1) === periodId
	})
}

function getWalletName(walletId) {
	return walletStore.getWallet(walletId)?.name ?? "-"
}

function getTransactionWalletLabel(transaction) {
	if (transaction.type === "income") {
		return getWalletName(transaction.walletTo)
	}

	if (transaction.type === "expense") {
		return getWalletName(transaction.walletFrom)
	}

	if (transaction.type === "transfer") {
		return `${getWalletName(transaction.walletFrom)} -> ${getWalletName(transaction.walletTo)}`
	}

	return getWalletName(transaction.walletTo || transaction.walletFrom)
}

function handleCategoryDragStart(categoryId, event) {
	draggedCategoryId.value = categoryId

	if (event?.dataTransfer) {
		event.dataTransfer.effectAllowed = "move"
		event.dataTransfer.setData("text/plain", categoryId)
	}
}

function handleCategoryDragOver(categoryId, event) {
	if (!draggedCategoryId.value || draggedCategoryId.value === categoryId) return

	event.preventDefault()
	dragOverCategoryId.value = categoryId

	if (event?.dataTransfer) {
		event.dataTransfer.dropEffect = "move"
	}
}

async function handleCategoryDrop(targetCategoryId) {
	if (!draggedCategoryId.value || draggedCategoryId.value === targetCategoryId) {
		dragOverCategoryId.value = ""
		return
	}

	const orderedIds = categoryStore.manageableCategories.map(category => category.id)
	const fromIndex = orderedIds.findIndex(id => id === draggedCategoryId.value)
	const toIndex = orderedIds.findIndex(id => id === targetCategoryId)

	if (fromIndex < 0 || toIndex < 0) {
		draggedCategoryId.value = ""
		dragOverCategoryId.value = ""
		return
	}

	const [movedId] = orderedIds.splice(fromIndex, 1)
	orderedIds.splice(toIndex, 0, movedId)

	isSubmitting.value = true

	try {
		await categoryStore.reorderCategories(orderedIds)
	} finally {
		isSubmitting.value = false
		draggedCategoryId.value = ""
		dragOverCategoryId.value = ""
	}
}

function handleCategoryDragEnd() {
	draggedCategoryId.value = ""
	dragOverCategoryId.value = ""
}

async function handleLogin() {
	isSubmitting.value = true

	try {
		await loginWithGoogle()
	} finally {
		isSubmitting.value = false
	}
}

async function handleLogout() {
	isSubmitting.value = true

	try {
		await logout()
	} finally {
		isSubmitting.value = false
	}
}

function openPeriodModal() {
	const nextPeriod = selectedPeriod.value
		? buildNextPeriodDate(selectedYear.value, selectedMonth.value)
		: { year: selectedYear.value, month: selectedMonth.value }

	periodModalYear.value = nextPeriod.year
	periodModalMonth.value = nextPeriod.month
	isPeriodModalOpen.value = true
}

function closePeriodModal() {
	isPeriodModalOpen.value = false
}

async function savePeriod() {
	const existingPeriod = periodStore.getPeriodByYearMonth(periodModalYear.value, periodModalMonth.value)

	if (existingPeriod) {
		selectedYear.value = existingPeriod.year
		selectedMonth.value = existingPeriod.month
		closePeriodModal()
		return
	}

	const previousPeriodDate = buildPreviousPeriodDate(periodModalYear.value, periodModalMonth.value)
	const previousPeriod = periodStore.getPeriodByYearMonth(previousPeriodDate.year, previousPeriodDate.month)
	const newPeriodId = buildPeriodId(periodModalYear.value, periodModalMonth.value)

	isSubmitting.value = true

	try {
		const openingBalances = previousPeriod
			? Object.fromEntries(
				walletStore.wallets.map(wallet => [
					wallet.id,
					getWalletBalanceForPeriodId(wallet, previousPeriod.id)
				])
			)
			: Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

		await periodStore.ensurePeriod(periodModalYear.value, periodModalMonth.value, openingBalances)

		if (previousPeriod) {
			for (const transaction of getTransactionsForPeriod(previousPeriod.id)) {
				if (transaction.type === "adjustment") continue

				await transactionStore.createTransaction({
					type: transaction.type,
					periodId: newPeriodId,
					amount: transaction.amount,
					walletFrom: transaction.walletFrom,
					walletTo: transaction.walletTo,
					category: transaction.category,
					categoryId: transaction.categoryId,
					description: transaction.description,
					date: buildClonedDateForNextPeriod(transaction.date, periodModalYear.value, periodModalMonth.value),
					paid: false
				})
			}
		}

		selectedYear.value = periodModalYear.value
		selectedMonth.value = periodModalMonth.value
		closePeriodModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeletePeriodModal() {
	if (!selectedPeriod.value) return

	deletePeriodId.value = selectedPeriod.value.id
}

function closeDeletePeriodModal() {
	deletePeriodId.value = ""
}

async function confirmDeletePeriod() {
	if (!deletePeriodId.value) return

	const periodToDelete = periodStore.getPeriodById(deletePeriodId.value)

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransactionsByPeriod(deletePeriodId.value)
		await periodStore.deletePeriod(deletePeriodId.value)

		closeDeletePeriodModal()

		if (periodToDelete?.id === selectedPeriodId.value) {
			const remainingPeriods = periodStore.periods.filter(period => period.id !== deletePeriodId.value)
			const lastPeriod = remainingPeriods[remainingPeriods.length - 1]

			if (lastPeriod) {
				selectedYear.value = lastPeriod.year
				selectedMonth.value = lastPeriod.month
			} else {
				selectedYear.value = new Date().getFullYear()
				selectedMonth.value = new Date().getMonth() + 1
			}
		}
	} finally {
		isSubmitting.value = false
	}
}

async function addWallet() {
	const trimmedName = walletName.value.trim()

	if (!trimmedName) return

	isSubmitting.value = true

	try {
		await walletStore.createWallet(trimmedName, walletBalance.value)
		closeWalletModal()
	} finally {
		isSubmitting.value = false
	}
}

function openWalletModal() {
	isWalletModalOpen.value = true
	walletName.value = ""
	setCurrencyInput(walletBalance, walletBalanceInput, 0)
}

function closeWalletModal() {
	isWalletModalOpen.value = false
	walletName.value = ""
	setCurrencyInput(walletBalance, walletBalanceInput, 0)
}

function openAdjustmentModal(wallet) {
	adjustingWalletId.value = wallet.id
	setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, getWalletBalanceForPeriod(wallet))
	adjustmentDescription.value = ""
}

function closeAdjustmentModal() {
	adjustingWalletId.value = ""
	setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, 0)
	adjustmentDescription.value = ""
}

async function saveAdjustment() {
	const wallet = walletStore.getWallet(adjustingWalletId.value)

	if (!wallet) return
	if (isAdjustmentBalanceMissing() || isAdjustmentDescriptionMissing()) return

	isSubmitting.value = true

	try {
		await transactionStore.createAdjustmentTransaction(
			selectedPeriodId.value,
			wallet.id,
			getWalletBalanceForPeriod(wallet),
			adjustmentBalance.value,
			adjustmentDescription.value
		)

		closeAdjustmentModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteWalletModal(wallet) {
	deleteWalletId.value = wallet.id
}

function closeDeleteWalletModal() {
	deleteWalletId.value = ""
}

async function confirmDeleteWallet() {
	if (!deleteWalletId.value) return

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransactionsByWallet(deleteWalletId.value)
		await walletStore.deleteWallet(deleteWalletId.value)
		closeDeleteWalletModal()
	} finally {
		isSubmitting.value = false
	}
}

function openCategoryModal(category = null) {
	isCategoryModalOpen.value = true
	editingCategoryId.value = category?.id ?? ""
	categoryName.value = category?.name ?? ""
}

function closeCategoryModal() {
	isCategoryModalOpen.value = false
	editingCategoryId.value = ""
	categoryName.value = ""
}

async function saveCategory() {
	const trimmedName = categoryName.value.trim()

	if (!trimmedName) return

	isSubmitting.value = true

	try {
		if (editingCategoryId.value) {
			await categoryStore.updateCategory(editingCategoryId.value, trimmedName)
		} else {
			await categoryStore.createCategory(trimmedName)
		}

		closeCategoryModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteCategoryModal(category) {
	deleteCategoryId.value = category.id
}

function closeDeleteCategoryModal() {
	deleteCategoryId.value = ""
}

async function confirmDeleteCategory() {
	if (!deleteCategoryId.value) return

	isSubmitting.value = true

	try {
		await categoryStore.deleteCategory(deleteCategoryId.value)
		closeDeleteCategoryModal()
	} finally {
		isSubmitting.value = false
	}
}

function resetEntryForm() {
	editingTransactionId.value = ""
	entryDescription.value = ""
	entryType.value = "expense"
	entryCategoryId.value = categoryStore.entryCategories[0]?.id ?? ""
	entryWalletId.value = walletStore.wallets[0]?.id ?? ""
	entryTargetWalletId.value = ""
	setCurrencyInput(entryAmount, entryAmountInput, 0)
	entryDate.value = formatDateValue(buildDefaultEntryDate())
	entryAdjustmentDirection.value = "increase"
	entryFormError.value = ""
}

function openCreateEntryModal() {
	resetEntryForm()
	isEntryModalOpen.value = true
}

function openEditEntryModal(transaction) {
	isEntryModalOpen.value = true
	entryFormError.value = ""
	editingTransactionId.value = transaction.id
	entryDescription.value = transaction.description ?? ""
	entryType.value = transaction.type
	entryCategoryId.value =
		transaction.categoryId ||
		categoryStore.entryCategories.find(category => category.name === transaction.category)?.id ||
		""
	entryWalletId.value = transaction.walletFrom || transaction.walletTo || ""
	entryTargetWalletId.value = transaction.type === "transfer" ? transaction.walletTo || "" : ""
	setCurrencyInput(entryAmount, entryAmountInput, transaction.amount)
	entryDate.value = formatDateValue(transaction.date)
	entryAdjustmentDirection.value = transaction.walletTo ? "increase" : "decrease"
}

function closeEntryModal() {
	isEntryModalOpen.value = false
	resetEntryForm()
}

async function saveEntry() {
	const selectedCategory = getSelectedCategory()
	const existingTransaction = editingTransactionId.value
		? transactionStore.transactions.find(transaction => transaction.id === editingTransactionId.value)
		: null
	const normalizedDate = parseDateInput(entryDate.value)

	entryFormError.value = ""

	if (isEntryDescriptionMissing()) return
	if (!entryWalletId.value || entryAmount.value <= 0) return
	if (!normalizedDate) {
		entryFormError.value = "Selecione uma data valida."
		return
	}
	if (!isDateInSelectedPeriod(normalizedDate)) {
		entryFormError.value = "A data da entrada deve estar dentro do mes e ano selecionados."
		return
	}

	if (entryType.value !== "adjustment" && entryType.value !== "transfer" && !selectedCategory) return
	if (entryType.value === "transfer" && !entryTargetWalletId.value) return
	if (entryType.value === "transfer" && entryWalletId.value === entryTargetWalletId.value) return

	const baseData = {
		type: entryType.value,
		periodId: selectedPeriodId.value,
		amount: entryAmount.value,
		category: entryType.value === "adjustment"
			? BALANCE_ADJUSTMENT_CATEGORY_NAME
			: entryType.value === "transfer"
				? TRANSFER_CATEGORY_LABEL
				: selectedCategory?.name,
		categoryId: entryType.value === "adjustment"
			? BALANCE_ADJUSTMENT_CATEGORY_ID
			: entryType.value === "transfer"
				? TRANSFER_CATEGORY_ID
				: selectedCategory?.id,
		description: entryDescription.value.trim() || undefined,
		date: normalizedDate,
		paid: existingTransaction?.paid,
		walletFrom: undefined,
		walletTo: undefined
	}

	if (entryType.value === "income") {
		baseData.walletTo = entryWalletId.value
	}

	if (entryType.value === "expense") {
		baseData.walletFrom = entryWalletId.value
	}

	if (entryType.value === "transfer") {
		baseData.walletFrom = entryWalletId.value
		baseData.walletTo = entryTargetWalletId.value
	}

	if (entryType.value === "adjustment") {
		if (entryAdjustmentDirection.value === "increase") {
			baseData.walletTo = entryWalletId.value
		} else {
			baseData.walletFrom = entryWalletId.value
		}
	}

	isSubmitting.value = true

	try {
		if (editingTransactionId.value) {
			await transactionStore.updateTransaction(editingTransactionId.value, baseData)
		} else {
			await transactionStore.createEntryTransaction({
				type: entryType.value,
				periodId: selectedPeriodId.value,
				description: entryDescription.value,
				category: entryType.value === "transfer" ? TRANSFER_CATEGORY_LABEL : baseData.category,
				categoryId: entryType.value === "transfer" ? TRANSFER_CATEGORY_ID : baseData.categoryId,
				walletId: entryWalletId.value,
				targetWalletId: entryType.value === "transfer" ? entryTargetWalletId.value : undefined,
				amount: entryAmount.value,
				date: normalizedDate
			})
		}

		closeEntryModal()
	} finally {
		isSubmitting.value = false
	}
}

function openDeleteTransactionModal(transaction) {
	deleteTransactionId.value = transaction.id
}

function closeDeleteTransactionModal() {
	deleteTransactionId.value = ""
}

async function confirmDeleteTransaction() {
	if (!deleteTransactionId.value) return

	isSubmitting.value = true

	try {
		await transactionStore.deleteTransaction(deleteTransactionId.value)
		closeDeleteTransactionModal()
	} finally {
		isSubmitting.value = false
	}
}

async function toggleTransactionPaid(transaction) {
	isSubmitting.value = true

	try {
		await transactionStore.updateTransaction(transaction.id, {
			paid: !transaction.paid
		})
	} finally {
		isSubmitting.value = false
	}
}
</script>

<template>
<div class="app-page">
	<h1>Financas</h1>

	<div v-if="!authReady">
		Carregando autenticacao...
	</div>

	<template v-else-if="!user">
		<button :disabled="isSubmitting" @click="handleLogin">
			Entrar com Google
		</button>
	</template>

	<template v-else-if="!isDataReady">
		<div>Conectando dados online...</div>
	</template>

	<template v-else>
		<div class="topbar">
			<div>Logado: {{ user.email }}</div>

			<div class="toolbar">
				<select v-model.number="selectedYear">
					<option v-for="year in availableYears" :key="year" :value="year">
						{{ year }}
					</option>
				</select>

				<select v-model.number="selectedMonth">
					<option v-for="month in availableMonths" :key="month.value" :value="month.value">
						{{ month.label }}
					</option>
				</select>

				<button :disabled="isSubmitting" @click="openPeriodModal">
					+
				</button>

				<button :disabled="isSubmitting || !selectedPeriod" @click="openDeletePeriodModal">
					Remover mes
				</button>

				<button :disabled="isSubmitting" @click="handleLogout">
					Sair
				</button>
			</div>
		</div>

		<div class="tabs">
			<button
				:class="{ active: currentPage === 'dashboard' }"
				@click="currentPage = 'dashboard'"
			>
				Principal
			</button>

			<button
				:class="{ active: currentPage === 'wallets' }"
				@click="currentPage = 'wallets'"
			>
				Carteiras
			</button>

			<button
				:class="{ active: currentPage === 'categories' }"
				@click="currentPage = 'categories'"
			>
				Categorias
			</button>
		</div>

		<div v-if="appError" class="error-box">
			{{ appError }}
		</div>

		<section v-if="currentPage === 'dashboard'" class="page-section">
			<div class="toolbar">
				<button :disabled="isSubmitting || !selectedPeriod" @click="openCreateEntryModal">
					Nova entrada
				</button>
			</div>

			<div class="wallet-summary-list">
				<div
					v-for="wallet in dashboardWallets"
					:key="wallet.id"
					class="wallet-summary-row"
				>
					<span>{{ wallet.name }}</span>
					<strong>{{ formatCurrency(wallet.balance) }}</strong>
				</div>
			</div>

			<div class="transaction-sections">
				<div
					v-for="group in groupedTransactions"
					:key="group.id"
					class="transaction-section"
				>
					<div class="section-header">
						<h2>{{ group.title }}</h2>
						<div v-if="false" class="section-actions">
							<button
								class="icon-button"
								:disabled="isSubmitting || !canMoveCategory(group.id, 'up')"
								@click="moveCategory(group.id, 'up')"
							>
								↑
							</button>
							<button
								class="icon-button"
								:disabled="isSubmitting || !canMoveCategory(group.id, 'down')"
								@click="moveCategory(group.id, 'down')"
							>
								↓
							</button>
						</div>
					</div>

					<div class="entry-list">
						<div class="entry-list-head">
							<span>Descricao</span>
							<span>Tipo</span>
							<span>Carteira</span>
							<span>Data</span>
							<span>Valor</span>
							<span>Pago</span>
							<span>Acoes</span>
						</div>

						<div v-if="group.items.length === 0" class="entry-empty">
							Sem entradas
						</div>

						<div
							v-for="transaction in group.items"
							:key="transaction.id"
							class="entry-row"
							:class="{ 'paid-row': transaction.paid }"
						>
							<span>{{ transaction.description || transaction.type }}</span>
							<span>{{ transaction.type }}</span>
							<span>{{ getTransactionWalletLabel(transaction) }}</span>
							<span>{{ formatDateDisplay(transaction.date) }}</span>
							<span>{{ formatCurrency(transaction.amount) }}</span>
							<span>
								<input
									type="checkbox"
									:checked="transaction.paid"
									:disabled="isSubmitting"
									@change="toggleTransactionPaid(transaction)"
								/>
							</span>
							<span class="row-actions">
								<button :disabled="isSubmitting" @click="openEditEntryModal(transaction)">
									Editar
								</button>

								<button
									class="danger-button"
									:disabled="isSubmitting"
									@click="openDeleteTransactionModal(transaction)"
								>
									Excluir
								</button>
							</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section v-if="currentPage === 'wallets'" class="page-section">
			<div class="toolbar">
				<button :disabled="isSubmitting" @click="openWalletModal">
					Criar carteira
				</button>
			</div>

			<div class="simple-list">
				<div v-for="wallet in walletStore.wallets" :key="wallet.id" class="simple-list-row">
					<span>{{ wallet.name }}</span>
					<span>{{ formatCurrency(getWalletBalanceForPeriod(wallet)) }}</span>
					<span class="row-actions">
						<button :disabled="isSubmitting" @click="openAdjustmentModal(wallet)">
							Ajustar saldo
						</button>

						<button
							class="danger-button"
							:disabled="isSubmitting"
							@click="openDeleteWalletModal(wallet)"
						>
							Excluir
						</button>
					</span>
				</div>
			</div>
		</section>

		<section v-if="currentPage === 'categories'" class="page-section">
			<div class="toolbar">
				<button :disabled="isSubmitting" @click="openCategoryModal()">
					Criar categoria
				</button>
			</div>

			<div class="simple-list">
				<div
					v-for="category in categoryStore.manageableCategories"
					:key="category.id"
					class="simple-list-row"
					:class="{ 'drag-over-row': dragOverCategoryId === category.id }"
					@dragover="handleCategoryDragOver(category.id, $event)"
					@drop.prevent="handleCategoryDrop(category.id)"
				>
					<span>{{ category.name }}</span>
					<span class="row-actions">
						<button
							class="icon-button"
							:disabled="isSubmitting"
							draggable="true"
							title="Arrastar categoria"
							@dragstart="handleCategoryDragStart(category.id, $event)"
							@dragend="handleCategoryDragEnd"
						>
							::
						</button>

						<button :disabled="isSubmitting" @click="openCategoryModal(category)">
							Editar
						</button>

						<button
							class="danger-button"
							:disabled="isSubmitting"
							@click="openDeleteCategoryModal(category)"
						>
							Excluir
						</button>
					</span>
				</div>
			</div>
		</section>
	</template>

	<div v-if="isWalletModalOpen" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('wallet', $event)">
			<h3>Criar carteira</h3>

			<input v-model="walletName" :class="{ 'required-empty': isWalletNameMissing() }" placeholder="Nome" />
			<input
				:class="{ 'required-empty': isWalletBalanceMissing() }"
				:value="walletBalanceInput"
				type="text"
				inputmode="decimal"
				placeholder="R$ 0,00"
				@keydown="handleCurrencyKeydown($event)"
				@focus="handleCurrencyFieldFocus('wallet', $event)"
				@input="syncCurrencyFieldInput('wallet', $event)"
				@blur="handleCurrencyFieldBlur('wallet')"
			/>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="addWallet">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closeWalletModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="adjustingWalletId" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('adjustment', $event)">
			<h3>Ajustar saldo</h3>

			<input
				:class="{ 'required-empty': isAdjustmentBalanceMissing() }"
				:value="adjustmentBalanceInput"
				type="text"
				inputmode="decimal"
				placeholder="R$ 0,00"
				@keydown="handleCurrencyKeydown($event)"
				@focus="handleCurrencyFieldFocus('adjustment', $event)"
				@input="syncCurrencyFieldInput('adjustment', $event)"
				@blur="handleCurrencyFieldBlur('adjustment')"
			/>
			<textarea
				v-model="adjustmentDescription"
				:class="{ 'required-empty': isAdjustmentDescriptionMissing() }"
				rows="4"
				placeholder="Descricao do ajuste"
			/>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveAdjustment">
					Salvar ajuste
				</button>

				<button :disabled="isSubmitting" @click="closeAdjustmentModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isCategoryModalOpen" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('category', $event)">
			<h3>{{ editingCategoryId ? "Editar categoria" : "Criar categoria" }}</h3>

			<input v-model="categoryName" :class="{ 'required-empty': isCategoryNameMissing() }" placeholder="Nome da categoria" />

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveCategory">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closeCategoryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isPeriodModalOpen" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('period', $event)">
			<h3>Criar mes</h3>

			<input v-model.number="periodModalYear" :class="{ 'required-empty': isPeriodYearMissing() }" type="number" placeholder="Ano" />

			<select v-model.number="periodModalMonth" :class="{ 'required-empty': !periodModalMonth }">
				<option v-for="month in monthOptions" :key="month.value" :value="month.value">
					{{ month.label }}
				</option>
			</select>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="savePeriod">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closePeriodModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="isEntryModalOpen" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('entry', $event)">
			<h3>{{ editingTransactionId ? "Editar entrada" : "Nova entrada" }}</h3>

			<input
				v-model="entryDescription"
				:class="{ 'required-empty': isEntryDescriptionMissing() }"
				placeholder="Descricao"
			/>

			<select v-model="entryType">
				<option value="expense">Despesa</option>
				<option value="income">Entrada</option>
				<option value="transfer">Transferencia</option>
				<option v-if="editingTransactionId" value="adjustment">Ajuste</option>
			</select>

			<select
				v-if="entryType !== 'adjustment' && entryType !== 'transfer'"
				v-model="entryCategoryId"
				:class="{ 'required-empty': isEntryCategoryMissing() }"
			>
				<option disabled value="">Selecione a categoria</option>
				<option
					v-for="category in categoryStore.entryCategories"
					:key="category.id"
					:value="category.id"
				>
					{{ category.name }}
				</option>
			</select>

			<select v-model="entryWalletId" :class="{ 'required-empty': isEntryWalletMissing() }">
				<option disabled value="">Selecione a carteira</option>
				<option
					v-for="wallet in walletStore.wallets"
					:key="wallet.id"
					:value="wallet.id"
				>
					{{ wallet.name }}
				</option>
			</select>

			<select
				v-if="entryType === 'transfer'"
				v-model="entryTargetWalletId"
				:class="{ 'required-empty': isEntryTargetWalletMissing() }"
			>
				<option disabled value="">Selecione a carteira de destino</option>
				<option
					v-for="wallet in walletStore.wallets"
					:key="wallet.id"
					:value="wallet.id"
				>
					{{ wallet.name }}
				</option>
			</select>

			<select v-if="entryType === 'adjustment'" v-model="entryAdjustmentDirection">
				<option value="increase">Aumenta saldo</option>
				<option value="decrease">Diminui saldo</option>
			</select>

			<input
				v-model="entryDate"
				:class="{ 'required-empty': isEntryDateMissing() }"
				type="date"
				:min="entryMinDate"
				:max="entryMaxDate"
			/>
			<input
				:class="{ 'required-empty': isEntryAmountMissing() }"
				:value="entryAmountInput"
				type="text"
				inputmode="decimal"
				placeholder="R$ 0,00"
				@keydown="handleCurrencyKeydown($event)"
				@focus="handleCurrencyFieldFocus('entry', $event)"
				@input="syncCurrencyFieldInput('entry', $event)"
				@blur="handleCurrencyFieldBlur('entry')"
			/>

			<div v-if="entryFormError" class="error-text">
				{{ entryFormError }}
			</div>

			<div class="toolbar">
				<button :disabled="isSubmitting" @click="saveEntry">
					Salvar
				</button>

				<button :disabled="isSubmitting" @click="closeEntryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteWalletId" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('delete-wallet', $event)">
			<h3>Excluir carteira</h3>
			<p>Tem certeza que deseja excluir esta carteira?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteWallet">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteWalletModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteCategoryId" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('delete-category', $event)">
			<h3>Excluir categoria</h3>
			<p>Tem certeza que deseja excluir esta categoria?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteCategory">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteCategoryModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deleteTransactionId" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('delete-transaction', $event)">
			<h3>Excluir entrada</h3>
			<p>Tem certeza que deseja excluir esta entrada?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteTransaction">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeleteTransactionModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>

	<div v-if="deletePeriodId" class="modal-backdrop">
		<div class="modal" @keydown.enter="handleModalEnter('delete-period', $event)">
			<h3>Excluir mes</h3>
			<p>Tem certeza que deseja excluir este mes e todas as entradas dele?</p>

			<div class="toolbar">
				<button class="danger-button" :disabled="isSubmitting" @click="confirmDeletePeriod">
					Confirmar exclusao
				</button>

				<button :disabled="isSubmitting" @click="closeDeletePeriodModal">
					Cancelar
				</button>
			</div>
		</div>
	</div>
</div>
</template>

<style scoped>
.app-page {
	display: grid;
	gap: 16px;
	padding: 24px;
	max-width: 1180px;
	margin: 0 auto;
	text-align: left;
}

.topbar,
.toolbar,
.tabs,
.row-actions {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	align-items: center;
}

.page-section,
.transaction-section,
.simple-list,
.wallet-summary-list,
.error-box {
	display: grid;
	gap: 12px;
	padding: 16px;
	border: 1px solid var(--border);
	border-radius: 12px;
	background: var(--bg);
	box-shadow: var(--shadow);
}

.wallet-summary-row,
.simple-list-row,
.entry-list-head,
.entry-row {
	display: grid;
	grid-template-columns: minmax(140px, 2fr) minmax(100px, 1fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr);
	gap: 12px;
	align-items: center;
}

.wallet-summary-row {
	grid-template-columns: minmax(160px, 2fr) minmax(120px, 1fr);
}

.simple-list-row {
	grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) minmax(180px, 1.6fr);
}

.entry-list {
	display: grid;
	gap: 8px;
}

.entry-list-head {
	font-weight: 700;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border);
}

.entry-row,
.wallet-summary-row,
.simple-list-row {
	padding: 8px 0;
	border-bottom: 1px solid var(--border);
}

.entry-row:last-child,
.wallet-summary-row:last-child,
.simple-list-row:last-child {
	border-bottom: 0;
}

.paid-row {
	background: rgba(34, 197, 94, 0.14);
	border-radius: 8px;
	padding-inline: 8px;
}

.entry-empty {
	padding: 8px 0;
}

.transaction-sections {
	display: grid;
	gap: 16px;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--border);
}

.section-header h2 {
	margin: 0;
}

.section-actions {
	display: flex;
	gap: 6px;
}

.icon-button {
	width: 32px;
	height: 32px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	border-radius: 999px;
}

.drag-over-row {
	outline: 2px dashed var(--accent-border);
	outline-offset: 6px;
	border-radius: 10px;
}

input,
textarea,
button,
select {
	font: inherit;
}

input,
textarea,
select {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--border);
	border-radius: 10px;
	box-sizing: border-box;
	background: var(--bg);
	color: var(--text);
}

.required-empty {
	background: rgba(220, 38, 38, 0.12);
	border-color: rgba(220, 38, 38, 0.8);
}

button {
	padding: 10px 14px;
	border: 0;
	border-radius: 10px;
	background: var(--accent);
	color: white;
	cursor: pointer;
}

button.active {
	outline: 2px solid var(--accent-border);
}

button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.danger-button {
	background: #c2410c;
}

.error-text {
	color: #b91c1c;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.4);
	display: grid;
	place-items: center;
	padding: 20px;
}

.modal {
	width: min(100%, 460px);
	display: grid;
	gap: 16px;
	padding: 20px;
	border-radius: 16px;
	background: var(--bg);
	box-shadow: var(--shadow);
}
</style>
