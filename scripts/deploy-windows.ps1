Param()

$ErrorActionPreference = "Stop"
$deployRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Step($message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Ensure-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $name"
  }
}

Write-Step "Checking prerequisites"
Ensure-Command docker

Write-Host "Deploy root: $deployRoot" -ForegroundColor DarkGray

if (-not (Test-Path (Join-Path $deployRoot ".env"))) {
  throw ".env file not found at $deployRoot. Self-hosted runner workspace icinde .env dosyasini bir kez olustur ve koru."
}

if (-not (Test-Path (Join-Path $deployRoot "docker-compose.yml"))) {
  throw "docker-compose.yml not found at $deployRoot."
}

Push-Location $deployRoot

Write-Step "Docker status"
docker version | Out-Host

Write-Step "Building and starting containers"
docker compose up -d --build

Write-Step "Current container status"
docker compose ps | Out-Host

Write-Step "Recent application logs"
docker compose logs web --tail 80 | Out-Host

Write-Step "Deployment completed"

Pop-Location
