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

* `powershell -ExecutionPolicy Bypass -File scripts/build-firebase.ps1`
* `powershell -ExecutionPolicy Bypass -File scripts/deploy-firebase.ps1`

## Notes

* Firebase Hosting should be treated as the primary environment for Google Auth and installed Android PWA tests.
* GitHub Pages can still be used as a secondary deployment target during development.
