!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "MUI2.nsh"

Unicode true

Var /Global YAKIT_HOME
Var /Global IS_INSTALLED
Var /Global IS_UPDATED

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

!macro customWelcomePage
    !insertmacro MUI_PAGE_WELCOME
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW DirectoryPageShow
    !insertmacro MUI_PAGE_DIRECTORY
    !insertmacro MUI_PAGE_INSTFILES
    !define MUI_PAGE_CUSTOMFUNCTION_LEAVE ForceQuit
    !insertmacro MUI_PAGE_FINISH
!macroend

!macro checkInstalled
    ; 判断是否已安装
    ${If} ${FileExists} `$INSTDIR\Yakit.exe`
        StrCpy $IS_INSTALLED "true"
    ${EndIf} 
!macroend

!macro customInit 
    ; Read the YAKIT_HOME environment variable from the registry, set Install directory
    ReadRegStr $YAKIT_HOME HKCU "Environment" "YAKIT_HOME"
    ${If} $YAKIT_HOME != ""
        ${GetParent} "$YAKIT_HOME" $INSTDIR
    ${EndIf}
    ; Set Migrate yakit-projects folder
    ${If} $YAKIT_HOME == ""
        StrCpy $YAKIT_HOME "$PROFILE\yakit-projects"
    ${EndIf}

    !insertmacro checkInstalled
!macroend

!macro customUnInit 
    !insertmacro checkInstalled
!macroend


!macro customRemoveFiles
    ; 删除安装目录
    RMDir /r "$INSTDIR"
    ; 如果保留了yakit-projects文件夹，将其从临时位置移回原始位置
    ${If} ${FileExists} `$TEMP\temp-yakit-projects\*.*`
        CreateDirectory "$INSTDIR"
        CopyFiles /SILENT "$TEMP\temp-yakit-projects\*.*" "$INSTDIR\yakit-projects"
        RMDir /r "$TEMP\temp-yakit-projects"
    ${EndIf}
    
    ; 删除开始菜单快捷方式
    Delete "$SMPROGRAMS\Yakit\*.*"
    Delete "$SMPROGRAMS\$StartMenuFolder\Yakit.lnk"
    RMDir "$SMPROGRAMS\Yakit"

    ; 删除桌面快捷方式
    Delete "$DESKTOP\Yakit.lnk"

    ; 删除注册表项
    DeleteRegKey HKCU "Software\Yakit"
    DeleteRegValue HKCU "Environment" "YAKIT_HOME"

!macroend

Section "Main" SectionMain
    ; Migrate yakit-projects folder
    ${If} $YAKIT_HOME != "" 
    ${AndIf} $YAKIT_HOME != "$InstDir\yakit-projects"
    ${AndIf} ${FileExists} "$YAKIT_HOME"
        ClearErrors
        CopyFiles /Silent $YAKIT_HOME "$INSTDIR\yakit-projects"
        ${If} ${Errors} 
            DetailPrint "迁移yakit-projects文件夹失败..."
        ${Else}
            RMDir /R $YAKIT_HOME
            DetailPrint "删除旧的yakit-projects文件夹..."
        ${EndIf} 
    ${EndIf}

    DetailPrint "写入环境变量..."
    WriteRegStr HKCU "Environment" "YAKIT_HOME" "$INSTDIR\yakit-projects" 
    DetailPrint "正在安装..."
SectionEnd

Section "Uninstall"
    ClearErrors
    ${GetParameters} $0
    ${GetOptions} $0 "--updated" $R0
    ${IfNot} ${Errors} ; 是更新，不卸载yakit-projects文件夹
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