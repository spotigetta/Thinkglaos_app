$projectRoot = $PSScriptRoot
try { $ready = (Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { $ready = $false }
if (-not $ready) {
  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm.cmd run dev -- --host 127.0.0.1 --port 3000' -WorkingDirectory $projectRoot -WindowStyle Hidden
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    try { if ((Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 1).StatusCode -eq 200) { break } } catch {}
  }
}
Start-Process -FilePath 'msedge.exe' -ArgumentList 'http://127.0.0.1:3000/?control=1'
