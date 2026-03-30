# Wallets

Wallet represents bank account or money container.

Examples:

- Bank
- Cash
- Credit Card
- Savings
- Investment

Wallet model (Firestore):

id: string
name: string
initialBalance: number
createdAt: timestamp
order?: number
archived?: boolean

UI:

- Show only current balance in wallet card
- Initial balance is setup data, not a second displayed balance
- Wallet card must include adjust balance action
- Wallet card must include delete action
- Wallets must have a dedicated page/list
- Dashboard must show wallet balances only

Current wallet actions:

- create wallet with name and initial balance
- adjust balance via modal
- delete wallet via confirmation modal
- wallet can be selected in manual transaction modal
- wallet money inputs must use Brazilian Real prefix while typing
- wallet balances must display as Brazilian Real with 2 decimal places
- wallet creation must happen in a dedicated modal
- wallet creation modal must use the same required-field validation behavior as category creation
- wallet creation modal must support Enter to confirm and Esc to cancel

Rules:

- Wallet balance changes only via transactions
- Transfers move between wallets
- Wallet cannot directly change balance
- Balance adjustment must create adjustment transaction
- Balance adjustment modal must ask new balance and description
- Wallet delete must ask confirmation before removal
- Wallet balance must consider only paid transactions
- Wallet balance adjustment must use hidden category "Ajuste de Saldo"
- Wallet balance per page must use the opening balance of the selected period

Balance must be computed from transactions
Never store computed balance in Firestore
