## Persistence

Use Firebase Firestore as primary database

Data must be stored in:

wallets collection
transactions collection

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

If a wallet is deleted, related in-memory transactions must also be removed

Current implementation may use local store state until Firestore listeners are connected
