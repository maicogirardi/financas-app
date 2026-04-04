# UI Navigation & FAB Pattern

## Navigation Structure

The app uses bottom tabs fixed at the bottom of the screen.

Tabs:

* Resumo
* Carteiras
* Categorias
* Configurações

The bottom tabs must always be visible.
The current tab must have stronger visual emphasis than the others.
Each tab should also include a small icon paired with the label.

Resumo-specific top controls:

* year filter visible only in Resumo
* month filter visible only in Resumo
* month select must display month names like Janeiro, Fevereiro, Março
* year and month filters must stay on a single row inside a card section
* year filter can be narrower and does not need to stretch across the row
* dropdowns should stay aligned to the left and action buttons aligned to the right
* an empty flexible spacer should occupy the middle of the row so the card fills 100% width
* `+` button must appear on the same row after the month filter
* month removal action must use a red `-` button on the same row
* the first summary card below the filters must highlight the total balance of all wallets in large centered text
* the same summary card must list each wallet below the total using smaller text
* the wallet summary card may stay sticky while scrolling the dashboard list
* the sticky wallet summary card may switch to a compact state after reaching the top offset
* the compact summary must keep the same content width as the regular state and allow the next section to move up with it
* on mobile, wallet rows inside the regular and compact summary card should keep the same horizontal padding so the content width stays consistent while scrolling

Desktop width behavior:

* Resumo should keep the broader desktop layout used by the dashboard
* Carteiras, Categorias, and Configuracoes should stay centered and use a narrower management column
* management pages should avoid list overflow inside the section card, even with action buttons

Mobile-first layout.

Visual direction:

* cards should follow a frosted glass / glassmorphism style
* action buttons should use the same premium gradient style across the app
* the active bottom tab should have the strongest visual emphasis
* form dropdowns should inherit the active light/dark theme instead of browser default colors
* shared dropdown behavior should come from the reusable Vue select component
* dropdown selected state must use the current theme color chosen by the user
* inputs, cards, and list rows should share the same themed border language
* modal primary actions should follow the same softer contrast language used by the bottom tab buttons
* cancel and destructive actions should stay in red tones
* required fields inside modals should show a strong red validation state again
* layout changes should continue mobile first, with desktop refinements handled separately
* mobile-only adjustments must stay isolated in mobile media queries unless a broader change is explicitly requested
* on mobile, small contextual action modals may use a compact frosted glass layout and close on outside tap

## Floating Action Button (FAB)

Component:

* `FloatingActionButton.vue`

Behavior:

* fixed bottom-right
* circular
* centered `+` icon
* emits `click`
* opens the new entry modal
* appears only in Resumo

Style:

* 56px size
* border-radius 50%
* shadow
* primary color
* responsive
* dark/light mode through CSS variables

Position:

* `bottom: 72px`
* `right: 16px`
* `fixed`

Structure:

* `ResumoView`
* `FloatingActionButton`

## Settings Navigation

The Configurações screen must be available through BottomTabs navigation.

Configurações contains:

* screen title `Configurações`
* dark mode switch
* login/logout controls
* "Logado como" status
