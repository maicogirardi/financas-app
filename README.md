# Financas App

Aplicativo de controle financeiro em Vue 3 + Vite com Firebase Authentication e Firestore em tempo real.

## Stack

* Vue 3
* Vite
* Firebase Auth
* Firestore realtime listeners
* PWA installable no Android

## Regras atuais do projeto

* Firestore e a fonte principal de dados
* colecoes principais: `wallets`, `transactions`, `categories`, `periods`
* saldos sao derivados das transacoes pagas
* ajustes de saldo geram transacoes da categoria oculta `Ajuste de Saldo`
* tema light/dark e cor primaria ficam em preferencias do usuario no Firebase
* o ultimo mes/ano visualizado no resumo tambem fica salvo nas preferencias do usuario no Firebase
* a ordenacao da lista de transacoes e independente por secao de categoria
* filtros de mes/ano usam periodos salvos na colecao `periods`
* criar um novo periodo carrega os saldos atuais como abertura e clona transacoes elegiveis como nao pagas
* todas as modais principais aceitam `Enter`, `Esc` e clique fora para fechar quando nao ha envio em andamento

## Direcao de UI

* layout mobile first, com ajustes de desktop por `@media (min-width: ...)`
* visual com cards e modais em estilo frosted glass
* botoes e icones devem respeitar a cor do tema e manter contraste suave
* campos obrigatorios em modais devem ter estado visual de erro
* selects, inputs e listas devem compartilhar a mesma linguagem de borda tematica
* dropdowns usam um componente Vue customizado para garantir consistencia entre temas
* o card de resumo do dashboard pode ficar sticky e entrar em modo compacto ao encostar no topo
* BottomTabs inclui `Resumo`, `Carteiras`, `Categorias` e `Configuracoes`
* o FAB de `Resumo` abre a modal de nova entrada

## PWA

* o app pode ser instalado no Android como PWA
* o `manifest.webmanifest` e o `service worker` ficam em `public/`
* o manifest usa caminhos relativos para funcionar tanto no GitHub Pages quanto no Firebase Hosting
* o login Google no PWA instalado pode falhar no GitHub Pages por limitacoes do Firebase Auth fora do Firebase Hosting
* quando uma nova versao do app fica disponivel, a interface mostra um aviso com botao para recarregar
* o registro do service worker forca uma verificacao imediata de update no startup para reduzir casos em que o aviso so aparecia depois de atualizar manualmente o app
* a sincronizacao de dados continua via Firebase em tempo real entre desktop e app instalado quando ambos estao online

Assets esperados em `public/`:

* `favicon.svg`
* `favicon-16x16.png`
* `favicon-32x32.png`
* `apple-touch-icon.png`
* `icon-192x192.png`
* `icon-512x512.png`
* `icon-maskable-512x512.png`

## Deploy

Fluxo atual de deploy duplo:

* `npm run build` gera a versao do GitHub Pages com base `/financas-app/`
* `npm run deploy` publica no GitHub Pages
* `npm run build:firebase` gera a versao para Firebase Hosting usando o modo `firebase` do Vite com base `/`
* `npm run deploy:firebase` executa o build do Firebase e depois chama `firebase-tools deploy --only hosting`
* `firebase deploy --only firestore:rules` publica apenas as regras de seguranca do Firestore

Observacao:

* o Firebase Hosting agora e o ambiente principal para testes reais de auth e PWA
* o site principal publicado e `https://minhas-financas-maico.web.app`
* o GitHub Pages continua como ambiente secundario durante o desenvolvimento
* nao publique o build padrao do GitHub Pages no Firebase, porque a base `/financas-app/` quebra o carregamento dos assets no dominio raiz e pode deixar a tela em branco

Arquivos de configuracao:

* `firebase.json`
* `firestore.rules`
* `.firebaserc`
* `vite.config.js`
* `scripts/build-firebase.ps1`
* `scripts/deploy-firebase.ps1`

## Documentacao

* [AGENTS.md](./AGENTS.md)
* [Docs/architecture.md](./Docs/architecture.md)
* [Docs/theme.md](./Docs/theme.md)
* [Docs/ui-navigation.md](./Docs/ui-navigation.md)
* [Docs/transactions.md](./Docs/transactions.md)
* [Docs/publishing.md](./Docs/publishing.md)
