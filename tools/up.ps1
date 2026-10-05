# .\demo.ps1 run on Windows: the same as tools/up.sh.
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".env")) {
  Write-Host "No .env here. Copy .env.example to .env and set GOOGLE_APPLICATION_CREDENTIALS."
  exit 1
}
docker compose up -d --build --force-recreate --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose restart gateway
Write-Host ""
docker compose ps
Write-Host ""
Write-Host "Gateway on http://localhost:3734 (the dashboard's VITE_KAI_SERVER)."
Write-Host "Following logs. Ctrl+C stops following; the containers keep running."
docker compose logs -f --tail=3
