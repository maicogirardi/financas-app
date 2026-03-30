# Theme System

The app supports Light and Dark mode.

Theme is controlled globally with:

* `data-theme="light"`
* `data-theme="dark"`

Applied on:

* `document.documentElement`

Use:

* `document.documentElement.setAttribute("data-theme", theme)`

## CSS Variables

Base variables:

* `--color-primary`
* `--color-bg`
* `--color-text`

Theme support files:

* `src/styles/variables.css`
* `src/styles/theme.css`

## Theme Toggle

Located in:

* `ConfiguracoesView.vue`

Behavior:

* toggle between light and dark
* save in Firebase
* restore from Firebase on mount/auth restore
* login/logout controls are also hosted in `ConfiguracoesView.vue`
* theme must apply across the whole app, not only bottom navigation

Firebase location:

* `users/{uid}/preferences/ui`

Field:

* `theme`

Values:

* `light`
* `dark`
