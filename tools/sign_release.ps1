# sign_release.ps1 — HyperCode 发布签名流水线（SSL.com eSigner 云签名）
#
# 前置条件（证书采购完成后配置一次）：
#   1. 在 SSL.com 完成 OV 证书购买 + 组织验证（3-5 天）
#   2. 证书注册到 eSigner（购买时选择 "eSigner" 作为 key storage，或事后注册）
#   3. 在 SSL.com 账户 → Developer → API 生成 ESIGNER_USERNAME / ESIGNER_PASSWORD
#   4. 把凭证写入本目录 deploy/.env（不要提交）：
#        ESIGNER_USERNAME=xxx
#        ESIGNER_PASSWORD=xxx
#        ESIGNER_CREDENTIAL_ID=xxx   # get_credential_ids 查到
#
# 用法（HyperCode 构建产物目录下）：
#   powershell -ExecutionPolicy Bypass -File tools\sign_release.ps1 `
#       -ExePath .\dist\hypercode.exe -Version 0.1.2
#
# 流程：SHA256 签名 + RFC3161 时间戳 → 打 zip → 提示上传 release 的命令。

param(
    [Parameter(Mandatory=$true)][string]$ExePath,
    [Parameter(Mandatory=$true)][string]$Version
)

$ErrorActionPreference = "Stop"
$CST = "C:\Users\ASUS\codesigntool\CodeSignTool.bat"

if (-not (Test-Path $ExePath)) { throw "exe not found: $ExePath" }

# 加载凭证（deploy/.env 或环境变量）
$envFile = Join-Path $PSScriptRoot "..\deploy\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^(\w+)=(.+)$" } | ForEach-Object {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}
if (-not $env:ESIGNER_USERNAME -or -not $env:ESIGNER_PASSWORD) {
    throw "缺少 ESIGNER_USERNAME / ESIGNER_PASSWORD（写入 deploy/.env）"
}

$cred = if ($env:ESIGNER_CREDENTIAL_ID) { $env:ESIGNER_CREDENTIAL_ID } else { "first" }

Write-Host "==> 签名 $ExePath (v$Version, credential=$cred)"
Push-Location (Split-Path $CST)
cmd /c "CodeSignTool.bat sign -username=$($env:ESIGNER_USERNAME) -password=$($env:ESIGNER_PASSWORD) -credential_id=$cred -input_file_path=`"$ExePath`" -output_dir_path=`"$(Split-Path $ExePath)`"" 2>&1 | Out-Host
if ($LASTEXITCODE -ne 0) { throw "CodeSignTool sign failed (exit $LASTEXITCODE)" }
Pop-Location

Write-Host "==> 验证签名"
$sig = & powershell -NoProfile -Command "Get-AuthenticodeSignature '$ExePath'"
$sig | Format-List Status, StatusMessage, @{N='Signer';E={$_.SignerCertificate.Subject}}

$zip = "$(Split-Path $ExePath)\hypercode-windows-x64-v$Version.zip"
Write-Host "==> 打包 $zip"
$parent = (Get-Item $ExePath).Directory.FullName
Compress-Archive -Path (Join-Path $parent "*") -DestinationPath $zip -Force

Write-Host ""
Write-Host "==> 上传 release（复制执行）："
Write-Host "gh release create v$Version -R AwareLiquid/HyperCode --title 'HyperCode v$Version' $zip"
