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

Resumo-specific top controls:

* year filter visible only in Resumo
* month filter visible only in Resumo

Mobile-first layout.

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
