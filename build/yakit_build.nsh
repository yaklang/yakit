!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "MUI2.nsh"

Unicode true
!define MUI_DIRECTORYPAGE_TEXT_TOP "将 Yakit 安装到指定的文件夹。 !!! 安装程序会自动迁移 yakit-projects 文件夹 !!!"

Var YAKIT_HOME


!macro customInit 
    ; Read the YAKIT_HOME environment variable from the registry, set Install directory
    ReadRegStr $YAKIT_HOME HKCU "Environment" "YAKIT_HOME"
    ${If} $YAKIT_HOME != ""
        ${GetParent} "$YAKIT_HOME" $InstDir
    ${EndIf}
    ; Set Migrate yakit-projects folder
    ${If} $YAKIT_HOME == ""
        StrCpy $YAKIT_HOME "$PROFILE\yakit-projects"
    ${EndIf}
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
 MessageBox MB_YESNOCANCEL|MB_ICONQUESTION "是否保留yakit-projects文件夹？" IDYES keepFolder IDNO deleteFolder
    Quit
 keepFolder:
    DetailPrint "保留yakit-projects文件夹..."
    SetOutPath $TEMP
    CopyFiles /SILENT "$INSTDIR\yakit-projects\*.*" "$TEMP\temp-yakit-projects"
    Goto continueUninstall
 deleteFolder:
    Goto continueUninstall
 continueUninstall:
    ; 删除安装目录
    RMDir /r "$INSTDIR"
    ; 如果保留了yakit-projects文件夹，将其从临时位置移回原始位置
    StrCmp $TEMP\yakit-projects "" 0 moveBack
    moveBack:
        CreateDirectory "$INSTDIR"
        CopyFiles /SILENT "$TEMP\temp-yakit-projects\*.*" "$INSTDIR\yakit-projects"
        RMDir /r "$TEMP\temp-yakit-projects"
    
    ; 删除开始菜单快捷方式
    Delete "$SMPROGRAMS\Yakit\*.*"
    Delete "$SMPROGRAMS\$StartMenuFolder\Yakit.lnk"
    RMDir "$SMPROGRAMS\Yakit"

    ; 删除桌面快捷方式
    Delete "$DESKTOP\Yakit.lnk"

    ; 删除注册表项
    DeleteRegKey HKCU "Software\Yakit"
    DeleteRegValue HKCU "Environment" "YAKIT_HOME"
SectionEnd