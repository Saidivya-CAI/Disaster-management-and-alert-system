$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiJ0ZXN0YWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzI2OTE4OTEsImV4cCI6MTc3Mjc3ODI5MX0.9IKZ6flg6mlbeABJ4cJeomx_8D3zMPenmBdjxZfUU_0"
$headers = @{
    Authorization = "Bearer $token"
}

Write-Host "--- Diagnostics ---"
try {
    $diag = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/diagnostics" -Method Get -Headers $headers
    Write-Output "Diagnostics: $($diag | ConvertTo-Json)"
} catch {
    Write-Error "Diagnostics Failed: $_"
}

Write-Host "`n--- Tasks ---"
try {
    $tasks = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/tasks" -Method Get -Headers $headers
    Write-Output "Task List Fetched Successfully. Count: $($tasks.Count)"
} catch {
    Write-Error "Task List Failed: $_"
}
