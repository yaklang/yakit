!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "MUI2.nsh"

Unicode true

Var /Global YAKIT_HOME
Var /Global IS_INSTALLED
Var /Global IS_UPDATED
Var /Global InstallPath

Function DirectoryPageShow
    ; MessageBox MB_OK "DirectoryPageShow"
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
    Exec "$INSTDIR\Yakit.exe"
    ${EndIf}
    ${NSD_GetState} $mui.FinishPage.ShowReadme $0
    ${If} $0 <> 0 
    CreateShortCut "$DESKTOP\Yakit.lnk" "$INSTDIR\Yakit.exe"
    ${EndIf}
    Quit
FunctionEnd

!macro checkInstalled
    ; 判断是否已安装
    ${If} ${FileExists} `$INSTDIR\Yakit.exe`
        StrCpy $IS_INSTALLED "true"
    ${EndIf} 
    ReadRegStr $InstallPath HKCU "Software\Yakit" "InstallPath"
    ${If} $InstallPath != "" 
        ; set install path
        StrCpy $INSTDIR $InstallPath
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
    !insertmacro checkInstalled
    !insertmacro checkIsUpdated
    ReadRegStr $YAKIT_HOME HKCU "Environment" "YAKIT_HOME"
!macroend

!macro customUnInit 
    !insertmacro checkInstalled
    !insertmacro checkIsUpdated
!macroend


!macro customRemoveFiles
    ${If} $IS_UPDATED == "true"
        Goto continue
    ${EndIf}
    !insertmacro checkInstalled
    ; 删除安装目录
    MessageBox MB_YESNO "即将删除 $INSTDIR 文件夹，是否继续，选择否将取消卸载" IDYES continue IDNO cancelUninstall
    cancelUninstall:
        Quit
    continue:
    RMDir /r "$INSTDIR"
    ; 如果保留了yakit-projects文件夹，将其从临时位置移回原始位置
    ${If} ${FileExists} `$TEMP\temp-yakit-projects\*.*`
        CreateDirectory "$INSTDIR"
        CopyFiles /SILENT "$TEMP\temp-yakit-projects\*.*" "$INSTDIR\yakit-projects"
        RMDir /r "$TEMP\temp-yakit-projects"
    ${EndIf}
    
    ; 非更新时才删除以下的东西
    ${If} $IS_UPDATED != "true"
        ; 删除开始菜单快捷方式
        Delete "$SMPROGRAMS\Yakit\*.*"
        Delete "$SMPROGRAMS\$StartMenuFolder\Yakit.lnk"
        RMDir "$SMPROGRAMS\Yakit"

        ; 删除桌面快捷方式
        Delete "$DESKTOP\Yakit.lnk"

        ; 删除注册表项
        DeleteRegKey HKCU "Software\Yakit"
        DeleteRegValue HKCU "Environment" "YAKIT_HOME"
    ${EndIf}
!macroend

!macro customInstall 
    
!macroend

Section "Main" SectionMain
    ; create new directory if not installed 
    ${If} $IS_INSTALLED != "true"
    ${OrIf} $InstallPath == ""
        StrCpy $INSTDIR "$INSTDIR\yakit"
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
    WriteRegStr HKCU "Software\Yakit" "InstallPath" "$INSTDIR"
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
    DetailPrint "保留yakit-projects文件夹..."
    SetOutPath $TEMP
    CopyFiles /SILENT "$INSTDIR\yakit-projects\*.*" "$TEMP\temp-yakit-projects"
    Goto continueUninstall
 continueUninstall:

SectionEnd

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
       ClearErrors
       Pop $1                   # Stack: $0
       StrCpy $0 0
       Exch $0                  # Stack: 0 (false)
  _end:
FunctionEnd