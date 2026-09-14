!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "StrFunc.nsh"
!include "MUI2.nsh"

${StrStr} # Supportable for Install Sections and Functions
${UnStrStr} # Supportable for Uninstall Sections and Functions

Unicode true

Var /Global IS_INSTALLED
Var /Global IS_UPDATED
Var /Global INSTALL_PATH
Var /Global INSTALL_PATH_REG_KEY_NAME
Var /Global EXE_NAME
Var /Global HAD_SENSO_DESKTOP_SHORTCUT
Var /Global KEEP_FOLDER
Var /Global DeleteOldEngine
Var /Global DeleteOldEngineLabel



Function DirectoryPageShow
    ; 获取目录页面的句柄
    FindWindow $0 "#32770" "" $HWNDPARENT
    ; 获取目录页面顶部文本控件的句柄
    GetDlgItem $1 $0 1006
    ${If} $IS_INSTALLED == "true"
        SendMessage $1 ${WM_SETTEXT} 0 "STR:检测到程序已经安装。点击安装会将旧程序卸载并重新进行安装。安装程序会自动迁移 yakit-projects 文件夹。"
    ${Else}
        SendMessage $1 ${WM_SETTEXT} 0 "STR:安装程序会自动迁移 yakit-projects 文件夹。"
    ${EndIf}
FunctionEnd

Function ForceQuit
    Quit
FunctionEnd

Function ShowInstallPermissionError
    MessageBox MB_OK|MB_ICONSTOP "安装失败：当前安装目录没有写入权限。$\r$\n$\r$\n目标目录：$INSTDIR$\r$\n$\r$\n请检查权限，或右键选择“以管理员身份运行”后重试。"
    Quit
FunctionEnd

Function EnsureInstallDirWritable
    ${If} $INSTDIR == ""
        Return
    ${EndIf}

    ClearErrors
    CreateDirectory "$INSTDIR"
    ${If} ${Errors}
        Call ShowInstallPermissionError
    ${EndIf}

    ; 通过创建临时文件预检查写权限，避免后续落到 NSIS 的内部错误提示
    ClearErrors
    FileOpen $0 "$INSTDIR\.__yakit_write_test__.tmp" w
    ${If} ${Errors}
        Call ShowInstallPermissionError
    ${EndIf}
    FileClose $0
    Delete "$INSTDIR\.__yakit_write_test__.tmp"
FunctionEnd


!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_SHOW DirectoryPageShow
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_PAGE_CUSTOMFUNCTION_SHOW FinishPageShow
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE FinishLeave
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "创建桌面快捷方式"
!define MUI_FINISHPAGE_LINK "Yakit官网"
!define MUI_FINISHPAGE_LINK_LOCATION "https://yaklang.com"
!insertmacro MUI_PAGE_FINISH


Function FinishPageShow
    ${NSD_CreateCheckbox} 120u 130u 9u 9u ""
    Pop $DeleteOldEngine
    ${NSD_CreateLabel} 131u 130u 60% 16u "删除旧引擎"
    Pop $DeleteOldEngineLabel
     SetCtlColors $DeleteOldEngineLabel "0x000000" "TRANSPARENT"
    ${NSD_Check} $DeleteOldEngine
FunctionEnd

Function FinishLeave
    ${NSD_GetState} $mui.FinishPage.Run $0
    ${If} $0 <> 0
    ExecShell "open" "$INSTDIR\$EXE_NAME.exe"
    ${EndIf}
    ${NSD_GetState} $mui.FinishPage.ShowReadme $0
    ${If} $0 <> 0
    CreateShortCut "$DESKTOP\$EXE_NAME.lnk" "$INSTDIR\$EXE_NAME.exe"
    ${EndIf}
    ${NSD_GetState} $DeleteOldEngine $0
    ${If} $0 <> 0
        ; 删除旧引擎代码
        Delete /REBOOTOK $INSTDIR\yakit-projects\yak-engine\*yak-*
    ${EndIf}
    Quit
FunctionEnd



!macro checkInstalled
    ReadRegStr $INSTALL_PATH HKCU "Software\Yakit" $INSTALL_PATH_REG_KEY_NAME
    ${If} $INSTALL_PATH != ""
        ; set install path
        StrCpy $INSTDIR $INSTALL_PATH
    ${EndIf}

    ; 判断是否已安装
    ${If} ${FileExists} `$INSTDIR\$EXE_NAME.exe`
        StrCpy $IS_INSTALLED "true"
    ${EndIf}
    !if "${APP_ID}" == "com.aisenso.desktop"
        ; 旧品牌安装也视为已有安装，避免在原目录下再追加一层目录。
        ${If} ${FileExists} "$INSTDIR\AI SenPike.exe"
            StrCpy $IS_INSTALLED "true"
        ${EndIf}
    !endif
