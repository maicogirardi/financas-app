# Publishing

## Meaning of "publish"

When the user asks to publish, the expected workflow is:

* review the pending relevant changes
* update documentation files when deploy behavior, links, or environment guidance changed
* create a commit
* push to the main remote branch
* deploy to GitHub Pages
* deploy to Firebase Hosting

## Current Targets

Primary app URL for real use and PWA/auth validation:

* `https://minhas-financas-maico.web.app`

Secondary publish target:

* GitHub Pages under the repository site

## Commands

GitHub Pages:

* `npm run build`
* `npx gh-pages -d dist -r https://github.com/maicogirardi/financas-app.git`

Firebase Hosting:

* `npm run build:firebase`
* `npm run deploy:firebase`
* alternativa em PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/build-firebase.ps1`
* alternativa em PowerShell: `powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1`

## Notes

* Firebase Hosting should be treated as the primary environment for Google Auth and installed Android PWA tests.
* GitHub Pages can still be used as a secondary deployment target during development.
* `vite.config.js` switches the build base by mode: default keeps `/financas-app/` for GitHub Pages and `--mode firebase` uses `/` for Firebase Hosting.
* If Firebase Hosting receives the default GitHub Pages build, the generated asset URLs still point to `/financas-app/` and the app can render a blank page on `https://minhas-financas-maico.web.app`.
* The production service worker registration now calls `registration.update()` during startup so the update banner can appear without requiring a manual refresh first.
