$ErrorActionPreference = "Stop"

$root = "C:\Users\ehsra\Documents\GitHub\WMVxTOPNG"
$modelsRoot = Join-Path $root "ModelsTree"
$outputRoot = Join-Path $root "TempTest"

$tests = @(
    @{
        Id = "Test01"
        Name = "xyz"
        Model = Join-Path $modelsRoot "World\ArtTest\Boxtest\xyz.m2"
    },
    @{
        Id = "Test02"
        Name = "FishingBox"
        Model = Join-Path $modelsRoot "World\AZEROTH\BOOTYBAY\PASSIVEDOODAD\FishingBox\FishingBox.M2"
    },
    @{
        Id = "Test03"
        Name = "outland_bone_dam"
        Model = Join-Path $modelsRoot "World\OUTLAND\PASSIVEDOODADS\Dam\outland_bone_dam.m2"
    },
    @{
        Id = "Test04"
        Name = "AllianceRider"
        Model = Join-Path $modelsRoot "Creature\ALLIANCERIDER\AllianceRider.m2"
    }
)

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$results = @()

foreach ($test in $tests) {

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "$($test.Id) - $($test.Name)"
    Write-Host "============================================================"

    if (-not (Test-Path $test.Model)) {
        Write-Host "ERROR: Model not found:"
        Write-Host $test.Model
        $results += [PSCustomObject]@{
            Test = $test.Id
            Model = $test.Name
            Normal = "MODEL_NOT_FOUND"
            Orbit = "MODEL_NOT_FOUND"
            Views = 0
        }
        continue
    }

    $testOutput = Join-Path $outputRoot $test.Id
    New-Item -ItemType Directory -Path $testOutput -Force | Out-Null

    # ----------------------------------------------------------
    # Normal render
    # ----------------------------------------------------------

    $normalOutput = Join-Path $testOutput "$($test.Name).png"

    Write-Host ""
    Write-Host "[Normal Render]"

    node ".\src\tools\render-model.js" `
        $test.Model `
        $normalOutput `
        $modelsRoot `
        $modelsRoot

    $normalExists = Test-Path $normalOutput
    $normalSize = if ($normalExists) {
        (Get-Item $normalOutput).Length
    } else {
        0
    }

    # ----------------------------------------------------------
    # Camera Orbit
    # ----------------------------------------------------------

    $orbitOutput = Join-Path $testOutput "$($test.Name)-orbit.png"

    Write-Host ""
    Write-Host "[Camera Orbit]"

    node ".\src\tools\render-model.js" `
        $test.Model `
        $orbitOutput `
        $modelsRoot `
        $modelsRoot `
        --camera-orbit

    $orbitFiles = @(Get-ChildItem "$testOutput\$($test.Name)-orbit*.png" -File -ErrorAction SilentlyContinue)

    $results += [PSCustomObject]@{
        Test = $test.Id
        Model = $test.Name
        Normal = if ($normalExists) { "OK" } else { "FAILED" }
        NormalBytes = $normalSize
        Orbit = if ($orbitFiles.Count -gt 0) { "OK" } else { "FAILED" }
        Views = $orbitFiles.Count
        OutputDirectory = $testOutput
    }

    Write-Host ""
    Write-Host "Result:"
    Write-Host "  Normal : $(if ($normalExists) { 'OK' } else { 'FAILED' })"
    Write-Host "  Orbit  : $(if ($orbitFiles.Count -gt 0) { 'OK' } else { 'FAILED' })"
    Write-Host "  Views  : $($orbitFiles.Count)"
}

Write-Host ""
Write-Host "============================================================"
Write-Host "FINAL TEST SUMMARY"
Write-Host "============================================================"

$results | Format-Table -AutoSize

$summaryPath = Join-Path $outputRoot "TestSummary.txt"

$results |
    Format-Table -AutoSize |
    Out-String |
    Set-Content $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "Summary saved to:"
Write-Host $summaryPath
Write-Host ""
Write-Host "All test outputs:"
Write-Host $outputRoot
