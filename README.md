# Financas App

Aplicativo de controle financeiro em Vue 3 + Vite com Firebase Authentication e Firestore em tempo real.

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore realtime listeners

## Regras atuais do projeto

* Firestore é a fonte principal de dados
* coleções principais: `wallets`, `transactions`, `categories`, `periods`
* saldos são derivados das transações pagas
* ajustes de saldo geram transações da categoria oculta `Ajuste de Saldo`
* tema light/dark e cor primária ficam em preferências do usuário no Firebase

## Direção de UI

* layout mobile first, com ajustes de desktop por `@media (min-width: ...)`
* visual com cards e modais em estilo frosted glass
* botões e ícones devem respeitar a cor do tema e manter contraste suave
* campos obrigatórios em modais devem ter estado visual de erro
* selects, inputs e listas devem compartilhar a mesma linguagem de borda temática
* dropdowns usam um componente Vue customizado para garantir consistência entre temas

## Documentação

* [AGENTS.md](./AGENTS.md)
* [Docs/architecture.md](./Docs/architecture.md)
* [Docs/theme.md](./Docs/theme.md)
* [Docs/ui-navigation.md](./Docs/ui-navigation.md)
* [Docs/transactions.md](./Docs/transactions.md)
