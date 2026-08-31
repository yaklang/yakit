# 在当前 PowerShell 窗口点源执行: . .\scripts\set-electron-mirror.ps1
Remove-Item Env:ELECTRON_MIRROR -ErrorAction SilentlyContinue
Remove-Item Env:ELECTRON_BUILDER_BINARIES_MIRROR -ErrorAction SilentlyContinue
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/"
