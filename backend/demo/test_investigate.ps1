# Test Investigation Endpoint
$baseUrl = "http://localhost:8080/api/admin"
# Note: You need a valid JWT token for this to work.
# This script assumes you are running against a local instance with security disabled or with a valid token.

# 1. Get all tasks to find a PENDING one
$tasks = Invoke-RestMethod -Uri "$baseUrl/tasks" -Method Get -Headers @{ "Authorization" = "Bearer YOUR_TOKEN_HERE" }
$pendingTask = $tasks | Where-Object { $_.status -eq "PENDING" } | Select-Object -First 1

if ($pendingTask) {
    Write-Host "Found pending task ID: $($pendingTask.id)"
    
    # 2. Call investigate endpoint
    $result = Invoke-RestMethod -Uri "$baseUrl/tasks/$($pendingTask.id)/investigate" -Method Put -Headers @{ "Authorization" = "Bearer YOUR_TOKEN_HERE" }
    
    Write-Host "Investigation result status: $($result.status)"
    if ($result.status -eq "IN_PROGRESS") {
        Write-Host "SUCCESS: Task status updated to IN_PROGRESS"
    } else {
        Write-Host "FAILURE: Status is $($result.status)"
    }
} else {
    Write-Host "No pending tasks found to test investigation."
}
