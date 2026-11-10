# MirrorDeck Dependency Bootstrap Script
param()

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BinDir = Join-Path $ProjectRoot 'bin'
$ReleaseBinDir = Join-Path $ProjectRoot 'src-tauri\target\release\bin'
$TauriBinDir = Join-Path $ProjectRoot 'src-tauri\bin'

Write-Host "==> Checking MirrorDeck dependencies..." -ForegroundColor Cyan

$DesktopScrcpy = Join-Path $env:USERPROFILE 'Desktop\scrcpy-win64-v5.0.1'

foreach ($target in @($BinDir, $ReleaseBinDir, $TauriBinDir)) {
    if (-not (Test-Path $target)) {
        New-Item -ItemType Directory -Force -Path $target | Out-Null
    }
    if ((Test-Path $DesktopScrcpy) -and (-not (Test-Path (Join-Path $target 'scrcpy.exe')))) {
        Write-Host "Copying binaries to $target..." -ForegroundColor Yellow
        Copy-Item -Path "$DesktopScrcpy\*" -Destination $target -Recurse -Force
    }
}

$adb = Join-Path $BinDir 'adb.exe'
$scrcpy = Join-Path $BinDir 'scrcpy.exe'

if ((Test-Path $adb) -and (Test-Path $scrcpy)) {
    Write-Host "[OK] ADB and Mirror Engine binaries bundled successfully!" -ForegroundColor Green
    & $adb version | Select-Object -First 1 | Write-Host -ForegroundColor Gray
    & $scrcpy --version | Select-Object -First 1 | Write-Host -ForegroundColor Gray
} else {
    Write-Host "[WARN] Could not locate adb.exe and scrcpy.exe automatically." -ForegroundColor Red
}
