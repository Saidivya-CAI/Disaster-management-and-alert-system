$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQ0lUSVpFTiIsInN1YiI6InRlc3RjaXRpemVuQGV4YW1wbGUuY29tIiwiaWF0IjoxNzcyNjkxNzg1LCJleHAiOjE3NzI3NzgxODV9.xiP7x_BV43h9Iur9y7fl9v2Gk3DL4dv1WC6f7jVtYig"
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}
$body = @{
    description = "Test Emergency: Assistance needed at central park"
    latitude = 37.7749
    longitude = -122.4194
    locationName = "Central Park, SF"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/citizen/request-help" -Method Post -Headers $headers -Body $body
    Write-Output "SOS Request Successful: $response"
} catch {
    Write-Error "SOS Request Failed: $_"
}
