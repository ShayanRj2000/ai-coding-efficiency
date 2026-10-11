$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$resultDirectory = Join-Path $taskRoot 'experiment-001\test-results\2026-10-11'
if (Test-Path -LiteralPath (Join-Path $resultDirectory 'model-trials.json')) { throw 'Experiment 001 evidence is immutable. Use npm run verify:001; new checks go under verification/.' }
Write-Host 'Applying returned patches to separate fixture copies and checking acceptance'
& node (Join-Path $PSScriptRoot 'verify_orders.cjs') 2>&1 | Tee-Object -FilePath (Join-Path $resultDirectory 'acceptance-verification.txt')
if ($LASTEXITCODE -eq 0) {
    & (Join-Path $PSScriptRoot 'python\python.exe') -B (Join-Path $PSScriptRoot 'summarize_results.py') 2>&1 | Tee-Object -FilePath (Join-Path $resultDirectory 'summary.txt')
}
Set-Content -LiteralPath (Join-Path $resultDirectory 'verification-status.txt') -Value ('Acceptance verification exit code: ' + $LASTEXITCODE) -Encoding UTF8
