$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiJ0ZXN0YWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzQwNzU1MTQsImV4cCI6MTc3NDE2MTkxNH0.OBu7NxKjrC4BWXsJZVtYkSLrweNRelhel8PMnYfZ5Hw"
$headers = @{
    Authorization = "Bearer $token"
}

try {
    Write-Output "--- Listing All Users ---"
    $users = Invoke-RestMethod -Uri "http://localhost:8080/api/admin/users" -Method Get -Headers $headers
    $users | ForEach-Object {
        Write-Output "User ID: $($_.id) | Email: $($_.email) | Role: $($_.role)"
    }
} catch {
    Write-Error "Failed to list users: $_"
}
