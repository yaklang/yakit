param(
    [string]$MakensisPath = "$env:LOCALAPPDATA\electron-builder\Cache\nsis\nsis-3.0.4.1\Bin\makensis.exe"
)

$ErrorActionPreference = 'Stop'
if (!(Test-Path -LiteralPath $MakensisPath)) { throw "NSIS compiler not found: $MakensisPath" }
$taskRepo = Split-Path -Parent $PSScriptRoot
$taskSource = Get-Content -LiteralPath "$taskRepo\build\yakit_build.nsh" -Raw -Encoding UTF8
$taskRoot = Join-Path ([IO.Path]::GetTempPath()) ("senso-nsis-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $taskRoot | Out-Null

# Compile the production macros, substituting only registry reads and the desktop
# location so these tests cannot modify an installed app or real desktop shortcuts.
$taskMacros = foreach ($taskName in @('initProductIdentity', 'checkInstalled', 'checkIsUpdated', 'customInit', 'customUnInit', 'migrateSensoDesktopShortcut')) {
    $taskMatch = [regex]::Match($taskSource, ('(?ms)^!macro {0}\r?\n.*?^!macroend' -f $taskName))
    if (!$taskMatch.Success) { throw "Missing production macro: $taskName" }
    $taskMatch.Value
}
$taskMacroText = ($taskMacros -join "`r`n").Replace('$DESKTOP', '$TEST_DESKTOP')
$taskMacroText = $taskMacroText.Replace('ReadRegStr $INSTALL_PATH HKCU "Software\Yakit" $INSTALL_PATH_REG_KEY_NAME', 'StrCpy $INSTALL_PATH "${TEST_INSTALL_PATH}"')

$taskCases = @(
    @{ Name = 'senso-clean'; Product = 'AI Senso'; Id = 'com.aisenso.desktop'; Key = 'AI SenPike_InstallPath' },
    @{ Name = 'senso-upgrade'; Product = 'AI Senso'; Id = 'com.aisenso.desktop'; Key = 'AI SenPike_InstallPath'; Old = $true; Current = $true; Migrate = $true },
    @{ Name = 'senso-old-uninstaller'; Product = 'AI Senso'; Id = 'com.aisenso.desktop'; Key = 'AI SenPike_InstallPath'; Old = $true; Current = $true; Migrate = $true; OldRemoved = $true },
    @{ Name = 'senso-missing-target'; Product = 'AI Senso'; Id = 'com.aisenso.desktop'; Key = 'AI SenPike_InstallPath'; Old = $true },
    @{ Name = 'senso-link-failure'; Product = 'AI Senso'; Id = 'com.aisenso.desktop'; Key = 'AI SenPike_InstallPath'; Old = $true; Current = $true; BlockLink = $true },
    @{ Name = 'yakit'; Product = 'Yakit'; Id = 'io.yaklang.yakit'; Key = 'InstallPath'; Old = $true; Current = $true },
    @{ Name = 'enterprise'; Product = 'EnpriTrace'; Id = 'io.yaklang.enpritrace'; Key = 'EnpriTrace_InstallPath' },
    @{ Name = 'agent'; Product = 'EnpriTraceAgent'; Id = 'io.yaklang.enpritraceagent'; Key = 'EnpriTraceAgent_InstallPath' },
    @{ Name = 'irify'; Product = 'IRify'; Id = 'io.yaklang.irify'; Key = 'IRify_InstallPath' },
    @{ Name = 'irify-ee'; Product = 'IRifyEnpriTrace'; Id = 'io.yaklang.irifyee'; Key = 'IRifyEnpriTrace_InstallPath' },
    @{ Name = 'memfit-legacy'; Product = 'Memfit AI'; Id = 'legacy.memfit'; Key = 'MemfitAI_InstallPath' }
)
$taskShell = New-Object -ComObject WScript.Shell
foreach ($taskCase in $taskCases) {
    $taskDir = Join-Path $taskRoot $taskCase.Name
    $taskInstall = Join-Path $taskDir 'installed app'
    $taskDesktop = Join-Path $taskDir 'desktop'
    New-Item -ItemType Directory -Path $taskInstall, $taskDesktop | Out-Null
    $taskLegacyLink = Join-Path $taskDesktop 'AI SenPike.lnk'
    $taskNewLink = Join-Path $taskDesktop ($taskCase.Product + '.lnk')
    if ($taskCase.Old) {
        [IO.File]::WriteAllText((Join-Path $taskInstall 'AI SenPike.exe'), 'old fixture')
        $taskLink = $taskShell.CreateShortcut($taskLegacyLink)
        $taskLink.TargetPath = Join-Path $taskInstall 'AI SenPike.exe'
        $taskLink.Save()
    }
    if ($taskCase.Current) {
        [IO.File]::WriteAllText((Join-Path $taskInstall ($taskCase.Product + '.exe')), 'current fixture')
    }
    if ($taskCase.BlockLink) { New-Item -ItemType Directory -Path $taskNewLink | Out-Null }
    # The executable name deliberately contains no product name.
    $taskFixture = @'
Unicode true
RequestExecutionLevel user
SilentInstall silent
!include "LogicLib.nsh"
!include "FileFunc.nsh"
Var EXE_NAME
Var INSTALL_PATH_REG_KEY_NAME
Var INSTALL_PATH
Var IS_INSTALLED
Var IS_UPDATED
Var TEST_DESKTOP
Var HAD_SENSO_DESKTOP_SHORTCUT
OutFile "runner.exe"
@@MACROS@@
Section
    StrCpy $TEST_DESKTOP "@@DESKTOP@@"
    !insertmacro customInit
    FileOpen $0 "$EXEDIR\result.txt" w
    FileWrite $0 "$EXE_NAME$\r$\n$INSTALL_PATH_REG_KEY_NAME$\r$\n$IS_INSTALLED$\r$\n$INSTDIR$\r$\n"
    FileClose $0
    @@OLD_UNINSTALLER@@
    !insertmacro migrateSensoDesktopShortcut
    StrCpy $INSTDIR "$EXEDIR\uninstall-here"
    !insertmacro customUnInit
    FileOpen $0 "$EXEDIR\uninstall.txt" w
    FileWrite $0 "$EXE_NAME$\r$\n$INSTDIR$\r$\n"
    FileClose $0
SectionEnd
'@
    $taskFixture = $taskFixture.Replace('@@MACROS@@', $taskMacroText).Replace('@@DESKTOP@@', $taskDesktop)
    $taskOldUninstaller = if ($taskCase.OldRemoved) { 'Delete "$TEST_DESKTOP\AI SenPike.lnk"' } else { '' }
    $taskFixture = $taskFixture.Replace('@@OLD_UNINSTALLER@@', $taskOldUninstaller)
    $taskFixturePath = Join-Path $taskDir 'fixture.nsi'
    [IO.File]::WriteAllText($taskFixturePath, $taskFixture, [Text.UTF8Encoding]::new($true))
    $taskCompilerOutput = & $MakensisPath /V2 "/DPRODUCT_FILENAME=$($taskCase.Product)" "/DAPP_ID=$($taskCase.Id)" "/DTEST_INSTALL_PATH=$taskInstall" $taskFixturePath 2>&1
    if ($LASTEXITCODE -ne 0) { throw "NSIS compile failed: $taskCompilerOutput" }
    $taskProcess = Start-Process -FilePath (Join-Path $taskDir 'runner.exe') -WindowStyle Hidden -Wait -PassThru
    if ($taskProcess.ExitCode -ne 0) { throw "Fixture failed: $($taskCase.Name)" }
    $taskResult = Get-Content -LiteralPath (Join-Path $taskDir 'result.txt')
    $taskExpectedInstalled = if ($taskCase.Current -or ($taskCase.Old -and $taskCase.Id -eq 'com.aisenso.desktop')) { 'true' } else { '' }
    if ($taskResult[0] -cne $taskCase.Product -or $taskResult[1] -cne $taskCase.Key -or $taskResult[2] -ne $taskExpectedInstalled -or $taskResult[3] -ne $taskInstall) {
        throw "Incorrect product/install identity for $($taskCase.Name): $taskResult"
    }
    $taskUninstall = Get-Content -LiteralPath (Join-Path $taskDir 'uninstall.txt')
    if ($taskUninstall[0] -cne $taskCase.Product -or $taskUninstall[1] -ne (Join-Path $taskDir 'uninstall-here')) {
        throw "Uninstall was redirected for $($taskCase.Name): $taskUninstall"
    }
    if ($taskCase.Migrate) {
        if (Test-Path -LiteralPath $taskLegacyLink) { throw 'Legacy shortcut remains after migration' }
        $taskLink = $taskShell.CreateShortcut($taskNewLink)
        if ($taskLink.TargetPath -ne (Join-Path $taskInstall 'AI Senso.exe')) { throw 'Migrated shortcut points to wrong executable' }
    } else {
        if ((Test-Path -LiteralPath $taskLegacyLink) -ne [bool]$taskCase.Old) { throw "Unexpected legacy shortcut change: $($taskCase.Name)" }
        if (Test-Path -LiteralPath $taskNewLink -PathType Leaf) { throw "Unexpected shortcut creation: $($taskCase.Name)" }
    }
    Write-Output "PASS $($taskCase.Name)"
}
Write-Output "$($taskCases.Count) NSIS runtime scenarios passed. Isolated fixtures: $taskRoot"
