param(
  [Parameter(Mandatory=$true)] [string] $WowRoot,
  [string] $Pattern = 'Character\*\*\*.M2',
  [string] $Output = '.\fixtures\wow335a'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BuildScript = Join-Path $ProjectRoot 'tools\build-mpqextractor.ps1'

& $BuildScript
$Extractor = Get-ChildItem (Join-Path $ProjectRoot 'vendor\MPQExtractor\build') -Recurse -Filter MPQExtractor.exe -File | Select-Object -First 1 -ExpandProperty FullName
if (-not $Extractor) { throw 'MPQExtractor.exe not found.' }

New-Item -ItemType Directory -Force $Output | Out-Null
$Mpqs = Get-ChildItem (Join-Path $WowRoot 'Data') -Recurse -Filter '*.MPQ' -File | Sort-Object FullName

foreach ($Mpq in $Mpqs) {
  Write-Host "=== $($Mpq.FullName) ==="
  & $Extractor -s $Pattern $Mpq.FullName
}
