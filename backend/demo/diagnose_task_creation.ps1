$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiJ0ZXN0YWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzQwNzU1MTQsImV4cCI6MTc3NDE2MTkxNH0.OBu7NxKjrC4BWXsJZVtYkSLrweNRelhel8PMnYfZ5Hw"
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    description = "Verified Success Mission"
    taskDescription = "This mission is verified by the diagnostic script."
    responderId = 10
    locationName = "Pune, Maharashtra"
    latitude = 18.5204
    longitude = 73.8567
} | ConvertTo-Json

try {
    Write-Output "Testing task creation with Responder ID 10..."
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/tasks" -Method Post -Headers $headers -Body $body
    Write-Output "SUCCESS: Task Created!"
    $response | ConvertTo-Json
} catch {
    Write-Error "FAILURE: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Output "Error Response: $respBody"
    }
}
