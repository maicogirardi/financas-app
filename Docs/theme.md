# Theme System

The app supports Light and Dark mode.

Theme is controlled globally with:

* `data-theme="light"`
* `data-theme="dark"`
* `meta[name="theme-color"]` synchronized with the active theme for mobile browser/PWA top bar

Applied on:

* `document.documentElement`

Use:

* `document.documentElement.setAttribute("data-theme", theme)`
* update `meta[name="theme-color"]` when the active theme changes

## CSS Variables

Base variables:

* `--color-primary`
* `--color-bg`
* `--color-text`

Extended UI variables:

* `--color-primary-soft`
* `--glass-surface`
* `--glass-surface-strong`
* `--glass-border`
* `--glass-border-strong`
* `--glass-divider`
* `--input-surface`
* `--button-shadow`
* `--button-shadow-hover`
* `--text-soft`
* `--input-border`
* `--input-border-strong`
* `--input-text`
* `--input-placeholder`
* `--input-focus-border`
* `--input-focus-ring`
* `--input-disabled-bg`
* `--select-option-bg`
* `--select-option-text`
* `--select-option-selected-bg`
* `--select-option-selected-text`
* `--validation-error-bg`
* `--validation-error-border`
* `--validation-error-text`
* `--validation-error-ring`

Theme support files:

* `src/styles/variables.css`
* `src/styles/theme.css`

## Form States

The active theme must also style form controls.

Required modal fields:

* empty required fields must return to a visible red error state
* the field label should reflect the same error tone
* focus state should remain visible even inside glass surfaces

Dropdowns:

* dropdowns should inherit the current theme colors
* option list should use themed background and text colors
* selected option should have a stronger highlighted state
* use the shared Vue dropdown component instead of relying on browser-native select styling
* the selected/active state should follow the user-chosen primary theme color, not a fixed purple

Layout direction:

* base CSS should stay mobile first
* desktop refinements should happen with `@media (min-width: ...)`

## Theme Toggle

Located in:

* `ConfiguracoesView.vue`

Behavior:

* toggle between light and dark
* save in Firebase
* restore from Firebase on mount/auth restore
* login/logout controls are also hosted in `ConfiguracoesView.vue`
* theme color picker is also hosted in `ConfiguracoesView.vue`
* theme must apply across the whole app, not only bottom navigation
* glass cards, inputs, buttons, and bottom navigation must all respond to the active theme
* the selected dashboard period should also be restored from the same user preferences document

Firebase location:

* `users/{uid}/preferences/ui`

Fields:

* `theme`
* `primaryColor`
* `selectedYear`
* `selectedMonth`

Values:

* `light`
* `dark`
