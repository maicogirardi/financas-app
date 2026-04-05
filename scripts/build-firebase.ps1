$ErrorActionPreference = "Stop"

$configPath = Join-Path $PSScriptRoot "..\\vite.config.js"
$originalConfig = Get-Content -LiteralPath $configPath -Raw

try {
	$firebaseConfig = $originalConfig -replace "base:\s*'/financas-app/'", "base: '/'"
	Set-Content -LiteralPath $configPath -Value $firebaseConfig -Encoding utf8
	& npm.cmd run build
}
finally {
	Set-Content -LiteralPath $configPath -Value $originalConfig -Encoding utf8
}
