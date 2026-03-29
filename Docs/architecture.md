# Database

Firebase Firestore

Collections:

wallets
transactions

Structure:

wallets/{walletId}
transactions/{transactionId}

Data flow:

UI -> Store -> Firebase -> Store -> UI

Realtime listeners must update state

Current implementation status:

- wallet UI is already using local Vue stores
- wallet balance is computed from transactions in store
- balance adjustment creates adjustment transaction in transaction store
- wallet deletion asks for confirmation in modal
- deleting a wallet also removes related in-memory transactions
- Firebase persistence and realtime listeners are still pending integration
