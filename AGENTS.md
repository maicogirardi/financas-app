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
- support edit and delete from the list
- support year and month filtering
- each row must have paid checkbox
- paid defaults to false on new entries
- only paid rows affect balances
- wallet balance adjustments must use hidden category "Ajuste de Saldo"
- dates in the list must display as DD/MM/AAAA
- money display must use Brazilian Real format with 2 decimals

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
- next period must carry opening balances from previous period ending balances
- next period must clone previous month transactions as unpaid
- adjustment transactions must not be cloned to next period
- removing a period must require confirmation modal
- removing a period must also remove that period transactions

Page structure:

- dashboard page with wallet balances and total entry list
- wallets page for wallet management
- categories page for category management
