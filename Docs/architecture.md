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
users/{uid}/preferences/ui

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
- category ordering is stored online and can be changed from the categories page
- manual entry modal creates online transactions
- transfers between wallets are stored online and marked paid immediately
- stores are synced online and ready for future features
- app has separate pages/tabs for dashboard, wallets, categories, and settings
- settings page owns theme mode, theme color, auth controls, and user status
- year/month filter controls visible data in dashboard
- periods collection defines available monthly pages
- periods can be created from a modal with custom year/month
- creating a period carries opening balances forward and clones eligible transactions as unpaid
- deleting a period also removes its period transactions
- UI styling is centralized in theme tokens plus App-level form styles for modals and filters
- dropdown UI now uses a shared `AppSelect.vue` component for consistent theming and mobile behavior
- modal backdrops must stay above cards, sections, and dropdown menus via z-index layering
- all major modals now support outside click close, while blocking accidental close during submit
- dashboard summary uses a dedicated sticky section outside `ResumoView`, with compact-on-scroll behavior handled in `App.vue`
