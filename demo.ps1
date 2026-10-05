# Demo stepping controls for Windows. See DEMO-CONTROLS.md.
param([Parameter(Position = 0)][string]$Command = "help",
      [Parameter(Position = 1)][string]$Arg)

Set-Location $PSScriptRoot
$TagPrefix = "step-"
$RunCmd = ".\tools\up.ps1"

function Get-Steps { git tag -l "$TagPrefix*" | Sort-Object }
function Get-Current { (git describe --tags --exact-match 2>$null) }

function Set-Step($tag) {
  git reset --hard HEAD | Out-Null
  git clean -fd | Out-Null
  git checkout --quiet $tag
  Write-Host "Now on: $tag"
}

function Move-Step($delta) {
  $steps = @(Get-Steps); $cur = Get-Current
  if (-not $cur) { Set-Step $steps[0]; return }
  $i = [array]::IndexOf($steps, $cur) + $delta
  if ($i -lt 0) { Write-Host "Already at the first step."; return }
  if ($i -ge $steps.Count) { Write-Host "Already at the last step."; return }
  Set-Step $steps[$i]
}

switch ($Command) {
  "run"  { Invoke-Expression $RunCmd }
  "list" { $cur = Get-Current; foreach ($s in Get-Steps) {
             if ($s -eq $cur) { Write-Host "* $s" } else { Write-Host "  $s" } } }
  "next" { Move-Step 1 }
  "prev" { Move-Step -1 }
  "jump" { $t = (Get-Steps | Where-Object { $_ -match "^$TagPrefix0*$Arg(-|$)" })[0]
           if ($t) { Set-Step $t } else { Write-Host "No step matching '$Arg'." } }
  "discard-changes" { git reset --hard HEAD | Out-Null; git clean -fd | Out-Null
                      Write-Host "Changes discarded. Still on: $(Get-Current)" }
  "reset" { git reset --hard HEAD | Out-Null; git clean -fd | Out-Null
            git checkout --quiet main; Write-Host "Back on main." }
  default { Write-Host @"
Kai Finder, scaled (example_11) controls

  .\demo.ps1 run              Bring the stack up for this step
  .\demo.ps1 list             Show all available steps
  .\demo.ps1 next             Move to the next step
  .\demo.ps1 prev             Move to the previous step
  .\demo.ps1 jump 05          Jump to a specific step
  .\demo.ps1 discard-changes  Throw away your changes, stay on this step
  .\demo.ps1 reset            Leave the demo, return to the main branch

Moving between steps DISCARDS any changes you have made. That is intentional.
"@ }
}
