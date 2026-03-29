Transaction model (Firestore):

id: string
type:
- income
- expense
- transfer
- adjustment
amount: number

walletFrom?: string
walletTo?: string

category?: string
tag?: string
description?: string

date: timestamp
paid: boolean

createdAt: timestamp

Adjustment transaction rules:

- adjustment uses type: adjustment
- amount is absolute difference between current balance and new balance
- if new balance is higher, use walletTo
- if new balance is lower, use walletFrom
- description should explain reason for manual correction
- date should be current date/time when adjustment is created
- paid should be true for manual balance adjustment
