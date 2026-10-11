$ErrorActionPreference = 'Continue'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$resultDirectory = Join-Path $taskRoot 'experiment-001\test-results\2026-10-11'
if (Test-Path -LiteralPath (Join-Path $resultDirectory 'model-trials.json')) { throw 'Experiment 001 evidence is immutable. Use the setup and experiment commands in README.md.' }
New-Item -ItemType Directory -Path $resultDirectory -Force | Out-Null
$pythonRuntime = Join-Path $PSScriptRoot 'python\python.exe'
Set-Content -LiteralPath (Join-Path $resultDirectory 'terminal-status.txt') -Value 'Running unit tests in VS Code terminal' -Encoding UTF8
Write-Host 'Running Python unit tests'
& $pythonRuntime -B -m unittest -v test_context_pack.py 2>&1 | Tee-Object -FilePath (Join-Path $resultDirectory 'unit-tests.txt')
$unitExit = $LASTEXITCODE
Write-Host ('Unit test exit code: ' + $unitExit)
Write-Host 'Checking context payloads and the experiment generator'
& $pythonRuntime -B (Join-Path $PSScriptRoot 'inspect_experiment.py') 2>&1 | Tee-Object -FilePath (Join-Path $resultDirectory 'input-verification.txt')
if ($LASTEXITCODE -ne 0) {
    Set-Content -LiteralPath (Join-Path $resultDirectory 'terminal-status.txt') -Value 'Input verification failed' -Encoding UTF8
    exit 1
}
Set-Content -LiteralPath (Join-Path $resultDirectory 'terminal-status.txt') -Value 'Running six independent model trials in VS Code terminal' -Encoding UTF8
Write-Host 'Running model trials: A/B, B/A, A/B'
& node (Join-Path $PSScriptRoot 'run_model_trials.cjs') 2>&1 | Tee-Object -FilePath (Join-Path $resultDirectory 'model-runner.txt')
Set-Content -LiteralPath (Join-Path $resultDirectory 'terminal-status.txt') -Value 'Command run finished; patches await acceptance verification' -Encoding UTF8
Write-Host ('Saved results to ' + $resultDirectory)
