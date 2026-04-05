<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import BottomTabs from "@/components/navigation/BottomTabs.vue"
import AppSelect from "@/components/ui/AppSelect.vue"
import ConfiguracoesView from "@/views/ConfiguracoesView.vue"
import ResumoView from "@/views/ResumoView.vue"
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
import { saveThemePreference, subscribeThemePreference } from "@/services/themePreferences"

const walletStore = useWalletStore()
const transactionStore = useTransactionStore()
const categoryStore = useCategoryStore()
const periodStore = usePeriodStore()

const user = ref(null)
const authReady = ref(false)
const isSubmitting = ref(false)
const currentPage = ref("dashboard")
const theme = ref("light")
const themeColor = ref("#aa3bff")
const walletSummarySentinelRef = ref(null)
const walletSummaryShellRef = ref(null)
const walletSummaryCardRef = ref(null)
const isWalletSummaryCompact = ref(false)
const walletSummaryCompactStart = ref(0)
const walletSummaryReservedHeight = ref(0)
const hasLoadedUiPreferences = ref(false)
const hasAppliedStoredPeriodPreference = ref(false)

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const transactionSortState = ref({})

const walletName = ref("")
const walletColor = ref("#aa3bff")
const walletBalance = ref(0)
const walletBalanceInput = ref("")
const isWalletModalOpen = ref(false)
const editingWalletId = ref("")

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
const mobileEntryActionTransactionId = ref("")

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
	{ value: 1, label: "Janeiro" },
	{ value: 2, label: "Fevereiro" },
	{ value: 3, label: "Março" },
	{ value: 4, label: "Abril" },
	{ value: 5, label: "Maio" },
	{ value: 6, label: "Junho" },
	{ value: 7, label: "Julho" },
	{ value: 8, label: "Agosto" },
	{ value: 9, label: "Setembro" },
	{ value: 10, label: "Outubro" },
	{ value: 11, label: "Novembro" },
	{ value: 12, label: "Dezembro" }
]

const availableMonths = computed(() => {
	const months = Array.from(
		new Set(
			periodStore.periods
				.filter(period => period.year === selectedYear.value)
				.map(period => period.month)
		)
	).sort((a, b) => a - b)

	if (months.length === 0) {
		return monthOptions.filter(option => option.value === selectedMonth.value)
	}

	return monthOptions.filter(option => months.includes(option.value))
})

const yearFilterOptions = computed(() =>
	availableYears.value.map(year => ({
		value: year,
		label: String(year)
	}))
)

const entryTypeOptions = computed(() => {
	const options = [
		{ value: "expense", label: "Despesa" },
		{ value: "income", label: "Entrada" },
		{ value: "transfer", label: "Transferência" }
	]

	if (editingTransactionId.value) {
		options.push({ value: "adjustment", label: "Ajuste" })
	}

	return options
})

const entryCategoryOptions = computed(() =>
	categoryStore.entryCategories.map(category => ({
		value: category.id,
		label: category.name
	}))
)

const incomeCategoryOptions = computed(() => [
	{ value: getIncomeEntryCategoryId(), label: "Entradas" }
])

const walletOptions = computed(() =>
	walletStore.wallets.map(wallet => ({
		value: wallet.id,
		label: wallet.name
	}))
)

const adjustmentDirectionOptions = [
	{ value: "increase", label: "Aumenta saldo" },
	{ value: "decrease", label: "Diminui saldo" }
]

const selectedPeriodId = computed(() => buildPeriodId(selectedYear.value, selectedMonth.value))
const selectedPeriod = computed(() => periodStore.getPeriodById(selectedPeriodId.value))
const isEditingWallet = computed(() => Boolean(editingWalletId.value))

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
			).sort((left, right) => compareTransactionsForSummary(left, right, category.id))

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

const totalWalletBalance = computed(() =>
	dashboardWallets.value.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0)
)

let stopAuthListener = null
let unsubscribeThemePreference = null
let walletSummaryResizeObserver = null

const navigationTabs = [
	{ value: "dashboard", label: "Home", icon: "home" },
	{ value: "wallets", label: "Carteiras", icon: "wallet" },
	{ value: "categories", label: "Categorias", icon: "grid" },
	{ value: "settings", label: "Configurações", icon: "settings" }
]

onMounted(() => {
	applyTheme("light")
	window.addEventListener("keydown", handleModalKeydown)
	window.addEventListener("scroll", updateWalletSummaryCompact, { passive: true })
	window.addEventListener("resize", handleWalletSummaryLayoutChange)
	void nextTick().then(() => {
		measureWalletSummaryCompactStart()
		setupWalletSummaryResizeObserver()
		syncWalletSummaryReservedHeight()
		updateWalletSummaryCompact()
	})

	stopAuthListener = onUserChanged(currentUser => {
		user.value = currentUser
		authReady.value = true

		if (unsubscribeThemePreference) {
			unsubscribeThemePreference()
			unsubscribeThemePreference = null
		}

		if (currentUser) {
			unsubscribeThemePreference = subscribeThemePreference(
				({ theme: nextTheme, primaryColor, selectedYear: storedYear, selectedMonth: storedMonth }) => {
					applyTheme(nextTheme)
					applyThemeColor(primaryColor)
					if (!hasAppliedStoredPeriodPreference.value && storedYear && storedMonth) {
						selectedYear.value = storedYear
						selectedMonth.value = storedMonth
						hasAppliedStoredPeriodPreference.value = true
					}
					hasLoadedUiPreferences.value = true
				},
				() => {
					applyTheme("light")
					applyThemeColor(themeColor.value)
					hasLoadedUiPreferences.value = true
				}
			)
			walletStore.startWalletsSync()
			transactionStore.startTransactionsSync()
			categoryStore.startCategoriesSync()
			periodStore.startPeriodsSync()
			return
		}

		applyTheme("light")
		hasLoadedUiPreferences.value = false
		hasAppliedStoredPeriodPreference.value = false
		walletStore.clearWallets()
		transactionStore.clearTransactions()
		categoryStore.clearCategories()
		periodStore.clearPeriods()
		closeAllModals()
	})
})

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleModalKeydown)
	window.removeEventListener("scroll", updateWalletSummaryCompact)
	window.removeEventListener("resize", handleWalletSummaryLayoutChange)
	teardownWalletSummaryResizeObserver()

	if (unsubscribeThemePreference) {
		unsubscribeThemePreference()
	}

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
			const latestPeriod = [...periodStore.periods]
				.sort((a, b) => {
					if (a.year !== b.year) return a.year - b.year
					return a.month - b.month
				})
				.at(-1)

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

watch(
	() => [selectedYear.value, selectedMonth.value, Boolean(user.value), hasLoadedUiPreferences.value],
	async ([year, month, hasUser, preferencesLoaded]) => {
		if (!hasUser || !preferencesLoaded) return

		try {
			await saveThemePreference({
				theme: theme.value,
				primaryColor: themeColor.value,
				selectedYear: year,
				selectedMonth: month
			})
		} catch (error) {
			console.error("Failed to save selected period preference", error)
		}
	}
)

watch(entryType, nextType => {
	if (nextType === "income") {
		entryCategoryId.value = getIncomeEntryCategoryId()
		return
	}

	if (
		nextType === "expense" &&
		(!entryCategoryId.value || entryCategoryId.value === getIncomeEntryCategoryId())
	) {
		entryCategoryId.value = getPreferredEntryCategoryId()
	}
})

watch(currentPage, async () => {
	await nextTick()
	measureWalletSummaryCompactStart()
	setupWalletSummaryResizeObserver()
	syncWalletSummaryReservedHeight()
	updateWalletSummaryCompact()
})

function teardownWalletSummaryResizeObserver() {
	if (walletSummaryResizeObserver) {
		walletSummaryResizeObserver.disconnect()
		walletSummaryResizeObserver = null
	}
}

function measureWalletSummaryCompactStart() {
	if (currentPage.value !== "dashboard" || !walletSummarySentinelRef.value) {
		walletSummaryCompactStart.value = 0
		return
	}

	const bounds = walletSummarySentinelRef.value.getBoundingClientRect()
	walletSummaryCompactStart.value = Math.max(0, Math.round(bounds.top + window.scrollY))
}

function syncWalletSummaryReservedHeight() {
	if (currentPage.value !== "dashboard" || !walletSummaryCardRef.value) {
		walletSummaryReservedHeight.value = 0
		return
	}

	const nextHeight = Math.ceil(walletSummaryCardRef.value.offsetHeight || 0)
	if (!nextHeight) return
	walletSummaryReservedHeight.value = nextHeight
}

function setupWalletSummaryResizeObserver() {
	teardownWalletSummaryResizeObserver()

	if (currentPage.value !== "dashboard" || !walletSummaryCardRef.value) {
		isWalletSummaryCompact.value = false
		walletSummaryReservedHeight.value = 0
		return
	}

	syncWalletSummaryReservedHeight()

	if (typeof ResizeObserver !== "undefined") {
		walletSummaryResizeObserver = new ResizeObserver(() => {
			if (!isWalletSummaryCompact.value) {
				walletSummaryReservedHeight.value = 0
			}

			syncWalletSummaryReservedHeight()
		})

		walletSummaryResizeObserver.observe(walletSummaryCardRef.value)
	}
}

function updateWalletSummaryCompact() {
	if (currentPage.value !== "dashboard") {
		isWalletSummaryCompact.value = false
		return
	}

	if (!walletSummaryCompactStart.value) {
		measureWalletSummaryCompactStart()
	}

	const stickyTop = 16
	const currentScroll = window.scrollY + stickyTop
	isWalletSummaryCompact.value = currentScroll >= walletSummaryCompactStart.value
}

function handleWalletSummaryLayoutChange() {
	void nextTick().then(() => {
		if (!isWalletSummaryCompact.value) {
			walletSummaryReservedHeight.value = 0
		}

		measureWalletSummaryCompactStart()
		setupWalletSummaryResizeObserver()
		syncWalletSummaryReservedHeight()
		updateWalletSummaryCompact()
	})
}

