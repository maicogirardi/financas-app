# Financas App

Aplicativo de controle financeiro em Vue 3 + Vite com Firebase Authentication e Firestore em tempo real.

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore realtime listeners

## Regras atuais do projeto

* Firestore e a fonte principal de dados
* colecoes principais: `wallets`, `transactions`, `categories`, `periods`
* saldos sao derivados das transacoes pagas
* ajustes de saldo geram transacoes da categoria oculta `Ajuste de Saldo`
* tema light/dark e cor primaria ficam em preferencias do usuario no Firebase
* o ultimo mes/ano visualizado no resumo tambem fica salvo nas preferencias do usuario no Firebase
* a ordenacao da lista de transacoes e independente por secao de categoria

## Direcao de UI

* layout mobile first, com ajustes de desktop por `@media (min-width: ...)`
* visual com cards e modais em estilo frosted glass
* botoes e icones devem respeitar a cor do tema e manter contraste suave
* campos obrigatorios em modais devem ter estado visual de erro
* selects, inputs e listas devem compartilhar a mesma linguagem de borda tematica
* dropdowns usam um componente Vue customizado para garantir consistencia entre temas
* o card de resumo do dashboard pode ficar sticky e entrar em modo compacto ao encostar no topo

## Documentacao

* [AGENTS.md](./AGENTS.md)
* [Docs/architecture.md](./Docs/architecture.md)
* [Docs/theme.md](./Docs/theme.md)
* [Docs/ui-navigation.md](./Docs/ui-navigation.md)
* [Docs/transactions.md](./Docs/transactions.md)
