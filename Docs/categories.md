# Categories

Category represents a transaction section/group.

Default categories:

- Entradas
- Despesas Fixas
- Despesas Diversas
- Cartões de Crédito

Hidden system categories:

- Transferências
- Ajuste de Saldo

Category model (Firestore):

id: string
name: string
order?: number
hidden?: boolean
createdAt: timestamp

Rules:

- Categories must be stored online in Firebase
- Categories must appear as transaction sections
- New categories must become available in the manual entry modal
- Default categories should exist for first use
- Categories must have a dedicated page/list
- Categories must support create, edit, and delete
- Categories must support reordering
- Category reordering should be managed from the categories page
- Categories page should support drag and drop reordering
- Hidden system categories may exist for internal flows
- Hidden categories must not appear in category management page
- Hidden categories must not appear in manual category dropdowns
- Transferências and Ajuste de Saldo should only appear in the transaction list when the selected period has at least one matching transaction
