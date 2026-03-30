## Persistence

Use Firebase Firestore as primary database

Data must be stored in:

wallets collection
transactions collection
categories collection
periods collection

All data must be realtime

Use Firestore listeners

Do not use localStorage as primary storage

Local cache allowed only for performance

## Current App Rules

Wallet balance must be shown as a single current balance in UI

Do not allow direct wallet balance field editing

When user changes a wallet balance, create an adjustment transaction

Adjustment flow must ask for:

- new balance
- description

Wallet delete must require confirmation modal before removal

If a wallet is deleted, related online transactions must also be removed

Current implementation may use local store state until Firestore listeners are connected

Wallet creation must use a dedicated modal with the same validation and keyboard shortcut behavior used by the category modal

Wallets may store a color used in the dashboard balance summary and the wallet edit/create modal must allow choosing that color

## Transactions And Categories

All new transaction features must be implemented with Firebase first

Transaction list must be grouped by category sections

Categories must be online and selectable in transaction creation

Default categories:

- Entradas
- Despesas Fixas
- Despesas Diversas
- Cartões de Crédito

Hidden system categories:

- Transferências
- Ajuste de Saldo

Manual transaction entry must support:

- description
- type
- category
- wallet
- value
- destination wallet for transfer
- native date picker

Description fields must be required in transaction and balance adjustment modals

Transaction list requirements:

- render transactions in list rows, not cards
- split transaction list by category section headers
- transaction rows must stay ordered by creation order, with older entries first and newer entries appended below
- support edit and delete from the list
- support year and month filtering
- each row must have paid checkbox
- paid defaults to false on new entries
- only paid rows affect balances
- wallet balance adjustments must use hidden category "Ajuste de Saldo"
- dates in the list must display as DD/MM/AAAA
- money display must use Brazilian Real format with 2 decimals
- new manual expense entries should default category selection to "Despesas Fixas"
- when manual entry type is "Entrada", category must default to "Entradas" and stay locked
- form modals must show a small title label above each field

Money input requirements:

- inputs must start as `R$ 0,00`
- inputs must keep the `R$ ` prefix while typing
- if the current value is zero and the user starts typing, the numeric zero should clear and only the prefix should remain before the typed value
- money inputs must accept only numbers and comma

System category visibility:

- Transferências and Ajuste de Saldo must stay hidden from category management
- Transferências and Ajuste de Saldo must appear in transaction sections only when there is at least one transaction of that type in the selected period

Modal keyboard shortcuts:

- Enter confirms the active modal action
- Esc cancels the active modal

Monthly period requirements:

- month/year filter must use explicit saved periods
- plus button must open a modal to create a period with chosen year/month
- next period must carry opening balances from the currently selected month current balances
- next period must clone the currently selected month transactions as unpaid
- adjustment transactions must not be cloned to next period
- removing a period must require confirmation modal
- removing a period must also remove that period transactions

Page structure:

- dashboard page with wallet balances and total entry list
- the first dashboard summary card should show the total of all wallet balances in large centered text and list each wallet balance below in smaller text
- each wallet line in the dashboard summary should use the wallet's chosen color in its indicator dot
- wallets page for wallet management
- categories page for category management
- settings page with light/dark mode toggle

UI structure:

- FloatingActionButton.vue must exist as a reusable UI component
- ResumoView.vue must host the FAB
- BottomTabs navigation must include Configurações
- login/logout controls and "Logado como" status must live inside Configurações
- month/year filters must appear only on Resumo
- month/year filters on Resumo must appear in a dedicated card section on a single row
- the Resumo filter row must use month names, keep the year select narrower, place dropdowns on the left, action buttons on the right, use a flexible empty spacer in the middle, place `+` after the month select, and use a red `-` for remove month
- the FAB `+` on Resumo must open the new entry modal and replace any redundant "Nova entrada" button
- theme variables must include `--color-primary`, `--color-text`, and `--color-bg`
- theme must be saved in Firebase user preferences
- theme restore must apply `data-theme` on `document.documentElement`
- light/dark mode must affect the whole app UI, not only isolated components
- the active bottom tab must have stronger visual emphasis than inactive tabs
- bottom tabs should include icons
- cards and modals should follow a frosted glass visual style
- primary action buttons should use the same polished gradient style across the app
