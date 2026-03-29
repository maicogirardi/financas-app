# Wallets

Wallet represents bank account or money container.

Examples:

- Bank
- Cash
- Credit Card
- Savings
- Investment
- Mother's expenses

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

Current wallet actions:

- create wallet with name and initial balance
- adjust balance via modal
- delete wallet via confirmation modal

Rules:

- Wallet balance changes only via transactions
- Transfers move between wallets
- Wallet cannot directly change balance
- Balance adjustment must create adjustment transaction
- Balance adjustment modal must ask new balance and description
- Wallet delete must ask confirmation before removal

Balance must be computed from transactions
Never store computed balance in Firestore
