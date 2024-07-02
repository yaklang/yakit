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
Var /Global KEEP_FOLDER


Function ShouldShowDirectoryPage
    ${If} $INSTALL_PATH != ""
        Abort
    ${EndIf}
FunctionEnd

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


!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_PRE ShouldShowDirectoryPage
!define MUI_PAGE_CUSTOMFUNCTION_SHOW DirectoryPageShow
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE FinishLeave
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_SHOWREADME
!define MUI_FINISHPAGE_SHOWREADME_TEXT "创建桌面快捷方式"
!define MUI_FINISHPAGE_LINK "Yakit官网"
!define MUI_FINISHPAGE_LINK_LOCATION "https://yaklang.com"
!insertmacro MUI_PAGE_FINISH

Function FinishLeave 
    ${NSD_GetState} $mui.FinishPage.Run $0
    ${If} $0 <> 0 
    Exec "$INSTDIR\$EXE_NAME.exe"
    ${EndIf}
    ${NSD_GetState} $mui.FinishPage.ShowReadme $0
    ${If} $0 <> 0 
    CreateShortCut "$DESKTOP\$EXE_NAME.lnk" "$INSTDIR\$EXE_NAME.exe"
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
!macroend

!macro checkIsUpdated
    ClearErrors
    ${GetParameters} $0
    ${GetOptions} $0 "--updated" $R0
    ${IfNot} ${Errors} ; 是更新 
        StrCpy $IS_UPDATED "true"
    ${EndIf}
!macroend

!macro customInit 
    ; 根据不同版本设置不同的RegKey 社区版/SE/EE
    StrCpy $INSTALL_PATH_REG_KEY_NAME "InstallPath"
    StrCpy $EXE_NAME "Yakit"
    ${StrStr} $0 $EXEFILE "EnpriTraceAgent"
    ${If} $0 != "" ; se
        StrCpy $INSTALL_PATH_REG_KEY_NAME "EnpriTraceAgent_InstallPath"
        StrCpy $EXE_NAME "EnpriTraceAgent"
    ${Else}
        ${StrStr} $0 $EXEFILE "EnpriTrace"
        ${If} $0 != "" ; ee
            StrCpy $INSTALL_PATH_REG_KEY_NAME "EnpriTrace_InstallPath"
            StrCpy $EXE_NAME "EnpriTrace"
        ${Else}
            ${StrStr} $0 $EXEFILE "单兵武器装备库"
            ${If} $0 != "" ; ee
                StrCpy $INSTALL_PATH_REG_KEY_NAME "Dianxin_InstallPath"
                StrCpy $EXE_NAME "单兵武器装备库"
            ${EndIf}
        ${EndIf}
    ${EndIf}

    ; 设置用户一开始的安装路径
    StrCpy $INSTDIR ""
    
    !insertmacro checkInstalled
    !insertmacro checkIsUpdated
!macroend

!macro customUnInit 
    ; 根据不同版本设置不同的RegKey 社区版/SE/EE
    StrCpy $INSTALL_PATH_REG_KEY_NAME "InstallPath"
    StrCpy $EXE_NAME "Yakit"
    ${If} ${FileExists} `$INSTDIR\EnpriTraceAgent.exe` ; se 
        StrCpy $INSTALL_PATH_REG_KEY_NAME "EnpriTraceAgent_InstallPath"
        StrCpy $EXE_NAME "EnpriTraceAgent"
    ${ElseIf} ${FileExists} `$INSTDIR\EnpriTrace.exe` ; ee 
            StrCpy $INSTALL_PATH_REG_KEY_NAME "EnpriTrace_InstallPath"
            StrCpy $EXE_NAME "EnpriTrace"
    ${ElseIf} ${FileExists} `$INSTDIR\单兵武器装备库.exe` ; dianxin 
            StrCpy $INSTALL_PATH_REG_KEY_NAME "Dianxin_InstallPath"
            StrCpy $EXE_NAME "单兵武器装备库"
    ${EndIf}

    !insertmacro checkInstalled
    !insertmacro checkIsUpdated
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
    
!macroend

Section "Main" SectionMain
    ; create new directory if not installed 
    ${If} $IS_INSTALLED != "true"
        StrCpy $INSTDIR "$INSTDIR\$EXE_NAME"
        CreateDirectory $INSTDIR
    ${EndIf}

    ; Migrate yakit-projects folder
    ${If} "$PROFILE\yakit-projects" != "$INSTDIR\yakit-projects"
    ${AndIf} ${FileExists} "$PROFILE\yakit-projects"
        ClearErrors
        CopyFiles $PROFILE\yakit-projects "$INSTDIR\yakit-projects"
        ${If} ${Errors} 
            DetailPrint "迁移yakit-projects文件夹失败..."
        ${Else}
            RMDir /R $PROFILE\yakit-projects
            DetailPrint "删除旧的yakit-projects文件夹..."
        ${EndIf} 
    ${EndIf}

    ; 存储安装目录
    DetailPrint "写入环境变量..."
    WriteRegStr HKCU "Software\Yakit" $INSTALL_PATH_REG_KEY_NAME "$INSTDIR"
    WriteRegStr HKCU "Environment" "YAKIT_HOME" "$INSTDIR\yakit-projects" 
    ; 创建 yakit-projects 文件夹
    DetailPrint "创建yakit-projects文件夹..."
    CreateDirectory "$INSTDIR\yakit-projects"
    DetailPrint "正在安装..."
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