# Scotty Multitool dev launcher.
#
# Interactive menu for the most common developer tasks: start the desktop
# app, start/stop the companion server, tail the server log, run a build,
# and run the project's test suites. Designed to be run from a double-click
# or from a terminal in the project root.

$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  Scotty Multitool - Dev Launcher" -ForegroundColor Cyan
    Write-Host "  $projectRoot" -ForegroundColor DarkGray
    Write-Host ""
}

function Get-ServerProc {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
        Where-Object { $_.CommandLine -like '*server\index.js*' } |
        Select-Object -First 1
}

function Show-ServerStatus {
    $p = Get-ServerProc
    if ($p) {
        Write-Host ("  Server:  RUNNING  (pid {0})" -f $p.ProcessId) -ForegroundColor Green
    } else {
        Write-Host "  Server:  stopped" -ForegroundColor Yellow
    }
}

function Start-Server {
    if (Get-ServerProc) { Write-Host "Server already running." -ForegroundColor Yellow; return }
    Write-Host "Starting server in a new window..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit","-Command","cd `"$projectRoot`"; node server/index.js"
    Start-Sleep -Seconds 1
}

function Stop-Server {
    $p = Get-ServerProc
    if (-not $p) { Write-Host "Server is not running." -ForegroundColor Yellow; return }
    Write-Host ("Stopping server pid {0}..." -f $p.ProcessId) -ForegroundColor Cyan
    Stop-Process -Id $p.ProcessId -Force
}

function Tail-Log {
    $logDir = Join-Path $env:APPDATA 'scotty-multitool\server\logs'
    if (-not (Test-Path $logDir)) { Write-Host "No logs yet." -ForegroundColor Yellow; return }
    $latest = Get-ChildItem $logDir -Filter 'server-*.log' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latest) { Write-Host "No log files yet." -ForegroundColor Yellow; return }
    Write-Host ("Tailing {0}  (Ctrl+C to stop)" -f $latest.FullName) -ForegroundColor Cyan
    Get-Content -Path $latest.FullName -Tail 40 -Wait
}

function Start-App       { Start-Process -FilePath (Join-Path $projectRoot 'Start MacroBot.bat') }
function Run-Build       { npx vite build }
function Run-Tests       {
    if (Test-Path (Join-Path $projectRoot 'package.json')) {
        $pkg = Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
        if ($pkg.scripts.PSObject.Properties.Name -contains 'test') { npm test; return }
    }
    Write-Host "No 'test' script in package.json." -ForegroundColor Yellow
}
function Open-Server-Data {
    $dir = Join-Path $env:APPDATA 'scotty-multitool\server'
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    Start-Process explorer.exe $dir
}

while ($true) {
    Write-Banner
    Show-ServerStatus
    Write-Host ""
    Write-Host "  [1] Start app"
    Write-Host "  [2] Start server"
    Write-Host "  [3] Stop server"
    Write-Host "  [4] Tail server log"
    Write-Host "  [5] Run build"
    Write-Host "  [6] Run tests"
    Write-Host "  [7] Open server data folder"
    Write-Host "  [Q] Quit"
    Write-Host ""
    $choice = Read-Host "Select"
    switch ($choice.ToLower()) {
        '1' { Start-App }
        '2' { Start-Server }
        '3' { Stop-Server }
        '4' { Tail-Log }
        '5' { Run-Build }
        '6' { Run-Tests }
        '7' { Open-Server-Data }
        'q' { break }
        default { }
    }
    if ($choice -notin @('4','5','6')) { Start-Sleep -Milliseconds 400 }
}
