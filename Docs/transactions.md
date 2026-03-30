Transaction model (Firestore):

id: string
type:
- income
- expense
- transfer
- adjustment
periodId?: string
amount: number

walletFrom?: string
walletTo?: string

category?: string
categoryId?: string
tag?: string
description?: string

date: timestamp
paid: boolean

createdAt: timestamp

Transaction list rules:

- all transactions must appear in a single transaction list
- transaction list must be grouped by category sections
- each category creates a visible section title
- adjustment transactions must be saved in "Ajuste de Saldo" section
- transfer transactions must appear in "Transferências" section
- transaction rows must stay ordered by creation order, with older entries first and newer entries appended below
- each transaction row must support edit and delete actions
- transaction list must support year and month filtering
- each transaction row must include paid checkbox
- paid rows should be highlighted in green
- only paid transactions must affect balances and totals
- wallet balance adjustments must use hidden category "Ajuste de Saldo"
- each transaction must belong to a monthly period
- "Transferências" and "Ajuste de Saldo" sections should only be rendered when there is at least one transaction in the selected period
- dates in transaction rows must display as DD/MM/AAAA
- values in transaction rows must display as Brazilian Real with 2 decimal places

Manual entry modal:

- description
- type
- category
- wallet
- value
- destination wallet when type is transfer
- date

Manual entry UX:

- description is required
- new manual expense entries should default category selection to "Despesas Fixas"
- when manual entry type is "Entrada", category must default to "Entradas" and stay locked
- date input must keep the native calendar picker
- new entry date must default to the current day, clamped to the selected month when needed
- money inputs must start as `R$ 0,00`
- if a money input is zero and the user starts typing, the numeric zero should clear and only the `R$ ` prefix should remain before the typed value
- money inputs must keep the `R$ ` prefix while typing
- money inputs must accept only numbers and comma
- form modals must show a small title label above each field
- Enter should confirm modal actions
- Esc should cancel modal actions

Edit transaction rules:

- transactions must be editable from the main transaction list
- transactions must be removable from the main transaction list
- editing transaction type must update source/destination wallet fields correctly
- new manual entries should start with paid = false
- toggling paid must update transaction online in Firebase
- manual entry date must stay inside the selected monthly period
- transfer transactions must be created as paid = true so wallet balances update immediately

Adjustment transaction rules:

- adjustment uses type: adjustment
- amount is absolute difference between current balance and new balance
- if new balance is higher, use walletTo
- if new balance is lower, use walletFrom
- description is required and should explain reason for manual correction
- date should be current date/time when adjustment is created
- adjustment entries should also start with paid = false
- adjustment category must be hidden from category management UI
