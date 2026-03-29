# Database

Firebase Firestore

Collections:

wallets
transactions
categories
periods

Structure:

wallets/{walletId}
transactions/{transactionId}
categories/{categoryId}
periods/{periodId}

Data flow:

UI -> Store -> Firebase -> Store -> UI

Realtime listeners must update state

Current implementation status:

- wallet UI is using Vue stores connected to Firebase
- wallet balance is computed from transactions in store
- balance adjustment creates adjustment transaction in transaction store
- wallet deletion asks for confirmation in modal
- deleting a wallet also removes related Firebase transactions
- categories are synced from Firebase in realtime
- manual entry modal creates online transactions
- stores are now synced online and ready for future features
- app has separate pages/tabs for dashboard, wallets, and categories
- year/month filter controls visible data in dashboard
- periods collection defines available monthly pages
- periods can be created from a modal with custom year/month
- deleting a period also removes its period transactions
