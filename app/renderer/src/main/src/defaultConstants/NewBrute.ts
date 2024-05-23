import {BruteExecuteExtraFormValue, StartBruteParams} from "@/pages/securityTool/newBrute/NewBruteType"
import {BrutePageInfoProps} from "@/store/pageInfo"

export const defaultBruteExecuteExtraFormValue: BruteExecuteExtraFormValue = {
    Concurrent: 50,
    DelayMax: 5,
    DelayMin: 1,
    OkToStop: true,
    PasswordFile: "",
    Passwords: [],
    PasswordsDict: [],
    ReplaceDefaultPasswordDict: false,
    PluginScriptName: "",
    Prefix: "",
    TargetFile: "",
    TargetTaskConcurrent: 1,
    Targets: "",
    Type: "",
    UsernameFile: "",
    Usernames: [],
    UsernamesDict: [],
    ReplaceDefaultUsernameDict: false,
    // 前端展示使用  ------start
    usernames: "",
    passwords: "",
    replaceDefaultPasswordDict: true,
    replaceDefaultUsernameDict: true
    // 前端展示使用  ------end
}

export const defaultBrutePageInfo: BrutePageInfoProps = {
    targets: ""
}

export const defaultStartBruteParams: StartBruteParams = {
    Concurrent: 50,
    DelayMax: 5,
    DelayMin: 1,
    OkToStop: true,
    PasswordFile: "",
    Passwords: [],
    PasswordsDict: [],
    ReplaceDefaultPasswordDict: false,
    PluginScriptName: "",
    Prefix: "",
    TargetFile: "",
    TargetTaskConcurrent: 1,
    Targets: "",
    Type: "",
    UsernameFile: "",
    Usernames: [],
    UsernamesDict: [],
    ReplaceDefaultUsernameDict: false,

    usernameValue: "",
    passwordValue: ""
}
