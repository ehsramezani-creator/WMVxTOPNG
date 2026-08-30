$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Vendor = Join-Path $Root 'vendor'
$Source = Join-Path $Vendor 'MPQExtractor'
$Build = Join-Path $Source 'build'

New-Item -ItemType Directory -Force $Vendor | Out-Null

if (-not (Test-Path (Join-Path $Source '.git'))) {
    git clone --recurse-submodules https://github.com/Kanma/MPQExtractor.git $Source
} else {
    git -C $Source pull --ff-only
    git -C $Source submodule update --init --recursive
}

cmake -S $Source -B $Build
cmake --build $Build --config Release --parallel

$Candidates = @(
    (Join-Path $Build 'bin/MPQExtractor.exe'),
    (Join-Path $Build 'Release/MPQExtractor.exe')
)

$Exe = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Exe) {
    $Exe = Get-ChildItem $Build -Recurse -Filter MPQExtractor.exe -File | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $Exe) { throw 'MPQExtractor.exe was not produced.' }

Write-Host "MPQExtractor: $Exe"
& $Exe --help