!macroend

!macro checkIsUpdated
    ClearErrors
    ${GetParameters} $0
    ${GetOptions} $0 "--updated" $R0
    ${IfNot} ${Errors} ; 是更新
        StrCpy $IS_UPDATED "true"
    ${EndIf}
!macroend

; 安装与卸载使用打包元数据，不依赖安装包文件名或目录中的旧 EXE。
!macro initProductIdentity
    StrCpy $EXE_NAME "${PRODUCT_FILENAME}"
    !if "${APP_ID}" == "com.aisenso.desktop"
        ; 保留历史键名，升级时继续找到已有目录和 yakit-projects。
        StrCpy $INSTALL_PATH_REG_KEY_NAME "AI SenPike_InstallPath"
    !else if "${PRODUCT_FILENAME}" == "Yakit"
        StrCpy $INSTALL_PATH_REG_KEY_NAME "InstallPath"
    !else if "${PRODUCT_FILENAME}" == "Memfit AI"
        StrCpy $INSTALL_PATH_REG_KEY_NAME "MemfitAI_InstallPath"
    !else
        StrCpy $INSTALL_PATH_REG_KEY_NAME "${PRODUCT_FILENAME}_InstallPath"
    !endif
!macroend

!macro customInit
    !insertmacro initProductIdentity
    !if "${APP_ID}" == "com.aisenso.desktop"
        ; 旧卸载器可能先删除快捷方式，卸载前记住用户已有的桌面入口。
        ${If} ${FileExists} "$DESKTOP\AI SenPike.lnk"
            StrCpy $HAD_SENSO_DESKTOP_SHORTCUT "true"
        ${EndIf}
    !endif
    StrCpy $INSTDIR ""
    !insertmacro checkInstalled
    !insertmacro checkIsUpdated
!macroend

!macro customUnInit
    !insertmacro initProductIdentity
    ; 卸载只操作当前安装目录，不能被历史注册表路径重定向。
    !insertmacro checkIsUpdated
!macroend

!macro migrateSensoDesktopShortcut
    !if "${APP_ID}" == "com.aisenso.desktop"
        ; 仅在旧桌面入口存在时迁移，保留用户此前创建快捷方式的选择。
        ${If} $HAD_SENSO_DESKTOP_SHORTCUT == "true"
        ${OrIf} ${FileExists} "$DESKTOP\AI SenPike.lnk"
            ${If} ${FileExists} "$INSTDIR\$EXE_NAME.exe"
                ClearErrors
                CreateShortCut "$DESKTOP\$EXE_NAME.lnk" "$INSTDIR\$EXE_NAME.exe"
                ${IfNot} ${Errors}
                    Delete "$DESKTOP\AI SenPike.lnk"
                ${EndIf}
            ${EndIf}
        ${EndIf}
    !endif
!macroend


!macro customRemoveFiles
    ${If} $IS_UPDATED == "true"
        Goto continue
    ${EndIf}
    ; 删除安装目录
    MessageBox MB_YESNO "即将删除 $INSTDIR 文件夹，是否继续，选择否将取消卸载" IDYES continue IDNO cancelUninstall
    cancelUninstall:
        Quit
    continue:
    ; 如果保留了yakit-projects文件夹，将其从临时位置移回原始位置
    ${If} $KEEP_FOLDER == "true"
        Push "$INSTDIR"
        Push "yakit-projects"
        Call un.DeleteFoldersWithExclusion

        DELETE "$INSTDIR\$EXE_NAME.exe"
    ${Else}
        RMDir /r "$INSTDIR"
    ${EndIf}
    ; 删除桌面快捷方式
    Delete "$DESKTOP\$EXE_NAME.lnk"
    ; 非更新时才删除以下的东西
    ${If} $IS_UPDATED != "true"
        ; 删除开始菜单快捷方式
        Delete "$SMPROGRAMS\$EXE_NAME\*.*"
        Delete "$SMPROGRAMS\$StartMenuFolder\$EXE_NAME.lnk"
        RMDir "$SMPROGRAMS\$EXE_NAME"


        ; 删除注册表项
        DeleteRegValue HKCU "Software\Yakit" $INSTALL_PATH_REG_KEY_NAME
        DeleteRegValue HKCU "Environment" "YAKIT_HOME"
    ${EndIf}
!macroend