function closeAllModals() {
	closeWalletModal()
	closeAdjustmentModal()
	closeCategoryModal()
	closeEntryModal()
	closeMobileEntryActionModal()
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
	return `${day}/${month}`
}

function applyTheme(nextTheme) {
	theme.value = nextTheme
	document.documentElement.setAttribute("data-theme", nextTheme)
}

function parseHexColor(value) {
	const normalized = String(value || "").trim()
	if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) return null
	return {
		r: parseInt(normalized.slice(1, 3), 16),
		g: parseInt(normalized.slice(3, 5), 16),
		b: parseInt(normalized.slice(5, 7), 16)
	}
}

function applyThemeColor(nextColor) {
	themeColor.value = nextColor
	document.documentElement.style.setProperty("--color-primary", nextColor)
	document.documentElement.style.setProperty("--accent", nextColor)

	const rgb = parseHexColor(nextColor)
	if (!rgb) return

	document.documentElement.style.setProperty("--theme-button-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`)
	document.documentElement.style.setProperty("--theme-button-hover-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`)
	document.documentElement.style.setProperty("--theme-button-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.28)`)
	document.documentElement.style.setProperty("--theme-button-hover-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.42)`)
	document.documentElement.style.setProperty("--theme-fab-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`)
	document.documentElement.style.setProperty("--theme-fab-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.32)`)
}

async function updateTheme(nextTheme) {
	applyTheme(nextTheme)

	if (!user.value) return

	try {
		await saveThemePreference({ theme: nextTheme, primaryColor: themeColor.value })
	} catch (error) {
		console.error("Failed to save theme preference", error)
	}
}

async function updateThemeColor(nextColor) {
	applyThemeColor(nextColor)

	if (!user.value) return

	try {
		await saveThemePreference({ theme: theme.value, primaryColor: nextColor })
	} catch (error) {
		console.error("Failed to save theme preference", error)
	}
}

function handleTabSelect(tab) {
	closeAllModals()
	currentPage.value = tab
}

function handleFabClick() {
	if (currentPage.value !== "dashboard" || !selectedPeriod.value || isSubmitting.value) return

	openCreateEntryModal()
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

function isKeyboardShortcutTargetBlocked() {
	const activeElement = document.activeElement

	if (!(activeElement instanceof HTMLElement)) return false

	const tagName = activeElement.tagName

	return (
		activeElement.isContentEditable ||
		tagName === "INPUT" ||
		tagName === "TEXTAREA" ||
		tagName === "SELECT" ||
		tagName === "BUTTON" ||
		tagName === "A"
	)
}

function handleModalKeydown(event) {
	if (isSubmitting.value) return

	const modalActions = getActiveModalActions()

	if (!modalActions) {
		if (
			event.key === "Enter" &&
			!event.shiftKey &&
			currentPage.value === "dashboard" &&
			selectedPeriod.value &&
			!isKeyboardShortcutTargetBlocked()
		) {
			event.preventDefault()
			handleFabClick()
		}
		return
	}

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

function isWalletColorMissing() {
	return !/^#[\da-fA-F]{6}$/.test(walletColor.value)
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

function isEntryDescriptionMissing() {
	return !hasText(entryDescription.value)
}

setCurrencyInput(walletBalance, walletBalanceInput, 0)
setCurrencyInput(adjustmentBalance, adjustmentBalanceInput, 0)
setCurrencyInput(entryAmount, entryAmountInput, 0)

function getPreferredEntryCategoryId() {
	return (
		categoryStore.entryCategories.find(category => category.name === "Despesas Fixas")?.id ||
		categoryStore.entryCategories[0]?.id ||
		""
	)
}

function getIncomeEntryCategoryId() {
	return categoryStore.entryCategories.find(category => category.name === "Entradas")?.id || ""
}

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

function getWalletColor(walletId) {
	return walletStore.getWallet(walletId)?.color || "var(--color-primary)"
}

function getTransactionWallets(transaction) {
	if (transaction.type === "income") {
		return [{ id: transaction.walletTo, name: getWalletName(transaction.walletTo), color: getWalletColor(transaction.walletTo) }]
	}

	if (transaction.type === "expense") {
		return [{ id: transaction.walletFrom, name: getWalletName(transaction.walletFrom), color: getWalletColor(transaction.walletFrom) }]
	}

	if (transaction.type === "transfer") {
		return [
			{ id: transaction.walletFrom, name: getWalletName(transaction.walletFrom), color: getWalletColor(transaction.walletFrom) },
			{ id: transaction.walletTo, name: getWalletName(transaction.walletTo), color: getWalletColor(transaction.walletTo) }
		]
	}

	const fallbackWalletId = transaction.walletTo || transaction.walletFrom
	return [{ id: fallbackWalletId, name: getWalletName(fallbackWalletId), color: getWalletColor(fallbackWalletId) }]
}

function getDefaultTransactionSort(sortKey = "description") {
	return {
		key: sortKey,
		direction: "asc"
	}
}

function getTransactionSortState(categoryId) {
	const currentState = transactionSortState.value[categoryId]

	if (currentState) {
		return currentState
	}

	return getDefaultTransactionSort()
}

function toggleTransactionSort(categoryId, sortKey) {
	const currentState = getTransactionSortState(categoryId)

	transactionSortState.value = {
		...transactionSortState.value,
		[categoryId]: currentState.key === sortKey
			? {
				key: sortKey,
				direction: currentState.direction === "asc" ? "desc" : "asc"
			}
			: getDefaultTransactionSort(sortKey)
	}
}

function isTransactionSortActive(categoryId, sortKey) {
	return getTransactionSortState(categoryId).key === sortKey
}

function getTransactionSortDirection(categoryId, sortKey) {
	return isTransactionSortActive(categoryId, sortKey)
		? getTransactionSortState(categoryId).direction
		: "asc"
}

function getTransactionSortMultiplier(categoryId) {
	return getTransactionSortState(categoryId).direction === "asc" ? 1 : -1
}

function compareTransactionsForSummary(left, right, categoryId) {
	const multiplier = getTransactionSortMultiplier(categoryId)
	const activeSort = getTransactionSortState(categoryId).key

	if (activeSort === "wallet") {
		const comparison = getPrimaryWalletLabel(left).localeCompare(getPrimaryWalletLabel(right), "pt-BR", {
			sensitivity: "base"
		})
		return finalizeTransactionComparison(comparison, left, right, multiplier)
	}

	if (activeSort === "date") {
		const comparison = getComparableTime(left.date) - getComparableTime(right.date)
		return finalizeTransactionComparison(comparison, left, right, multiplier)
	}

	if (activeSort === "amount") {
		const comparison = Number(left.amount || 0) - Number(right.amount || 0)
		return finalizeTransactionComparison(comparison, left, right, multiplier)
	}

	if (activeSort === "paid") {
		const comparison = Number(Boolean(left.paid)) - Number(Boolean(right.paid))
		return finalizeTransactionComparison(comparison, left, right, multiplier)
	}

	const comparison = getComparableTime(left.createdAt) - getComparableTime(right.createdAt)
	return finalizeTransactionComparison(comparison, left, right, multiplier)
}

function finalizeTransactionComparison(comparison, left, right, multiplier) {
	if (comparison !== 0) {
		return comparison * multiplier
	}

	const fallbackByCreatedAt = getComparableTime(left.createdAt) - getComparableTime(right.createdAt)

	if (fallbackByCreatedAt !== 0) {
		return fallbackByCreatedAt * multiplier
	}

	return String(left.id || "").localeCompare(String(right.id || ""), "pt-BR", { sensitivity: "base" }) * multiplier
}

function getPrimaryWalletLabel(transaction) {
	return getTransactionWallets(transaction)
		.map(wallet => wallet.name || "")
		.join(" ")
}

function getComparableTime(value) {
	if (value instanceof Date) {
		return value.getTime()
	}

	const parsedValue = new Date(value)
	return Number.isNaN(parsedValue.getTime()) ? 0 : parsedValue.getTime()
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

function canMoveCategory(categoryId, direction) {
	const orderedIds = categoryStore.manageableCategories.map(category => category.id)
	const currentIndex = orderedIds.findIndex(id => id === categoryId)

	if (currentIndex < 0) return false

	return direction === "up" ? currentIndex > 0 : currentIndex < orderedIds.length - 1
}

async function moveCategory(categoryId, direction) {
	if (!canMoveCategory(categoryId, direction)) return

	isSubmitting.value = true

	try {
		await categoryStore.moveCategory(categoryId, direction)
	} finally {
		isSubmitting.value = false
	}
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

	const sourcePeriod = selectedPeriod.value
	const newPeriodId = buildPeriodId(periodModalYear.value, periodModalMonth.value)

	isSubmitting.value = true

	try {
		const openingBalances = sourcePeriod
			? Object.fromEntries(
				walletStore.wallets.map(wallet => [
					wallet.id,
					getWalletBalanceForPeriodId(wallet, sourcePeriod.id)
				])
			)
			: Object.fromEntries(
				walletStore.wallets.map(wallet => [wallet.id, wallet.initialBalance])
			)

		await periodStore.ensurePeriod(periodModalYear.value, periodModalMonth.value, openingBalances)

		if (sourcePeriod) {
			for (const transaction of getTransactionsForPeriod(sourcePeriod.id)) {
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
	if (isWalletColorMissing()) return
	if (!isEditingWallet.value && isWalletBalanceMissing()) return

	isSubmitting.value = true

	try {
		if (isEditingWallet.value) {
			await walletStore.updateWallet(editingWalletId.value, {
				name: trimmedName,
				color: walletColor.value
			})
		} else {
			await walletStore.createWallet(trimmedName, walletBalance.value, walletColor.value)
		}

		closeWalletModal()
	} finally {
		isSubmitting.value = false
	}
}

function openWalletModal(wallet = null) {
	isWalletModalOpen.value = true
	editingWalletId.value = wallet?.id ?? ""
	walletName.value = wallet?.name ?? ""
	walletColor.value = wallet?.color ?? "#aa3bff"
	setCurrencyInput(walletBalance, walletBalanceInput, wallet?.initialBalance ?? 0)
}

function closeWalletModal() {
	isWalletModalOpen.value = false
	editingWalletId.value = ""
	walletName.value = ""
	walletColor.value = "#aa3bff"
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
	entryCategoryId.value = getPreferredEntryCategoryId()
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
	if (!entryWalletId.value) return
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

function isMobileViewport() {
	if (typeof window === "undefined") return false
	return window.innerWidth <= 480
}

async function handlePaidFieldClick(transaction, event) {
	if (!isMobileViewport() || isSubmitting.value) return

	const target = event?.target
	if (target instanceof HTMLElement && target.closest('input[type="checkbox"]')) {
		return
	}

	await toggleTransactionPaid(transaction)
}

function openMobileEntryActionModal(transaction) {
	mobileEntryActionTransactionId.value = transaction?.id || ""
}

function closeMobileEntryActionModal() {
	mobileEntryActionTransactionId.value = ""
}

function getTransactionById(transactionId) {
	return transactionStore.transactions.find(transaction => transaction.id === transactionId) || null
}

function handleEntryRowClick(transaction, event) {
	if (!isMobileViewport() || isSubmitting.value) return

	const target = event?.target
	if (!(target instanceof HTMLElement)) return
	if (target.closest(".paid-field")) return
	if (target.closest("button")) return

	openMobileEntryActionModal(transaction)
}

function handleMobileEntryEdit(transaction) {
	if (!transaction) return
	closeMobileEntryActionModal()
	openEditEntryModal(transaction)
}

function handleMobileEntryDelete(transaction) {
	if (!transaction) return
	closeMobileEntryActionModal()
	openDeleteTransactionModal(transaction)
}
</script>

<template>
	<div class="app-page">
		<h1 class="tittle">Minhas Finanças</h1>

		<div v-if="!authReady">
			Carregando autenticação...
		</div>

		<template v-else-if="!user">
			<ConfiguracoesView :theme="theme" :is-authenticated="false" :is-submitting="isSubmitting"
				@update-theme="updateTheme" @login="handleLogin" />
		</template>

		<template v-else-if="!isDataReady">
			<div>Conectando dados online...</div>
		</template>

		<template v-else>
			<section v-if="currentPage === 'dashboard'" class="filter-card">
				<div class="filter-row">
					<div class="filter-selects">
						<AppSelect v-model="selectedYear" :options="yearFilterOptions" class="year-filter" />

						<AppSelect v-model="selectedMonth" :options="availableMonths" class="month-filter" />
					</div>

					<div class="filter-spacer" />

					<div class="filter-actions">
						<button :disabled="isSubmitting" @click="openPeriodModal">
							<svg aria-hidden="true"
								xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor"
								viewBox="0 0 24 24">
								<path fill-rule="evenodd"
									d="M9 7V2.221a2 2 0 0 0-.5.365L4.586 6.5a2 2 0 0 0-.365.5H9Zm2 0V2h7a2 2 0 0 1 2 2v6.41A7.5 7.5 0 1 0 10.5 22H6a2 2 0 0 1-2-2V9h5a2 2 0 0 0 2-2Z"
									clip-rule="evenodd" />
								<path fill-rule="evenodd"
									d="M9 16a6 6 0 1 1 12 0 6 6 0 0 1-12 0Zm6-3a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0v-1h-1a1 1 0 1 1 0-2h1v-1a1 1 0 0 1 1-1Z"
									clip-rule="evenodd" />
							</svg>

						</button>

						<button class="danger-button month-remove-button" :disabled="isSubmitting || !selectedPeriod"
							@click="openDeletePeriodModal">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
							</svg>
						</button>
					</div>
				</div>
			</section>

			<BottomTabs :tabs="navigationTabs" :current-tab="currentPage" @select="handleTabSelect" />

			<div v-if="appError" class="error-box">
				{{ appError }}
			</div>

			<div v-if="currentPage === 'dashboard'" ref="walletSummarySentinelRef" class="wallet-summary-sentinel"
				aria-hidden="true" />
			<section v-if="currentPage === 'dashboard'" ref="walletSummaryShellRef" class="wallet-summary-section"
				:style="walletSummaryReservedHeight ? { minHeight: `${walletSummaryReservedHeight}px` } : undefined">
				<div ref="walletSummaryCardRef" class="wallet-summary-card"
					:class="{ 'is-compact': isWalletSummaryCompact }">
					<div class="wallet-summary-hero">
						<span v-if="!isWalletSummaryCompact" class="summary-eyebrow">Saldo total</span>
						<strong class="wallet-summary-total">{{ formatCurrency(totalWalletBalance) }}</strong>
					</div>

					<div class="wallet-summary-list">
						<div v-for="wallet in dashboardWallets" :key="wallet.id" class="wallet-summary-row">
							<div class="wallet-summary-meta">
								<span class="wallet-summary-dot"
									:style="{ background: wallet.color || 'var(--color-primary)' }" />
								<span>{{ wallet.name }}</span>
							</div>
							<strong>{{ formatCurrency(wallet.balance) }}</strong>
						</div>
					</div>
				</div>
			</section>

			<ResumoView v-if="currentPage === 'dashboard'" :show-fab="true" @fab-click="handleFabClick">
				<div class="transaction-sections">
					<div v-for="group in groupedTransactions" :key="group.id" class="transaction-section">
						<div class="section-header">
							<h2>{{ group.title }}</h2>
							<div v-if="false" class="section-actions">
								<button class="icon-button" :disabled="isSubmitting || !canMoveCategory(group.id, 'up')"
									@click="moveCategory(group.id, 'up')">
									?
								</button>
								<button class="icon-button"
									:disabled="isSubmitting || !canMoveCategory(group.id, 'down')"
									@click="moveCategory(group.id, 'down')">
									?
								</button>
							</div>
						</div>

						<div class="entry-list">
							<div class="entry-list-head">
								<span
									class="entry-sort-button entry-sort-button-start"
									@click="toggleTransactionSort(group.id, 'description')">
									<span>Descrição</span>
									<span class="sort-icon" :class="[getTransactionSortDirection(group.id, 'description'), { active: isTransactionSortActive(group.id, 'description') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</span>
								<span
									class="entry-sort-button centerTittle"
									@click="toggleTransactionSort(group.id, 'wallet')">
									<span>Carteira</span>
									<span class="sort-icon" :class="[getTransactionSortDirection(group.id, 'wallet'), { active: isTransactionSortActive(group.id, 'wallet') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</span>
								<span
									class="entry-sort-button centerTittle"
									@click="toggleTransactionSort(group.id, 'date')">
									<span>Data</span>
									<span class="sort-icon" :class="[getTransactionSortDirection(group.id, 'date'), { active: isTransactionSortActive(group.id, 'date') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</span>
								<span
									class="entry-sort-button centerTittle"
									@click="toggleTransactionSort(group.id, 'amount')">
									<span>Valor</span>
									<span class="sort-icon" :class="[getTransactionSortDirection(group.id, 'amount'), { active: isTransactionSortActive(group.id, 'amount') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</span>
								<span
									class="entry-sort-button centerTittle"
									@click="toggleTransactionSort(group.id, 'paid')">
									<span>Pago</span>
									<span class="sort-icon" :class="[getTransactionSortDirection(group.id, 'paid'), { active: isTransactionSortActive(group.id, 'paid') }]">
										<svg viewBox="0 0 16 16" aria-hidden="true">
											<path d="M8 3 12 7H4z" />
											<path d="M8 13 4 9h8z" />
										</svg>
									</span>
								</span>
								<span class="centerTittle">Ações</span>
							</div>
							<div v-if="false" class="entry-list-head">
								<span>Descrição</span>
								<span class="centerTittle">Carteira</span>
								<span class="centerTittle">Data</span>
								<span class="centerTittle">Valor</span>
								<span class="centerTittle">Pago</span>
								<span class="centerTittle">Ações</span>
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
								<span class="description-field" data-label="Descrição" @click="handleEntryRowClick(transaction, $event)">{{ transaction.description || transaction.type }}</span>
								<span class="entry-wallets" data-label="Carteira">
									<template v-for="(wallet, index) in getTransactionWallets(transaction)"
										:key="`${transaction.id}-${wallet.id || index}`">
										<span class="wallet-summary-meta entry-wallet-meta">
											<span class="wallet-summary-dot" :style="{ background: wallet.color }" />
											<span>{{ wallet.name }}</span>
										</span>
										<span v-if="transaction.type === 'transfer' && index === 0"
											class="entry-wallet-arrow">
											?
										</span>
									</template>
								</span>
								<span data-label="Data">{{ formatDateDisplay(transaction.date) }}</span>
								<span data-label="Valor">{{ formatCurrency(transaction.amount) }}</span>
								<span
									class="paid-field"
									data-label="Pago"
									@click="handlePaidFieldClick(transaction, $event)"
								>
									<input type="checkbox" :checked="transaction.paid" :disabled="isSubmitting"
										@change="toggleTransactionPaid(transaction)"
										@click.stop />
								</span>
								<span class="row-actions" data-label="Ações">
									<button :disabled="isSubmitting" @click="openEditEntryModal(transaction)">
										<span class="button-icon button-icon-edit">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
												<path
													d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5z" />
												<path d="M8 13h8v1.5H8zm0 3h6v1.5H8z" />
											</svg>
										</span>
									</button>

									<button class="danger-button" :disabled="isSubmitting"
										@click="openDeleteTransactionModal(transaction)">
										<span class="button-icon button-icon-delete" aria-hidden="true">
											<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
												<path
													d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
											</svg>
										</span>
									</button>
								</span>
							</div>
						</div>
					</div>
				</div>
			</ResumoView>

			<div
				v-if="mobileEntryActionTransactionId"
				class="mobile-entry-action-backdrop"
				@click="closeMobileEntryActionModal"
			>
				<div class="mobile-entry-action-modal" @click.stop>
					<button
						class="primary-button"
						:disabled="isSubmitting"
						@click="handleMobileEntryEdit(getTransactionById(mobileEntryActionTransactionId))"
					>
						Editar
					</button>
					<button
						class="danger-button"
						:disabled="isSubmitting"
						@click="handleMobileEntryDelete(getTransactionById(mobileEntryActionTransactionId))"
					>
						Excluir
					</button>
				</div>
			</div>

			<section v-if="currentPage === 'wallets'" class="page-section management-page-section">
				<div class="toolbar">
					<button :disabled="isSubmitting" @click="openWalletModal">
						<span class="button-icon button-icon-plus" aria-hidden="true" />
						<span>Criar carteira</span>
					</button>
				</div>

				<div class="simple-list">
					<div v-for="wallet in walletStore.wallets" :key="wallet.id" class="simple-list-row wallet-list-row">
						<span data-label="Carteira">
							<span class="wallet-summary-meta">
								<span class="wallet-summary-dot"
									:style="{ background: wallet.color || 'var(--color-primary)' }" />
								<span>{{ wallet.name }}</span>
							</span>
						</span>
						<span data-label="Saldo">{{ formatCurrency(getWalletBalanceForPeriod(wallet)) }}</span>
						<span class="row-actions" data-label="Ações">
							<button :disabled="isSubmitting" @click="openWalletModal(wallet)">
								<span class="button-icon button-icon-edit" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path
											d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5z" />
										<path d="M8 13h8v1.5H8zm0 3h6v1.5H8z" />
									</svg>
								</span>
							</button>

							<button :disabled="isSubmitting" @click="openAdjustmentModal(wallet)">
								<span class="button-icon button-icon-adjust" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5z" />
										<path d="M14.5 6L18 9.5" stroke="white" stroke-width="1.5" />
									</svg>
								</span>
							</button>

							<button class="danger-button" :disabled="isSubmitting"
								@click="openDeleteWalletModal(wallet)">
								<span class="button-icon button-icon-delete" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path
											d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
									</svg>
								</span>
							</button>
						</span>
					</div>
				</div>
			</section>

			<section v-if="currentPage === 'categories'" class="page-section management-page-section">
				<div class="toolbar">
					<button :disabled="isSubmitting" @click="openCategoryModal()">
						<span class="button-icon button-icon-plus" aria-hidden="true" />
						<span>Criar categoria</span>
					</button>
				</div>

				<div class="simple-list">
					<div v-for="category in categoryStore.manageableCategories" :key="category.id"
						class="simple-list-row category-row"
						:class="{ 'drag-over-row': dragOverCategoryId === category.id }"
						@dragover="handleCategoryDragOver(category.id, $event)"
						@drop.prevent="handleCategoryDrop(category.id)">
						<span class="category-row-name" data-label="Categoria">{{ category.name }}</span>
						<span class="row-actions category-row-actions" data-label="Ações">
							<button class="icon-button button-icon-drag desktop-category-drag" :disabled="isSubmitting" draggable="true"
								title="Arrastar categoria" @dragstart="handleCategoryDragStart(category.id, $event)"
								@dragend="handleCategoryDragEnd">
								<span>
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path d="M7 14l5 5 5-5H7zM7 10l5-5 5 5H7z" />
									</svg>
								</span>
							</button>

							<button class="icon-button category-move-touch-button"
								:disabled="isSubmitting || !canMoveCategory(category.id, 'up')"
								title="Mover categoria para cima" @click="moveCategory(category.id, 'up')">
								<span class="button-icon category-move-icon" aria-hidden="true">
									<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
										<path d="M7 14l5-5 5 5" stroke="white" stroke-width="2.4" stroke-linecap="round"
											stroke-linejoin="round" />
									</svg>
								</span>
							</button>

							<button class="icon-button category-move-touch-button"
								:disabled="isSubmitting || !canMoveCategory(category.id, 'down')"
								title="Mover categoria para baixo" @click="moveCategory(category.id, 'down')">
								<span class="button-icon category-move-icon" aria-hidden="true">
									<svg width="28" height="28" viewBox="0 0 24 24" fill="none">
										<path d="M7 10l5 5 5-5" stroke="white" stroke-width="2.4" stroke-linecap="round"
											stroke-linejoin="round" />
									</svg>
								</span>
							</button>

							<button :disabled="isSubmitting" @click="openCategoryModal(category)">
								<span class="button-icon button-icon-edit" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path
											d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5z" />
										<path d="M8 13h8v1.5H8zm0 3h6v1.5H8z" />
									</svg>
								</span>
							</button>

							<button class="danger-button" :disabled="isSubmitting"
								@click="openDeleteCategoryModal(category)">
								<span class="button-icon button-icon-delete" aria-hidden="true">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="white">
										<path
											d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
									</svg>
								</span>
							</button>
						</span>
					</div>
				</div>
			</section>

			<ConfiguracoesView v-if="currentPage === 'settings'" class="management-page-section" :theme="theme" :theme-color="themeColor"
				:user-email="user?.email || ''" :is-authenticated="Boolean(user)" :is-submitting="isSubmitting"
				@update-theme="updateTheme" @update-theme-color="updateThemeColor" @login="handleLogin"
				@logout="handleLogout" />
		</template>

		<div v-if="isWalletModalOpen" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('wallet', $event)">
				<h3>{{ isEditingWallet ? "Editar carteira" : "Criar carteira" }}</h3>

				<div class="field-group">
					<label class="field-label">Nome</label>
					<input v-model="walletName" :class="{ 'required-empty': isWalletNameMissing() }"
						placeholder="Nome" />
				</div>
				<div class="field-group">
					<label class="field-label">Cor</label>
					<div class="color-field" :class="{ 'required-empty': isWalletColorMissing() }">
						<input v-model="walletColor" class="color-picker" type="color" />
						<input v-model="walletColor" class="color-code-input" type="text" placeholder="#AA3BFF"
							maxlength="7" />
					</div>
				</div>

				<div class="toolbar">
					<button class="primary-button" :disabled="isSubmitting" @click="addWallet">
						Salvar
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeWalletModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="adjustingWalletId" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('adjustment', $event)">
				<h3>Ajustar saldo</h3>

				<div class="field-group">
					<label class="field-label">Valor</label>
					<input :class="{ 'required-empty': isAdjustmentBalanceMissing() }" :value="adjustmentBalanceInput"
						type="text" inputmode="decimal" placeholder="R$ 0,00" @keydown="handleCurrencyKeydown($event)"
						@focus="handleCurrencyFieldFocus('adjustment', $event)"
						@input="syncCurrencyFieldInput('adjustment', $event)"
						@blur="handleCurrencyFieldBlur('adjustment')" />
				</div>
				<div class="field-group">
					<label class="field-label">Descrição</label>
					<textarea v-model="adjustmentDescription"
						:class="{ 'required-empty': isAdjustmentDescriptionMissing() }" rows="4"
						placeholder="Descrição do ajuste" />
				</div>

				<div class="toolbar">
					<button class="primary-button" :disabled="isSubmitting" @click="saveAdjustment">
						Salvar ajuste
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeAdjustmentModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="isCategoryModalOpen" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('category', $event)">
				<h3>{{ editingCategoryId ? "Editar categoria" : "Criar categoria" }}</h3>

				<div class="field-group">
					<label class="field-label">Nome</label>
					<input v-model="categoryName" :class="{ 'required-empty': isCategoryNameMissing() }"
						placeholder="Nome da categoria" />
				</div>

				<div class="toolbar">
					<button class="primary-button" :disabled="isSubmitting" @click="saveCategory">
						Salvar
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeCategoryModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="isPeriodModalOpen" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('period', $event)">
				<h3>Criar mês</h3>

				<div class="field-group">
					<label class="field-label">Ano</label>
					<input v-model.number="periodModalYear" :class="{ 'required-empty': isPeriodYearMissing() }"
						type="number" placeholder="Ano" />
				</div>

				<div class="field-group">
					<label class="field-label">Mês</label>
					<AppSelect
						v-model="periodModalMonth"
						:options="monthOptions"
						:invalid="!periodModalMonth"
						placeholder="Selecione o mês"
					/>
				</div>

				<div class="toolbar">
					<button class="primary-button" :disabled="isSubmitting" @click="savePeriod">
						Salvar
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closePeriodModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="isEntryModalOpen" class="modal-backdrop entry-modal-backdrop">
			<div class="modal entry-modal" @keydown.enter="handleModalEnter('entry', $event)">
				<h3>{{ editingTransactionId ? "Editar entrada" : "Nova entrada" }}</h3>

				<div class="field-group">
					<label class="field-label">Descrição</label>
					<input v-model="entryDescription" :class="{ 'required-empty': isEntryDescriptionMissing() }"
						placeholder="Descrição" />
				</div>

				<div class="field-group">
					<label class="field-label">Tipo de entrada</label>
					<AppSelect v-model="entryType" :options="entryTypeOptions" />
				</div>

				<div v-if="entryType !== 'adjustment' && entryType !== 'transfer'" class="field-group">
					<label class="field-label">Categoria</label>
					<AppSelect
						v-if="entryType === 'expense'"
						v-model="entryCategoryId"
						:options="entryCategoryOptions"
						:invalid="isEntryCategoryMissing()"
						placeholder="Selecione a categoria"
					/>
					<AppSelect
						v-else-if="entryType === 'income'"
						v-model="entryCategoryId"
						:options="incomeCategoryOptions"
						disabled
					/>
				</div>

				<div class="field-group">
					<label class="field-label">Carteira</label>
					<AppSelect
						v-model="entryWalletId"
						:options="walletOptions"
						:invalid="isEntryWalletMissing()"
						placeholder="Selecione a carteira"
					/>
				</div>

				<div v-if="entryType === 'transfer'" class="field-group">
					<label class="field-label">Carteira de destino</label>
					<AppSelect
						v-model="entryTargetWalletId"
						:options="walletOptions"
						:invalid="isEntryTargetWalletMissing()"
						placeholder="Selecione a carteira de destino"
					/>
				</div>

				<div v-if="entryType === 'adjustment'" class="field-group">
					<label class="field-label">Direção do ajuste</label>
					<AppSelect v-model="entryAdjustmentDirection" :options="adjustmentDirectionOptions" />
				</div>

				<div class="field-group">
					<label class="field-label">Data</label>
					<input v-model="entryDate" :class="{ 'required-empty': isEntryDateMissing() }" type="date"
						:min="entryMinDate" :max="entryMaxDate" />
				</div>
				<div class="field-group">
					<label class="field-label">Valor</label>
					<input :value="entryAmountInput" type="text" inputmode="decimal" placeholder="R$ 0,00"
						@keydown="handleCurrencyKeydown($event)"
						@focus="handleCurrencyFieldFocus('entry', $event)"
						@input="syncCurrencyFieldInput('entry', $event)" @blur="handleCurrencyFieldBlur('entry')" />
				</div>

				<div v-if="entryFormError" class="error-text">
					{{ entryFormError }}
				</div>

				<div class="toolbar">
					<button class="primary-button" :disabled="isSubmitting" @click="saveEntry">
						Salvar
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeEntryModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="deleteWalletId" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('delete-wallet', $event)">
				<h3>Excluir carteira</h3>
				<p>Tem certeza que deseja excluir esta carteira?</p>

				<div class="toolbar">
					<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteWallet">
						Confirmar exclusão
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeDeleteWalletModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="deleteCategoryId" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('delete-category', $event)">
				<h3>Excluir categoria</h3>
				<p>Tem certeza que deseja excluir esta categoria?</p>

				<div class="toolbar">
					<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteCategory">
						Confirmar exclusão
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeDeleteCategoryModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

			<div v-if="deleteTransactionId" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('delete-transaction', $event)">
				<h3>Excluir entrada</h3>
				<p>Tem certeza que deseja excluir esta entrada?</p>

				<div class="toolbar">
					<button class="danger-button" :disabled="isSubmitting" @click="confirmDeleteTransaction">
						Confirmar exclusão
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeDeleteTransactionModal">
						Cancelar
					</button>
				</div>
			</div>
		</div>

		<div v-if="deletePeriodId" class="modal-backdrop">
			<div class="modal narrow-mobile-modal" @keydown.enter="handleModalEnter('delete-period', $event)">
				<h3>Excluir mês</h3>
				<p>Tem certeza que deseja excluir este mês e todas as entradas dele?</p>

				<div class="toolbar">
					<button class="danger-button" :disabled="isSubmitting" @click="confirmDeletePeriod">
						Confirmar exclusão
					</button>

					<button class="secondary-button" :disabled="isSubmitting" @click="closeDeletePeriodModal">
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
	grid-template-columns: minmax(0, 1fr);
	justify-items: stretch;
	gap: 16px;
	width: 100%;
	min-width: 0;
	padding: 24px 24px 120px;
	max-width: 1180px;
	margin: 0 auto;
	text-align: left;
	box-sizing: border-box;
}

.tittle {
	text-align: center;
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
.error-box,
.filter-card {
	position: relative;
	z-index: 1;
	display: grid;
	width: 100%;
	min-width: 0;
	gap: 12px;
	padding: 18px;
	border: 1px solid var(--glass-border);
	border-radius: 24px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
	box-sizing: border-box;
}

.management-page-section {
	width: min(50vw, 560px);
	max-width: 100%;
	justify-self: center;
}

.management-page-section .simple-list {
	width: 100%;
	min-width: 0;
	box-sizing: border-box;
	overflow: hidden;
}

.management-page-section .simple-list-row {
	width: 100%;
	min-width: 0;
	grid-template-columns: minmax(0, 1fr) auto auto;
	box-sizing: border-box;
}

.management-page-section .category-row {
	grid-template-columns: minmax(0, 1fr) auto;
}

.management-page-section .simple-list-row > :first-child {
	min-width: 0;
	text-align: left;
}

.management-page-section .simple-list-row > :nth-child(2) {
	justify-self: end;
	text-align: right;
}

.equal-section {
	min-height: 420px;
}

.simple-list-row,
.entry-list-head,
.entry-row {
	display: grid;
	grid-template-columns: minmax(180px, 2.2fr) minmax(150px, 1.35fr) minmax(110px, 1fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr);
	width: 100%;
	min-width: 0;
	max-width: 100%;
	box-sizing: border-box;
	gap: 12px;
	min-height: 64px;
	align-items: center;
	justify-items: center;
}

.simple-list-row > *,
.entry-list-head > *,
.entry-row > * {
	min-width: 0;
}

.entry-list-head>*:first-child,
.simple-list-row>*:first-child,
.entry-row>*:first-child {
	justify-self: start;
	text-align: left;
	overflow-wrap: anywhere;
}

.wallet-summary-sentinel {
	height: 1px;
	margin-top: -1px;
	pointer-events: none;
}

.wallet-summary-section {
	position: relative;
	position: sticky;
	top: 16px;
	z-index: 2;
	align-self: start;
}

.wallet-summary-card {
	align-self: start;
	display: grid;
	gap: 18px;
	padding: 25px;
	align-items: center;
	border: 1px solid var(--glass-border-strong);
	border-radius: 28px;
	background:
		radial-gradient(circle at top center, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 58%),
		linear-gradient(180deg, var(--glass-highlight) 0%, transparent 100%),
		var(--glass-surface-strong);
	box-shadow:
		var(--shadow),
		inset 0 1px 0 rgba(255, 255, 255, 0.18),
		inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 12%, transparent),
		inset 0 18px 36px color-mix(in srgb, var(--color-primary) 10%, transparent);
	backdrop-filter: blur(26px);
	transition:
		padding 0.2s ease,
		gap 0.2s ease,
		border-radius 0.2s ease,
		box-shadow 0.2s ease,
		background 0.2s ease;
}

.wallet-summary-card.is-compact {
	gap: 12px;
	padding: 16px 18px;
	border-radius: 22px;
	box-shadow:
		var(--shadow),
		inset 0 1px 0 rgba(255, 255, 255, 0.16),
		inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 14%, transparent),
		inset 0 10px 22px color-mix(in srgb, var(--color-primary) 9%, transparent);
}

.wallet-summary-hero {
	display: grid;
	gap: 8px;
	justify-items: center;
	text-align: center;
	padding: 8px 0 12px;
	width: 100%;
	max-width: none;
	margin: 0 auto;
}

.wallet-summary-card.is-compact .wallet-summary-hero {
	gap: 4px;
	padding: 0;
}

.summary-eyebrow {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--text-soft);
}

.wallet-summary-total {
	font-size: clamp(2rem, 5vw, 3.35rem);
	line-height: 1;
	letter-spacing: -0.04em;
	color: var(--text-h);
}

.wallet-summary-card.is-compact .wallet-summary-total {
	font-size: clamp(1.4rem, 3.2vw, 2.2rem);
}

.summary-subtitle {
	font-size: 13px;
	color: var(--text-soft);
}

.wallet-summary-list {
	max-width: none;
	margin: 0 auto;
	box-sizing: border-box;
}

.wallet-summary-row {
	display: grid;
	grid-template-columns: 1fr auto;
	width: 100%;
	align-items: center;
	padding: 9px 0 11px;
	gap: 12px;
	margin: 0 auto;
	box-sizing: border-box;
}

.wallet-summary-card.is-compact .wallet-summary-row {
	padding: 2px 0 3px;
}

.wallet-summary-row> :last-child {
	justify-self: end;
	text-align: right;
}

.simple-list-row {
	grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) minmax(180px, 1.6fr);
	border: 1px solid var(--input-border);
	border-radius: 16px;
	background: color-mix(in srgb, var(--input-surface) 88%, transparent);
}

.wallet-summary-meta {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	min-width: 0;
	font-size: 0.94rem;
	color: var(--text-soft);
}

.wallet-summary-card.is-compact .wallet-summary-meta {
	gap: 8px;
	font-size: 0.88rem;
}

.wallet-summary-dot {
	width: 10px;
	height: 10px;
	border-radius: 999px;
	background: linear-gradient(135deg, var(--color-primary), var(--color-primary-soft));
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.wallet-summary-meta > :last-child {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.entry-wallets {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
	min-width: 0;
}

.entry-wallet-meta {
	color: var(--text);
}

.entry-wallet-arrow {
	color: var(--text-soft);
	font-weight: 700;
}

.entry-list {
	display: grid;
	gap: 8px;
}

.entry-list-head {
	font-weight: 700;
	padding-bottom: 8px;
	padding-left: 12px;
	padding-right: 12px;
	border-bottom: 1px solid var(--glass-divider);
}

.entry-sort-button {
	display: inline-flex;
	align-items: flex-end;
	justify-content: center;
	gap: px;
	width: fit-content;
	padding: 0;
	background: transparent;
	color: inherit;
	font: inherit;
	font-weight: inherit;
	cursor: pointer;
	user-select: none;
}

.entry-sort-button-start {
	justify-self: start;
	align-items: flex-end;
}

.entry-sort-button:hover {
	color: inherit;
}

.sort-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	align-self: flex-end;
	color: #ffffff;
	transition: transform 0.18s ease;
}

.sort-icon svg {
	width: 18px;
	height: 18px;
	fill: currentColor;
}

.sort-icon.active {
	color: var(--color-primary);
}

.sort-icon.asc {
	transform: rotate(0deg);
}

.sort-icon.desc {
	transform: rotate(180deg);
}

.entry-row,
.simple-list-row {
	padding: 10px 12px;
	overflow: visible;
}

.entry-row {
	padding-inline: 12px;
	border-radius: 16px;
	background: color-mix(in srgb, var(--color-primary) 8%, var(--input-surface));
}

.entry-row input[type="checkbox"] {
	appearance: none;
	-webkit-appearance: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	min-width: 22px;
	min-height: 22px;
	box-sizing: border-box;
	border: 2px solid var(--input-border-strong);
	border-radius: 50%;
	background: color-mix(in srgb, var(--input-surface) 92%, transparent);
	cursor: pointer;
	position: relative;
	transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
	outline: none;
}

.entry-row input[type="checkbox"]::before {
	content: "";
	position: absolute;
	top: 50%;
	left: 50%;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: #28c35d;
	transform: translate(-50%, -50%) scale(0);
	transition: transform 0.2s ease;
	box-shadow: inset 0 0 0 0 rgba(0, 0, 0, 0.08);

}

.entry-row input[type="checkbox"]:checked {
	border-color: #28c35d;
	box-shadow: 0 0 0 4px rgba(40, 195, 93, 0.12);
	background: rgba(40, 195, 93, 0.08);
}

.entry-row input[type="checkbox"]:focus-visible {
	border-color: var(--input-focus-border);
	box-shadow: 0 0 0 3px var(--input-focus-ring);
}

.entry-row input[type="checkbox"]:checked::before {
	transform: translate(-50%, -50%) scale(1);
}

.entry-row input[type="checkbox"]:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.wallet-summary-row:last-child {
	border-bottom: 0;
}

.paid-row {
	background: var(--success-surface);
}

.entry-empty {
	padding: 8px 12px;
	font-style: italic;
	font-size: 14px;
	color: #FFFFFF63
}

.field-group {
	display: grid;
	gap: 6px;
}

.field-label {
	font-size: 12px;
	line-height: 1.2;
	color: var(--text-soft);
	font-weight: 600;
	letter-spacing: 0.02em;
}

.field-note {
	font-size: 12px;
	line-height: 1.4;
	color: var(--text-soft);
}

.color-field {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 10px 12px;
	border: 1px solid var(--input-border);
	border-radius: 16px;
	background: var(--input-surface);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease,
		background-color 0.18s ease;
}

.color-picker {
	width: 46px;
	min-width: 46px;
	height: 46px;
	padding: 0;
	border: 1px solid color-mix(in srgb, var(--color-primary) 22%, var(--glass-border-strong));
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-primary) 10%, var(--glass-surface-strong));
	cursor: pointer;
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.3),
		0 0 0 4px color-mix(in srgb, var(--color-primary) 10%, transparent);
	overflow: hidden;
}

.color-picker::-webkit-color-swatch-wrapper {
	padding: 3px;
	border-radius: 999px;
}

.color-picker::-webkit-color-swatch {
	border: 0;
	border-radius: 999px;
}

.color-picker::-moz-color-swatch {
	border: 0;
	border-radius: 999px;
}

.color-code-input {
	border: 0;
	padding: 0;
	background: transparent;
	box-shadow: none;
	flex: 1;
	min-width: 0;
	height: 40px;
}

.transaction-sections {
	display: grid;
	gap: 16px;
	min-width: 0;
}

.filter-card {
	position: relative;
	z-index: 12;
	overflow: visible;
	display: grid;
	padding: 16px;
	border: 1px solid var(--glass-border);
	border-radius: 22px;
	background: var(--glass-surface);
	box-shadow: var(--shadow);
	backdrop-filter: blur(22px);
}

.filter-row {
	position: relative;
	z-index: 2;
	display: flex;
	gap: 12px;
	align-items: center;
	flex-wrap: nowrap;
	width: 100%;
}

.filter-selects {
	position: relative;
	z-index: 3;
	display: flex;
	gap: 12px;
	align-items: center;
	flex: 1 1 auto;
	min-width: 0;
}

.filter-row select {
	flex: 0 1 auto;
	min-width: 0;
}

.filter-spacer {
	flex: 1 1 auto;
	min-width: 0;
}

.filter-actions {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: flex-end;
	flex: 0 0 auto;
}

.filter-actions button {
	color: var(--text-soft);
}

.filter-actions button:hover {
	color: var(--text-h);
}

.filter-actions .danger-button,
.filter-actions .month-remove-button {
	color: var(--danger-text);
}

.filter-actions button svg,
.filter-actions button svg * {
	fill: currentColor !important;
	stroke: currentColor !important;
}

.filter-row button {
	width: 36px;
	height: 36px;
	min-width: 36px;
	padding: 0;
	border-radius: 50%;
	flex: 0 0 36px;
}

.year-filter {
	flex: 0 0 90px;
	min-width: 80px;
	max-width: 100px;
	height: 36px;
}

.month-filter {
	flex: 1;
	min-width: 0;
	height: 36px;
}

.month-remove-button {
	background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

@media (min-width: 481px) and (max-width: 1023px) {
	.row-actions,
	.toolbar {
		width: auto;
	}

	.row-actions button,
	.toolbar button {
		flex: 0 0 auto;
	}

	.app-page {
		padding-inline: 18px;
	}

	.page-section,
	.transaction-section,
	.simple-list,
	.error-box,
	.filter-card {
		padding: 16px;
	}

	.wallet-summary-list {
		width: min(70%, 100%);
		margin-inline: auto;
	}

	.wallet-summary-row,
	.wallet-summary-card.is-compact .wallet-summary-row {
		width: 100%;
		padding-inline: 24px;
	}

	.management-page-section {
		width: min(100%, 560px);
	}

	.filter-row {
		gap: 10px;
	}

	.filter-selects {
		gap: 10px;
		flex: 1 1 auto;
		min-width: 0;
	}

	.filter-selects > .year-filter {
		flex: 0 0 96px;
		min-width: 96px;
		max-width: 112px;
		--app-select-min-height: 40px;
	}

	.filter-selects > .month-filter {
		flex: 1 1 140px;
		min-width: 0;
		max-width: none;
		--app-select-min-height: 40px;
	}

	.filter-selects :deep(.app-select__trigger) {
		min-height: var(--app-select-min-height, 40px);
		padding-inline: 12px 38px;
	}

	.filter-actions {
		gap: 10px;
	}

	.filter-row button {
		width: 40px;
		height: 40px;
		min-width: 40px;
		flex: 0 0 40px;
	}

	.entry-list-head,
	.entry-row {
		grid-template-columns: minmax(110px, 1.8fr) minmax(96px, 1.1fr) minmax(68px, 0.78fr) minmax(82px, 0.9fr) 40px minmax(84px, 0.9fr);
		gap: 8px;
		align-items: center;
	}

	.management-page-section .simple-list-row {
		grid-template-columns: minmax(0, 1fr) auto auto;
		grid-template-areas: none;
		align-items: center;
	}

	.management-page-section .simple-list-row > :nth-child(1) {
		grid-area: auto;
	}

	.management-page-section .simple-list-row > :nth-child(2) {
		grid-area: auto;
		justify-self: end;
		text-align: right;
	}

	.management-page-section .simple-list-row > :nth-child(3) {
		grid-area: auto;
		justify-self: end;
	}

	.category-row {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas: "name actions";
	}

	.category-row > :nth-child(1) {
		grid-area: name;
	}

	.category-row > :nth-child(2) {
		grid-area: actions;
	}

	.simple-list-row.category-row .category-row-actions {
		display: flex;
		width: 100%;
		min-width: 0;
		justify-self: stretch;
		justify-content: center;
		align-items: center;
		gap: 10px;
	}

	.simple-list-row.category-row .category-row-actions button {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		min-width: 42px;
		max-width: 42px;
		margin: 0;
	}

	.row-actions {
		display: inline-flex;
		width: auto;
		min-width: max-content;
		justify-self: end;
	}

	.row-actions button {
		width: 36px;
		height: 36px;
		min-width: 36px;
	}

	.category-row .row-actions button,
	.category-row .row-actions .icon-button {
		border-radius: 50%;
	}

	.desktop-category-drag {
		display: none !important;
	}

	.category-move-touch-button {
		display: inline-flex !important;
	}

	.simple-list-row.category-row .category-move-touch-button .category-move-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.simple-list-row.category-row .category-move-touch-button .category-move-icon svg {
		display: block;
		width: 22px;
		height: 22px;
		margin: auto;
	}

	.simple-list-row.category-row .category-move-touch-button .category-move-icon svg path {
		vector-effect: non-scaling-stroke;
	}

	.simple-list-row.category-row .category-move-touch-button:disabled {
		opacity: 1;
		cursor: not-allowed;
		border-color: color-mix(in srgb, var(--glass-border-strong) 72%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%),
			color-mix(in srgb, var(--input-disabled-bg) 94%, var(--color-bg));
		color: color-mix(in srgb, var(--text-soft) 72%, transparent);
		box-shadow: none;
		filter: saturate(0.25);
	}

	.simple-list-row.category-row .category-move-touch-button:disabled .category-move-icon svg {
		opacity: 0.42;
	}
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	border-radius: 16px;
	background: #7522c52e;
	background: color-mix(in srgb, var(--color-primary) 18%, transparent);
}

.section-header h2 {
	margin: 0;
}

.section-actions {
	display: flex;
	gap: 6px;
}

.icon-button {
	width: 38px;
	height: 38px;
	padding: 0;
	display: inline-grid;
	place-items: center;
	border-radius: 14px;
}

.row-actions {
	display: inline-flex;
	width: auto;
	min-width: max-content;
	align-items: center;
	justify-content: flex-end;
	justify-self: end;
	flex-wrap: nowrap;
	gap: 8px;
}

.entry-list-head > :last-child,
.entry-row > :last-child,
.simple-list-row > :last-child {
	justify-self: end;
	text-align: right;
}

.row-actions button,
.icon-button {
	color: var(--text-soft);
}

.row-actions button:hover,
.icon-button:hover {
	color: var(--text-h);
}

.drag-over-row {
	outline: 2px dashed color-mix(in srgb, var(--color-primary) 58%, transparent);
	outline-offset: 6px;
	border-radius: 10px;
	background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

textarea,
button,
input {
	font: inherit;
}

textarea,
input:not([type="checkbox"]):not([type="color"]) {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid var(--input-border);
	border-radius: 12px;
	box-sizing: border-box;
	background: var(--input-surface);
	color: var(--input-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
	transition:
		border-color 0.18s ease,
		box-shadow 0.18s ease,
		background-color 0.18s ease,
		color 0.18s ease;
}

textarea::placeholder,
input::placeholder {
	color: var(--input-placeholder);
}

textarea:focus-visible,
input:not([type="checkbox"]):not([type="color"]):focus-visible,
.color-field:focus-within {
	outline: none;
	border-color: var(--input-focus-border);
	box-shadow:
		0 0 0 3px var(--input-focus-ring),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

input:disabled,
textarea:disabled {
	cursor: not-allowed;
	background: var(--input-disabled-bg);
	color: var(--text-soft);
	opacity: 0.88;
}

input[type="date"]::-webkit-calendar-picker-indicator {
	cursor: pointer;
	filter: opacity(0.72);
}

.required-empty {
	background: var(--validation-error-bg);
	border: 1px solid var(--validation-error-border) !important;
	box-shadow: 0 0 0 2px var(--validation-error-ring);
}

.required-empty::placeholder {
	color: var(--validation-error-text);
	font-style: italic;
}

.field-group:has(.required-empty, .app-select.is-invalid) .field-label {
	color: var(--validation-error-text);
}

.required-empty:focus-visible,
.color-field.required-empty:focus-within {
	border-color: var(--validation-error-border);
	box-shadow:
		0 0 0 3px var(--validation-error-ring),
		inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

button {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 11px 16px;
	border: 1px solid var(--theme-button-border);
	border-radius: 18px;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-bg);
	color: var(--text-soft);
	cursor: pointer;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	transition:
		transform 0.18s ease,
		background 0.18s ease,
		border-color 0.18s ease,
		color 0.18s ease,
		opacity 0.18s ease;
}

button:hover {
	transform: translateY(-1px);
	border-color: var(--theme-button-hover-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--theme-button-hover-bg);
	color: var(--text-h);
}

button.active {
	outline: 2px solid var(--accent-border);
}

button:disabled {
	opacity: 0.7;
	cursor: not-allowed;
}

.primary-button {
	border-color: var(--theme-button-border);
	background: var(--theme-button-bg);
	color: var(--text-soft);
	font-weight: 600;
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.primary-button:hover {
	border-color: var(--theme-button-hover-border);
	background: var(--theme-button-hover-bg);
	color: var(--text-h);
}

.secondary-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.secondary-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
	color: var(--danger-text);
}

.danger-button {
	border-color: var(--danger-border);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-bg);
	color: var(--danger-text);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.danger-button:hover {
	border-color: var(--danger-border-strong);
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%),
		var(--danger-hover);
}

.error-text {
	color: #b91c1c;
}

.modal-backdrop {
	position: fixed;
	inset: 0;
	z-index: 120;
	background: rgba(0, 0, 0, 0.4);
	display: grid;
	place-items: center;
	padding: 20px;
}

.modal {
	position: relative;
	z-index: 121;
	width: min(100%, 520px);
	max-width: 520px;
	display: grid;
	gap: 16px;
	padding: 20px;
	border-radius: 24px;
	border: 1px solid var(--glass-border-strong);
	background: var(--glass-surface-strong);
	box-shadow: var(--shadow);
	backdrop-filter: blur(26px);
}

.modal textarea {
	resize: vertical;
	min-height: 96px;
}

.button-icon-delete {
	display: flex;
	justify-content: center;
	align-items: center;
	margin-left: 3px;
	width: 24px;
	height: 24px;

}
.button-icon svg {
	color: currentColor;
}

.button-icon svg[fill="white"],
.button-icon svg [fill="white"] {
	fill: currentColor;
}

.button-icon svg [stroke="white"] {
	stroke: currentColor;
}

.button-icon-drag svg,
.button-icon-drag svg * {
	color: currentColor;
	fill: currentColor;
	stroke: currentColor;
}

.button-icon-edit {
	display: flex;
	justify-content: center;
	align-items: center;
	/* padding-left: 3px; */
	width: 24px;
	height: 24px;

}

.button-icon-adjust {
	display: flex;
	justify-content: center;
	align-items: center;
	padding-left: 3px;
	width: 24px;
	height: 24px;
}

.button-icon-drag {
	display: flex;
	justify-content: center;
	align-items: center;
	padding-top: 5px;
	width: 24px;
	height: 24px;
}

.button-icon-plus::before,
.button-icon-plus::after {
	width: 12px;
	height: 2px;
	border-radius: 999px;
	background: currentColor;
}

.button-icon-plus::after {
	width: 4px;
	height: 12px;
}

/* MOBILE */
@media (max-width: 480px) {
	.app-page {
		gap: 14px;
		padding: 14px 12px 118px;
	}

	.tittle {
		font-size: clamp(2rem, 10vw, 2.6rem);
		line-height: 1.02;
		margin-bottom: 6px;
	}

	.page-section,
	.transaction-section,
	.simple-list,
	.error-box,
	.filter-card {
		padding: 16px;
	}

	.wallet-summary-card,
	.filter-card,
	.page-section,
	.transaction-section,
	.simple-list,
	.equal-section,
	.error-box,
	.modal {
		border-radius: 20px;
	}

	.equal-section {
		min-height: 320px;
	}

	.management-page-section {
		width: 100%;
	}

	.wallet-summary-section {
		top: 12px;
	}

	.wallet-summary-card {
		padding: 18px 16px;
		gap: 14px;
		align-items: stretch;
	}

	.wallet-summary-list {
		width: 100%;
	}

	.wallet-summary-row {
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 10px;
		width: 100%;
		padding-inline: 24px;
	}

	.wallet-summary-card.is-compact .wallet-summary-row {
		padding-inline: 24px;
	}

	.simple-list-row,
	.entry-list-head,
	.entry-row {
		grid-template-columns: minmax(0, 1fr);
		padding: 12px;
		gap: 5px;
		min-height: auto;
	}

	.entry-list-head {
		display: none;
	}

	.simple-list-row > *,
	.entry-row > * {
		display: grid;
		grid-template-columns: minmax(76px, 92px) minmax(0, 1fr);
		gap: 10px;
		align-items: center;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.wallet-list-row {
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-areas:
			"name amount"
			"actions actions";
		gap: 10px;
		align-items: center;
	}

	.wallet-list-row > :nth-child(1),
	.wallet-list-row > :nth-child(2),
	.wallet-list-row > :nth-child(3) {
		display: block;
		width: auto;
	}

	.wallet-list-row > :nth-child(1) {
		grid-area: name;
		align-self: center;
	}

	.wallet-list-row > :nth-child(2) {
		grid-area: amount;
		justify-self: end;
		text-align: right;
	}

	.wallet-list-row > :nth-child(3) {
		grid-area: actions;
		justify-self: end;
	}

	.simple-list-row.wallet-list-row > *::before {
		content: none;
	}

	.category-row {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas:
			"name"
			"actions";
		gap: 10px;
		align-items: stretch;
	}

	.category-row > :nth-child(1),
	.category-row > :nth-child(2) {
		display: block;
	}

	.category-row > :nth-child(1) {
		grid-area: name;
		width: 100%;
		justify-self: stretch;
	}

	.category-row > :nth-child(2) {
		grid-area: actions;
		width: 100%;
		justify-self: stretch;
	}

	.simple-list-row.category-row > *::before,
	.category-row .row-actions::before {
		content: none;
	}

	.category-row-name {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 38px;
		padding: 10px 14px;
		box-sizing: border-box;
		border-radius: 16px;
		/* border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent); */
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%),
			color-mix(in srgb, var(--color-primary) 26%, var(--input-surface));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 8px 18px rgba(4, 12, 24, 0.16);
		color: var(--text-h);
		font-weight: 600;
		line-height: 1.2;
	}

	.entry-row > * {
		padding: 6px 8px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
	}

	.simple-list-row > *::before,
	.entry-row > *::before {
		content: attr(data-label);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.entry-wallets {
		display: grid;
		gap: 6px;
		justify-items: end;
	}

	.entry-row > .entry-wallets::before {
		justify-self: start;
		text-align: left;
	}

	.entry-wallet-meta {
		width: fit-content;
		justify-self: end;
	}

	.entry-wallet-arrow {
		display: none;
	}

	.entry-row > :not(.row-actions) {
		text-align: right;
	}

	.entry-row > :not(.row-actions)::before {
		text-align: left;
	}

	.entry-row > span:has(input[type="checkbox"]) {
		align-items: center;
	}

	.paid-field {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.18s ease, box-shadow 0.18s ease;
	}

	.paid-field:active {
		background: color-mix(in srgb, var(--color-primary) 12%, rgba(255, 255, 255, 0.04));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent);
	}

	.entry-row > span:has(input[type="checkbox"]) input[type="checkbox"] {
		justify-self: end;
		width: 18px;
		height: 18px;
		min-width: 18px;
		min-height: 18px;
	}

	.entry-row > span:has(input[type="checkbox"]) input[type="checkbox"]::before {
		width: 10px;
		height: 10px;
	}

	.row-actions {
		display: flex;
		min-width: 0;
		justify-self: stretch;
		gap: 8px;
	}

	.wallet-list-row .row-actions {
		width: 100%;
		justify-self: stretch;
		justify-content: space-evenly;
		flex-wrap: nowrap;
		gap: 12px;
	}

	.category-row .row-actions {
		width: 100%;
		justify-self: stretch;
		justify-content: center;
		flex-wrap: nowrap;
		gap: 10px;
		align-items: center;
		padding: 2px 0 0;
		border: 0;
		background: transparent;
		box-shadow: none;
	}

	.wallet-list-row .row-actions button {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		min-width: 42px;
		border-radius: 50%;
		padding: 0;
	}

	.category-row .row-actions button {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		min-width: 42px;
		border-radius: 50%;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.category-row .row-actions .icon-button,
	.category-row .row-actions button:not(.danger-button) {
		border-color: color-mix(in srgb, var(--color-primary) 22%, var(--glass-border-strong));
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0) 100%),
			color-mix(in srgb, var(--color-primary) 14%, var(--input-surface));
		color: var(--text-soft);
	}

	.category-row .row-actions .icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.category-move-touch-button {
		display: none !important;
	}

	.category-move-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.category-move-icon svg {
		display: block;
		width: 22px;
		height: 22px;
		margin: auto;
	}

	.category-move-icon svg path {
		vector-effect: non-scaling-stroke;
	}

	.category-row .row-actions .category-move-touch-button:disabled {
		opacity: 1;
		cursor: not-allowed;
		border-color: color-mix(in srgb, var(--glass-border-strong) 72%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%),
			color-mix(in srgb, var(--input-disabled-bg) 94%, var(--color-bg));
		color: color-mix(in srgb, var(--text-soft) 72%, transparent);
		box-shadow: none;
		filter: saturate(0.25);
	}

	.category-row .row-actions .category-move-touch-button:disabled .category-move-icon svg {
		opacity: 0.42;
	}

	.category-row .button-icon-drag {
		padding-top: 0;
	}

	.category-row .button-icon-drag > span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.category-row .button-icon-drag svg {
		display: block;
		margin: auto;
	}

	.category-row .row-actions .button-icon-edit,
	.category-row .row-actions .button-icon-delete,
	.category-row .row-actions .button-icon-drag {
		margin: 0;
	}

	.category-row .row-actions .button-icon-delete {
		margin-left: 0;
	}

	.category-row .row-actions .danger-button {
		border-color: color-mix(in srgb, var(--danger-border) 84%, transparent);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0) 100%),
			color-mix(in srgb, var(--danger-bg) 72%, transparent);
		color: var(--danger-text);
	}

	.description-field {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.18s ease, box-shadow 0.18s ease;
	}

	.description-field:active {
		background: color-mix(in srgb, var(--color-primary) 12%, rgba(255, 255, 255, 0.04));
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent);
	}

	.entry-row .row-actions {
		display: none;
	}

	.mobile-entry-action-backdrop {
		position: fixed;
		inset: 0;
		z-index: 125;
		background: rgba(3, 8, 20, 0.16);
		display: grid;
		place-items: center;
		padding: 20px;
		-webkit-tap-highlight-color: transparent;
	}

	.entry-modal-backdrop {
		padding: 20px;
	}

	.entry-modal {
		width: min(88%, 520px);
	}

	.narrow-mobile-modal {
		width: min(88%, 520px);
	}

	.mobile-entry-action-modal {
		width: min(88%, 220px);
		display: grid;
		gap: 10px;
		padding: 14px;
		border-radius: 22px;
		border: 1px solid var(--glass-border-strong);
		background: var(--glass-surface-strong);
		box-shadow: var(--shadow);
		backdrop-filter: blur(24px);
	}

	.mobile-entry-action-modal button {
		width: 100%;
		min-height: 44px;
	}

	.row-actions::before {
		content: attr(data-label);
		width: 100%;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.wallet-list-row .row-actions::before {
		content: none;
	}

	.row-actions,
	.toolbar {
		width: 100%;
	}

	.row-actions button,
	.toolbar button {
		flex: 1 1 auto;
	}

	.simple-list-row.wallet-list-row .row-actions {
		display: flex;
		width: 100%;
		min-width: 0;
		justify-self: stretch;
		justify-content: center;
		gap: 10px;
	}

	.simple-list-row.wallet-list-row .row-actions button {
		flex: 0 0 42px;
		width: 42px;
		height: 42px;
		min-width: 42px;
	}

	.simple-list-row.category-row .category-row-actions {
		display: flex;
		width: 100%;
		min-width: 0;
		justify-self: stretch;
		justify-content: center !important;
		align-items: center;
		gap: 10px;
		text-align: center;
	}

	.simple-list-row.category-row .category-row-actions button {
		flex: 0 0 42px !important;
		width: 42px !important;
		height: 42px !important;
		min-width: 42px !important;
		max-width: 42px;
		margin: 0 !important;
	}

	.simple-list-row.category-row .category-move-touch-button {
		display: inline-flex !important;
	}

	.simple-list-row.category-row .desktop-category-drag {
		display: none !important;
	}

	/* FILTER MOBILE */
	.filter-row {
		align-items: center;
		flex-wrap: nowrap;
		gap: 6px;
	}

	.filter-spacer {
		display: none;
	}

	.filter-selects {
		display: flex;
		flex-wrap: nowrap;
		gap: 6px;
		flex: 1 1 auto;
		min-width: 0;
	}

	/* ANO menor */
	.filter-selects > .year-filter {
		flex: 0 0 72px;
		width: 72px;
		min-width: 72px;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	/* MÊS ocupa tudo */
	.filter-selects > .month-filter {
		flex: 1;
		min-width: 0;
		height: 32px;
		font-size: 12px;
		--app-select-min-height: 32px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 32px);
		padding: 4px 32px 4px 8px;
		font-size: inherit;
	}

	.filter-selects :deep(.app-select__chevron) {
		width: 14px;
		height: 14px;
	}

	/* BOTÕES redondos */
	.filter-actions {
		display: flex;
		gap: 6px;
		flex: 0 0 auto;
		margin-left: auto;
	}

	.filter-row button {
		width: 32px !important;
		height: 32px !important;
		min-width: 32px !important;
		flex: 0 0 32px !important;

		padding: 0;
		border-radius: 50%;
		font-size: 13px;
	}
}

/* DESKTOP */
@media (min-width: 1024px) {
	.row-actions,
	.toolbar {
		width: auto;
	}

	.row-actions button,
	.toolbar button {
		flex: 0 0 auto;
	}

	.wallet-summary-hero,
	.wallet-summary-list {
		width: min(50%, 450px);
	}

	.wallet-summary-list {
		max-width: none;
	}

	.wallet-summary-row {
		padding: 12px 0 13px;
	}

	.filter-card {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;

		padding: 16px;

		border-radius: 20px;
		border: 1px solid var(--glass-border);
		background: var(--glass-surface);
		backdrop-filter: blur(11px);
	}

	.category-row {
		grid-template-columns: 1fr auto;
	}

	.desktop-category-drag {
		display: inline-flex !important;
	}

	.category-move-touch-button {
		display: none !important;
	}

	.entry-list-head,
	.entry-row {
		grid-template-columns: minmax(180px, 2.2fr) minmax(150px, 1.35fr) minmax(110px, 1fr) minmax(100px, 1fr) 80px minmax(140px, 1.4fr);
		grid-template-areas: none;
	}

	.entry-list-head > *,
	.entry-row > * {
		grid-area: auto;
		justify-self: center;
		text-align: center;
	}

	.entry-list-head > :first-child,
	.entry-row > :first-child {
		justify-self: start;
		text-align: left;
	}

	.entry-list-head > :nth-child(2),
	.entry-row > :nth-child(2),
	.entry-list-head > :nth-child(3),
	.entry-row > :nth-child(3),
	.entry-list-head > :nth-child(4),
	.entry-row > :nth-child(4),
	.entry-list-head > :nth-child(5),
	.entry-row > :nth-child(5),
	.entry-list-head > :nth-child(6),
	.entry-row > :nth-child(6) {
		justify-self: center;
		text-align: center;
	}

	.simple-list-row {
		grid-template-columns: minmax(180px, 2fr) minmax(120px, 1fr) minmax(180px, 1.6fr);
		grid-template-areas: none;
	}

	.simple-list-row > * {
		grid-area: auto;
	}

	.category-row>*:first-child {
		justify-self: start;
		text-align: left;
	}

	/* ROW */
	.filter-row {
		display: flex;
		align-items: center;
		width: 100%;

		gap: 8px;
	}

	/* SELECTS */
	.filter-selects {
		display: flex;
		align-items: center;

		flex: 1;
		min-width: 0;
		gap: 8px;
	}

	.filter-selects > .year-filter {
		width: 280px !important;
		flex: 0 0 280px !important;
		min-width: 280px !important;
		height: 48px;
		--app-select-min-height: 48px;
	}

	/* MÊS */
	.filter-selects > .month-filter {
		flex: 1;
		min-width: 320px;
		height: 48px;
		--app-select-min-height: 48px;
	}

	.filter-selects :deep(.app-select__trigger) {
		height: 100%;
		min-height: var(--app-select-min-height, 48px);
	}

	/* BOTÕES */
	.filter-row button {
		width: 48px;
		height: 48px;
		flex: 0 0 48px;

		padding: 0;
		border-radius: 50%;
		aspect-ratio: 1 / 1;
	}

	.centerTittle {
		text-align: center;
	}

	.row-actions button {
		width: 48px;
		height: 48px;
		min-width: 48px;

		border-radius: 50%;

		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.row-actions .danger-button {
		background: var(--danger-bg);
		border-color: var(--danger-border);
		color: var(--danger-text);
	}

	.row-actions {
		display: inline-flex;
		width: auto;
		min-width: max-content;
		justify-content: flex-end;
		justify-self: end;
	}

}
</style>
