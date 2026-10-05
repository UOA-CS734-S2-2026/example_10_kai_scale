# .\demo.ps1 run on Windows: the same as tools/up.sh.
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Test-Path ".env")) {
  Write-Host "No .env here. Copy .env.example to .env and set GOOGLE_APPLICATION_CREDENTIALS."
  exit 1
}
docker compose up -d --build --force-recreate --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
docker compose restart web
Write-Host ""
docker compose ps
Write-Host ""
Write-Host "Dashboard on http://localhost:8080, and the api through it at /api/."
Write-Host "Following logs. Ctrl+C stops following; the containers keep running."
docker compose logs -f --tail=3
