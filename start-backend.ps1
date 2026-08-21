# DevSync Backend Starter (Windows PowerShell)
# Reads .env and starts Spring Boot with those environment variables.
#
# Usage:
#   .\start-backend.ps1
#
# Before running, fill in your credentials in .env:
#   MAIL_USERNAME=your-email@gmail.com
#   MAIL_PASSWORD=your-16-char-app-password

Write-Host "[DevSync] Loading environment from .env ..." -ForegroundColor Cyan

# Parse .env file
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Write-Host "[DevSync] Loaded $($envVars.Count) variables" -ForegroundColor Green

# Show key config
Write-Host ""
Write-Host "  DATABASE:     $($envVars['SPRING_DATASOURCE_URL'])" -ForegroundColor Gray
Write-Host "  MAIL_USER:    $($envVars['MAIL_USERNAME'])" -ForegroundColor Gray
Write-Host "  CORS:         $($envVars['DEVSYNC_CORS_ORIGINS'])" -ForegroundColor Gray
Write-Host ""

if ($envVars['MAIL_USERNAME'] -eq "your-email@gmail.com" -or -not $envVars['MAIL_USERNAME']) {
    Write-Host "[WARNING] MAIL_USERNAME is not set! Email verification will not work." -ForegroundColor Yellow
    Write-Host "  Edit .env and set MAIL_USERNAME and MAIL_PASSWORD." -ForegroundColor Yellow
    Write-Host "  See .env for Gmail App Password instructions." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[DevSync] Starting Spring Boot backend on port $($envVars['SERVER_PORT'] ?? '8080') ..." -ForegroundColor Cyan

# Start the backend
Set-Location "$PSScriptRoot\backend"
mvn spring-boot:run
