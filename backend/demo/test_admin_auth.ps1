$body = @{
    email = "testadmin@example.com"
    password = "password123"
    fullName = "Test Admin"
    role = "ADMIN"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -ContentType "application/json" -Body $body
    Write-Output "Admin Registration Successful"
    Write-Output "Token: $($response.token)"
} catch {
    # Attempt login if already exists
    try {
        $loginBody = @{ email = "testadmin@example.com"; password = "password123" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
        Write-Output "Admin Login Successful"
        Write-Output "Token: $($response.token)"
    } catch {
        Write-Error "Admin Auth Failed: $_"
    }
}
