# Periods

Period represents one monthly page/tab.

Period model (Firestore):

id: string
year: number
month: number
openingBalances: map<walletId, number>
createdAt: timestamp

Rules:

- One period exists for each available month page
- Filters must use existing periods only
- Plus button opens a modal to choose year and month
- New period must copy opening balance from the currently selected period current balances
- New period must clone the currently selected period transactions with same values
- Cloned transactions must start with paid = false
- Adjustment transactions must not be cloned to the next month
- Manual entry date must stay inside the selected period month
- If there is no previous period, opening balances must start from wallet initial balances
- Current period can be removed with confirmation modal
- Removing a period must also remove all transactions linked to that period