!macro customInstall
    DetailPrint "检查安装目录权限..."
    Call EnsureInstallDirWritable
    !insertmacro migrateSensoDesktopShortcut

    ; 创建 yakit-projects 文件夹
    DetailPrint "创建yakit-projects文件夹..."
    ClearErrors
    CreateDirectory "$INSTDIR\yakit-projects"
    ${If} ${Errors}
        Call ShowInstallPermissionError
    ${EndIf}

    ; Migrate yakit-projects folder
    ${If} "$PROFILE\yakit-projects" != "$INSTDIR\yakit-projects"
    ${AndIf} ${FileExists} "$PROFILE\yakit-projects"
        ClearErrors
        ; 旧版本数据可能包含多层目录和隐藏文件，这里必须递归复制，且不要在安装阶段直接删源目录
        nsExec::Exec '"$SYSDIR\cmd.exe" /C xcopy "$PROFILE\yakit-projects" "$INSTDIR\yakit-projects\\" /E /I /H /K /Y /C >nul 2>&1'
        Pop $0
        ${If} $0 != 0
            DetailPrint "迁移yakit-projects文件夹失败..."
        ${Else}
            DetailPrint "迁移yakit-projects文件夹成功..."
        ${EndIf}
    ${EndIf}

    ; 存储安装目录
    DetailPrint "写入环境变量..."
    WriteRegStr HKCU "Software\Yakit" $INSTALL_PATH_REG_KEY_NAME "$INSTDIR"
    WriteRegStr HKCU "Environment" "YAKIT_HOME" "$INSTDIR\yakit-projects"
    DetailPrint "正在安装..."
!macroend

Section "Main" SectionMain
   ; create new directory if not installed and choose folder is not empty
    ${If} $IS_INSTALLED != "true"
        Push "$INSTDIR"
        Call isEmptyDir
        Pop $0
        ${If} $0 == 0
            StrCpy $INSTDIR "$INSTDIR\$EXE_NAME"
        ${EndIf}
    ${EndIf}

    Call EnsureInstallDirWritable

SectionEnd

Section "Uninstall"
    ${If} $IS_UPDATED == "true"
        Goto keepFolder
    ${EndIf}
    MessageBox MB_YESNO "卸载时是否保留yakit-projects文件夹？" IDYES keepFolder IDNO continueUninstall
 keepFolder:
    StrCpy $KEEP_FOLDER "true"
    ; DetailPrint "保留yakit-projects文件夹..."
    ; SetOutPath $TEMP
    ; CopyFiles /SILENT "$INSTDIR\yakit-projects\*.*" "$TEMP\temp-yakit-projects"
    Goto continueUninstall
 continueUninstall:
SectionEnd


Function un.DeleteFoldersWithExclusion
 Exch $R0 ; exclude dir
 Exch
 Exch $R1 ; route dir
 Push $R2
 Push $R3


  ClearErrors
  FindFirst $R3 $R2 "$R1\*.*"


  Top:
   StrCmp $R2 "." Next
   StrCmp $R2 ".." Next
   StrCmp $R2 $R0 Exit
   IfFileExists "$R1\$R2\*.*" Jump DeleteFile

   Jump:
    Push '$R1\$R2'
    Push '$R0'
    Call un.DeleteFoldersWithExclusion

    Push "$R1\$R2"
    Call un.isEmptyDir
    Pop $0
    StrCmp $0 1 RmD Next

   RmD:
    RMDir /r $R1\$R2
    Goto Next

   DeleteFile:
    Delete '$R1\$R2'

   Next:
    ClearErrors
    FindNext $R3 $R2
    IfErrors Exit
   Goto Top

  Exit:
  FindClose $R3

 Pop $R3
 Pop $R2
 Pop $R1
 Pop $R0

FunctionEnd

Function isEmptyDir
  # Stack ->                    # Stack: <directory>
  Exch $0                       # Stack: $0
  Push $1                       # Stack: $1, $0
  FindFirst $0 $1 "$0\*.*"
  strcmp $1 "." 0 _notempty
    FindNext $0 $1
    strcmp $1 ".." 0 _notempty
      ClearErrors
      FindNext $0 $1
      IfErrors 0 _notempty
        FindClose $0
        Pop $1                  # Stack: $0
        StrCpy $0 1
        Exch $0                 # Stack: 1 (true)
        goto _end
     _notempty:
       FindClose $0
       Pop $1                   # Stack: $0
       StrCpy $0 0
       Exch $0                  # Stack: 0 (false)
  _end:
FunctionEnd


Function un.isEmptyDir
  # Stack ->                    # Stack: <directory>
  Exch $0                       # Stack: $0
  Push $1                       # Stack: $1, $0
  FindFirst $0 $1 "$0\*.*"
  strcmp $1 "." 0 _notempty
    FindNext $0 $1
    strcmp $1 ".." 0 _notempty
      ClearErrors
      FindNext $0 $1
      IfErrors 0 _notempty
        FindClose $0
        Pop $1                  # Stack: $0
        StrCpy $0 1
        Exch $0                 # Stack: 1 (true)
        goto _end
     _notempty:
       FindClose $0
       Pop $1                   # Stack: $0
       StrCpy $0 0
       Exch $0                  # Stack: 0 (false)
  _end:
FunctionEnd
