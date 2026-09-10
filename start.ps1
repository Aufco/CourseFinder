param([int]$Port = 8000)

$url = "http://localhost:$Port"
Write-Host "Course Sprint is running at $url"
Write-Host "Press Ctrl+C to stop the server."
Start-Process $url
python -m http.server $Port --bind 127.0.0.1
