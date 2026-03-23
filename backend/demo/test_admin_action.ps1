$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiJ0ZXN0YWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzI2OTE4OTEsImV4cCI6MTc3Mjc3ODI5MX0.9IKZ6flg6mlbeABJ4cJeomx_8D3zMPenmBdjxZfUU_0"
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $tasks = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/tasks" -Method Get -Headers $headers
    Write-Output "Task List Fetched Successfully. Count: $($tasks.Count)"
    if ($tasks.Count -gt 0) {
        $taskId = $tasks[-1].id
        Write-Output "Attempting to approve task ID: $taskId"
        $approveUrl = "http://localhost:8080/api/admin/tasks/$($taskId)/approve?priority=HIGH"
        $response = Invoke-RestMethod -Uri $approveUrl -Method Put -Headers $headers
        Write-Output "Task Approved Successfully"
    }
} catch {
    Write-Error "Admin Action Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Output "Response Body: $respBody"
    }
}
