<#
.SYNOPSIS
    Builds the Hanva Fine Dine POS One-Click Windows Desktop Installer (Setup.exe).

.DESCRIPTION
    Packages portable Node.js, portable PostgreSQL, compiled NestJS backend,
    Next.js standalone web frontend, and native Windows Tray Launcher into a
    standalone installer executable using Inno Setup.
#>

param(
    [string]$Version = "1.0.0",
    [string]$StageDir = "C:\hp-stage",
    [string]$DistDir = "C:\hp-dist"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path "$ScriptDir\..\.."

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Hanva POS Windows One-Click Installer Build Pipeline   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Locate C# Compiler (csc.exe)
$CscExe = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $CscExe)) {
    throw "Microsoft .NET C# compiler not found at $CscExe"
}

# 2. Locate Inno Setup Compiler (ISCC.exe)
$IsccCandidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
)
$IsccExe = $IsccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $IsccExe) {
    throw "Inno Setup Compiler (ISCC.exe) not found. Please install Inno Setup 6."
}

Write-Host "[✓] C# Compiler: $CscExe" -ForegroundColor Green
Write-Host "[✓] Inno Setup:  $IsccExe" -ForegroundColor Green

# 3. Create build staging and dist directories
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

# 4. Compile Launcher
Write-Host "`n[1/5] Compiling Native System Tray Launcher..." -ForegroundColor Yellow
$IconPath = "$RepoRoot\apps\web\public\icon.ico"
if (-not (Test-Path $IconPath)) { $IconPath = "$StageDir\app.ico" }

& $CscExe /target:winexe /reference:System.Net.Http.dll /out:"$StageDir\HanvaPOSLauncher.exe" /win32icon:"$IconPath" "$ScriptDir\launcher\Program.cs"
if ($LASTEXITCODE -ne 0) { throw "Launcher compilation failed." }
Write-Host "[✓] Compiled HanvaPOSLauncher.exe" -ForegroundColor Green

# 5. Compile Prisma Schema and Seed if needed
Write-Host "`n[2/5] Verifying database schema & seed..." -ForegroundColor Yellow
$PrismaDir = "$StageDir\app\backend\prisma"
if (Test-Path "$RepoRoot\apps\backend\prisma\schema.sql") {
    Copy-Item "$RepoRoot\apps\backend\prisma\schema.sql" "$PrismaDir\schema.sql" -Force
}
if (Test-Path "$RepoRoot\apps\backend\prisma\dist\seed.js") {
    New-Item -ItemType Directory -Path "$PrismaDir\dist" -Force | Out-Null
    Copy-Item "$RepoRoot\apps\backend\prisma\dist\seed.js" "$PrismaDir\dist\seed.js" -Force
}

# 6. Copy App Icon to stage
if (Test-Path $IconPath) {
    Copy-Item $IconPath "$StageDir\app.ico" -Force
}

# 7. Prune unnecessary dev assets (MAX_PATH mitigation)
Write-Host "`n[3/5] Pruning unnecessary dev assets (MAX_PATH mitigation)..." -ForegroundColor Yellow
& node "$ScriptDir\prune-staging.js" "$StageDir"

# 8. Compile Inno Setup Installer
Write-Host "`n[4/5] Packaging with Inno Setup LZMA2 compression..." -ForegroundColor Yellow
& $IsccExe "$ScriptDir\HanvaPOS.iss"
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed." }

$OutputExe = "$DistDir\HanvaPOS-Setup-v$Version.exe"
if (Test-Path $OutputExe) {
    $SizeMB = [math]::Round(((Get-Item $OutputExe).Length / 1MB), 2)
    Write-Host "`n[5/5] INSTALLER CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "    File: $OutputExe" -ForegroundColor Cyan
    Write-Host "    Size: $SizeMB MB" -ForegroundColor Cyan
} else {
    throw "Output executable not found at $OutputExe"
}
