# Local, free Windows shop environment; NEVER connects to a remote Supabase project.
# Requires Docker Desktop running, Node.js 20+ and npx.
param([switch]$Reset)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$previous = Get-Location

try {
  Set-Location $root
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Install and start Docker Desktop before running this script."
  }
  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "Install Node.js 20+ before running this script."
  }
  & docker info --format '{{.ServerVersion}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Docker Desktop is not running." }
  if (Test-Path "supabase/.temp/project-ref") {
    throw "Linked remote Supabase detected. Unlink in a disposable clone first."
  }

  if (-not (Test-Path "supabase/config.toml")) {
    & npx --yes supabase init --yes
    if ($LASTEXITCODE -ne 0) { throw "supabase init failed" }
  }
  if (-not (Test-Path "supabase/migrations")) {
    New-Item -ItemType Directory -Path "supabase/migrations" | Out-Null
  }
  $sources = @(
    @{ name = "shop_baseline"; source = "supabase/schema.sql" },
    @{ name = "shop_orders"; source = "supabase/shop-orders-migration.sql" },
    @{ name = "shop_crm"; source = "supabase/shop-crm-migration.sql" }
  )
  foreach ($step in $sources) {
    $pattern = "*_$($step.name).sql"
    $exists = Get-ChildItem "supabase/migrations" -Filter $pattern -ErrorAction SilentlyContinue
    if ($exists) { continue }
    & npx --yes supabase migration new $step.name
    if ($LASTEXITCODE -ne 0) { throw "Could not create local migration $($step.name)" }
    $newFile = Get-ChildItem "supabase/migrations" -Filter $pattern |
      Sort-Object Name -Descending | Select-Object -First 1
    if (-not $newFile) { throw "Migration file missing: $($step.name)" }
    Copy-Item $step.source $newFile.FullName -Force
  }

  & npx --yes supabase start
  if ($LASTEXITCODE -ne 0) { throw "Local Supabase startup failed" }
  if ($Reset) {
    Write-Warning "Reset erases LOCAL test accounts, messages and orders."
    & npx --yes supabase db reset
    if ($LASTEXITCODE -ne 0) { throw "Local db reset failed" }
  }

  $vars = @{}
  $raw = (& npx --yes supabase status -o env | Out-String)
  if ($LASTEXITCODE -ne 0) { throw "Cannot read Supabase local status" }
  foreach ($line in ($raw -split "`r?`n")) {
    if ($line -match '^\s*([A-Z][A-Z0-9_]*)=(.*)$') {
      $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  $apiUrl = $vars["API_URL"]
  if (-not $apiUrl) { $apiUrl = $vars["SUPABASE_URL"] }
  $anon = $vars["ANON_KEY"]
  if (-not $anon) { $anon = $vars["PUBLISHABLE_KEY"] }
  $service = $vars["SERVICE_ROLE_KEY"]
  if (-not $service) { $service = $vars["SECRET_KEY"] }
  if (-not $apiUrl -or -not $anon -or -not $service) {
    throw "Missing local API_URL / ANON_KEY / SERVICE_ROLE_KEY. Run npx supabase status -o env."
  }
  $uri = [Uri]$apiUrl
  if ($uri.Scheme -ne "http" -or $uri.Host -notin @("localhost","127.0.0.1") -or $uri.Port -ne 54321) {
    throw "Refusing non-local Supabase: $apiUrl"
  }

  $localConfig = "window.BAZOOKA_SUPABASE = {`n" +
    "  url: " + (ConvertTo-Json -InputObject $apiUrl -Compress) + ",`n" +
    "  anonKey: " + (ConvertTo-Json -InputObject $anon -Compress) + ",`n" +
    "  bucket: `"cms-media`"`n};`n"
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $root "assets/js/shop-test-config.local.js"), $localConfig, $utf8NoBom)

  $envPath = Join-Path $root ".env"
  if (-not (Test-Path $envPath)) {
    $localEnv = @(
      "# LOCAL ONLY. Do not commit."
      "SHOP_CRM_TEST_MODE=1"
      "SHOP_ALLOW_LOCAL_SUPABASE=1"
      "SHOP_REQUIRE_LOCAL_DB=1"
      "SHOP_SUPABASE_URL=$apiUrl"
      "SHOP_SUPABASE_SERVICE_ROLE_KEY=$service"
      "SHOP_TG_BOT_TOKEN="
      "SHOP_TG_CHAT_ID="
      "PAYPAL_MODE=sandbox"
      "PAYPAL_CLIENT_ID="
      "PAYPAL_CLIENT_SECRET="
      "PAYPAL_WEBHOOK_ID="
      "SHOP_SHIPPING_USD=0.00"
    ) -join "`n"
    [System.IO.File]::WriteAllText($envPath, ($localEnv + "`n"), $utf8NoBom)
  } else {
    $existing = Get-Content $envPath -Raw
    if ($existing -notmatch '(?m)^SHOP_REQUIRE_LOCAL_DB=1\s*$' -or
        $existing -notmatch '(?m)^SHOP_ALLOW_LOCAL_SUPABASE=1\s*$' -or
        -not $existing.Contains("SHOP_SUPABASE_URL=$apiUrl")) {
      throw "Existing .env is not guarded for THIS local Supabase. Back it up and edit manually."
    }
    Write-Host "Existing local .env preserved."
  }

  Write-Host ""
  Write-Host "LOCAL SHOP READY. Production Supabase was not accessed."
  Write-Host "Studio: http://127.0.0.1:54323"
  Write-Host "Next: npx --yes netlify-cli dev"
  Write-Host "Store: http://localhost:8888/shop.html"
  Write-Host "Admin: http://localhost:8888/shop-admin.html"
  Write-Host "See docs/SHOP_LOCAL_SETUP.md"
} finally {
  Set-Location $previous
}
