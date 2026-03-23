$token = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiQURNSU4iLCJzdWIiOiJ0ZXN0YWRtaW5AZXhhbXBsZS5jb20iLCJpYXQiOjE3NzI2OTE4OTEsImV4cCI6MTc3Mjc3ODI5MX0.9IKZ6flg6mlbeABJ4cJeomx_8D3zMPenmBdjxZfUU_0"
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    title = "Test Fire Alert"
    description = "Test fire alert description"
    disasterType = "FIRE"
    severity = "MEDIUM"
    region = "Test Region"
    locationName = "Test Location"
} | ConvertTo-Json

try {
    Write-Output "Sending POST request to /api/admin/alerts..."
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/admin/alerts" -Method Post -Headers $headers -Body $body
    Write-Output "Status Code: $($response.StatusCode)"
    Write-Output "Response Body: $($response.Content)"
} catch {
    Write-Error "Request Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Output "Error Response Body: $respBody"
    } else {
        Write-Output "No response received from server. Is the backend running on 8080?"
    }
}
