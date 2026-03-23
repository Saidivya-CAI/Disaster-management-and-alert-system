$body = @{
    email = "testcitizen@example.com"
    password = "password123"
    fullName = "Test Citizen"
    role = "CITIZEN"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/register" -Method Post -ContentType "application/json" -Body $body
    Write-Output "Registration Successful"
    Write-Output "Token: $($response.token)"
} catch {
    Write-Error "Registration Failed: $_"
    # Attempt login if already exists
    try {
        $loginBody = @{ email = "testcitizen@example.com"; password = "password123" } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
        Write-Output "Login Successful"
        Write-Output "Token: $($response.token)"
    } catch {
        Write-Error "Login Failed: $_"
    }
}
