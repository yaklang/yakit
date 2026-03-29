import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Modal, Tooltip, Avatar, Form, Divider} from "antd"
import {
    RiskStateSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon
} from "./icons"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useCreation, useMemoizedFn, useUpdateEffect} from "ahooks"
import {showModal} from "@/utils/showModal"
import {failed, info, success, yakitFailed, warn, yakitNotify} from "@/utils/notification"
import {ConfigPrivateDomain} from "../ConfigPrivateDomain/ConfigPrivateDomain"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitSettingCallbackType, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import Login from "@/pages/Login"
import {useEeSystemConfig, useStore, yakitDynamicStatus} from "@/store"
import {defaultUserInfo, SetUserInfo} from "@/pages/MainOperator"
import {loginOut} from "@/utils/login"
import {UserPlatformType} from "@/pages/globalVariable"
import SetPassword from "@/pages/SetPassword"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps, YakitMenuItemType} from "../yakitUI/YakitMenu/YakitMenu"
import {
    getReleaseEditionName,
    getRemoteI18nGV,
    isCommunityEdition,
    isCommunityYakit,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnpriTraceIRify,
    isIRify,
    showDevTool
} from "@/utils/envfile"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {LocalGV} from "@/yakitGV"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {showPcapPermission} from "@/utils/ConfigPcapPermission"
import {GithubSvgIcon, TerminalIcon} from "@/assets/newIcon"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {addToTab} from "@/pages/MainTabs"
import {DatabaseUpdateModal} from "@/pages/cve/CVETable"
import {ExclamationCircleOutlined, LoadingOutlined} from "@ant-design/icons"
import {DynamicControl, SelectControlType, ControlMyself, ControlOther} from "../../pages/dynamicControl/DynamicControl"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {WinKeyborad} from "../yakitUI/YakitEditor/editorUtils"
import {ScrecorderModal} from "@/pages/screenRecorder/ScrecorderModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitRoute} from "@/enums/yakitRoute"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {useRunNodeStore} from "@/store/runNode"
import emiter from "@/utils/eventBus/eventBus"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {visitorsStatisticsFun} from "@/utils/visitorsStatistics"
import {serverPushStatus} from "@/utils/duplex/duplex"
import {OutlinePencilaltIcon, OutlineSearchIcon, OutlineWrenchIcon} from "@/assets/icon/outline"
import {YakitEmpty} from "../yakitUI/YakitEmpty/YakitEmpty"
import {DebugPluginRequest, apiDebugPlugin} from "@/pages/plugins/utils"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {PerformanceSamplingLog, usePerformanceSampling} from "@/store/performanceSampling"
import {
    isShowCodeScanDetail,
    YakitCodeScanRiskDetails,
    YakitRiskDetails
} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {
    ExecuteEnterNodeByPluginParams,
    PluginExecuteProgress
} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {getValueByType, getYakExecutorParam} from "@/pages/plugins/editDetails/utils"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import {YakitDropdownMenu} from "../yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {
    grpcFetchIntranetYakitVersion,
    grpcFetchLatestYakitVersion,
    grpcFetchLatestYakVersion,
    grpcFetchLocalYakitVersion,
    grpcFetchLocalYakVersion
} from "@/apiUtils/grpc"
import {WebsiteGV} from "@/enums/website"

import YakitLogo from "@/assets/yakitLogo.png"
import yakitImg from "../../assets/yakit.jpg"
import classNames from "classnames"
import styles from "./funcDomain.module.scss"
import {
    MessageCenter,
    TaskErrNotification,
    TaskNotification,
    useEETaskNotificationHook
} from "../MessageCenter/MessageCenter"
import {apiFetchMessageRead, apiFetchQueryMessage} from "../MessageCenter/utils"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {randomString} from "@/utils/randomUtil"
import {ExpandAndRetractExcessiveState} from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract"
import {PluginExecuteResult} from "@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {
    apiNewRiskRead,
    apiQueryNewSSARisks,
    apiQuerySSARisks
} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/utils"
import {QueryNewSSARisksResponse, SSARisk} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTableType"
import {YakitAuditRiskDetails} from "@/pages/yakRunnerAuditHole/YakitAuditHoleTable/YakitAuditHoleTable"
import SelectUpload from "@/pages/SelectUpload"
import {ShortcutKeyPageName} from "@/utils/globalShortcutKey/events/pageMaps"
import useMcpStream, {mcpStreamHooks} from "./hooks/useMcp/useMcp"
import {ConfigMcpModal} from "@/utils/ConfigSystemMcp"
import {useCampare} from "@/hook/useCompare/useCompare"
import {openConsoleNewWindow} from "@/utils/openWebsite"
import useEngineConsole from "./hooks/useEngineConsole/useEngineConsole"
import {useTheme} from "@/hook/useTheme"
import {grpcOpenEngineLogFolder, grpcOpenPrintLogFolder, grpcOpenRenderLogFolder} from "@/utils/logCollection"
import {useDownloadYakit} from "./update/DownloadYakit"
import {JSONParseLog} from "@/utils/tool"
import {useSoftMode, YakitModeEnum} from "@/store/softMode"
import {getAllYakitColorVars} from "@/utils/monacoSpec/theme"
import {SystemInfo} from "@/constants/hardware"
import {TFunction, useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {cloneDeep} from "lodash"

const {ipcRenderer} = window.require("electron")

const removePrefixV = (version: string) => {
    return version.startsWith("v") ? version.substring(1) : version
}

const judgeDynamic = (userInfo, avatarColor: string, active: boolean, dynamicConnect: boolean, t: TFunction) => {
    const {companyHeadImg, companyName} = userInfo
    // 点击且已被远程控制
    const activeConnect: boolean = active && dynamicConnect
    return (
        <div
            className={classNames(styles["judge-avatar"], {
                [styles["judge-avatar-active"]]: activeConnect,
                [styles["judge-avatar-connect"]]: dynamicConnect
            })}
        >
            <div>
                {companyHeadImg && !!companyHeadImg.length ? (
                    <Avatar size={20} style={{cursor: "pointer"}} src={companyHeadImg} />
                ) : (
                    <Avatar
                        size={20}
                        style={activeConnect ? {} : {backgroundColor: avatarColor}}
                        className={classNames(styles["judge-avatar-avatar"], {
                            [styles["judge-avatar-active-avatar"]]: activeConnect
                        })}
                    >
                        {companyName && companyName.slice(0, 1)}
                    </Avatar>
                )}
            </div>
            {dynamicConnect && (
                <div
                    className={classNames(styles["judge-avatar-text"], {[styles["judge-avatar-active-text"]]: active})}
                >
                    {t("FuncDomain.remoteInProgress")}
                </div>
            )}
        </div>
    )
}

/** 随机头像颜色 */
export const randomAvatarColor = () => {
    // const colorArr: string[] = ["#8863F7", "#DA5FDD", "#4A94F8", "#35D8EE", "#56C991", "#F4736B", "#FFB660", "#B4BBCA"]
    const vars = getAllYakitColorVars()
    const var_color_list = [
        "--Colors-Use-Purple-Primary",
        "--Colors-Use-Magenta-Primary",
        "--Colors-Use-Blue-Primary",
        "--Colors-Use-Cyan-Primary",
        "--Colors-Use-Green-Primary",
        "--Colors-Use-Red-Primary",
        "--Colors-Use-Orange-Primary",
        "--Colors-Use-Grey-Primary"
    ]

    const colorArr: string[] = var_color_list.map((it) => vars[it])
    let color: string = colorArr[Math.round(Math.random() * 7)]
    return color
}

/** 用户菜单 */
const UserMenusMap: Record<string, YakitMenuItemType> = {
    divider: {type: "divider"},
    singOut: {key: "sign-out", label: "FuncDomain.signOut", type: "danger"},
    pluginAudit: {key: "plugin-audit", label: "FuncDomain.pluginAudit"},
    misstatement: {key: "misstatement", label: "FuncDomain.misstatement"},
    // CE
    trustList: {key: "trust-list", label: "FuncDomain.trustList"},
    licenseAdmin: {key: "license-admin", label: "FuncDomain.licenseAdmin"},
    dataStatistics: {key: "data-statistics", label: "FuncDomain.dataStatistics"},
    // EE|SE
    roleAdmin: {key: "role-admin", label: "FuncDomain.roleAdmin"},
    accountAdmin: {key: "account-admin", label: "FuncDomain.accountAdmin"},
    setPassword: {key: "set-password", label: "Main.setPassword"},
    uploadData: {key: "upload-data", label: "FuncDomain.uploadData"},
    controlAdmin: {key: "control-admin", label: "FuncDomain.controlAdmin"},
    dynamicControl: {key: "dynamic-control", label: "FuncDomain.dynamicControl"},
    closeDynamicControl: {key: "close-dynamic-control", label: "FuncDomain.closeDynamicControl"},
    holeCollect: {key: "hole-collect", label: "FuncDomain.holeCollect"},
    systemConfig: {key: "system-config", label: "FuncDomain.systemConfig"}
}

export interface FuncDomainProp {
    isEngineLink: boolean
    isReverse?: Boolean
    engineMode: YaklangEngineMode
    isRemoteMode: boolean
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
    /** 远程控制 - 自动切换远程连接 */
    runDynamicControlRemote: (v: string, url: string) => void
    /** 当前是否验证License/登录 */
    isJudgeLicense: boolean

    /** @name 当前是否展示项目管理页面 */
    showProjectManage?: boolean
    /** @name 操作系统类型 */
    system: YakitSystem

    onDevToolRefresh: () => void
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {t, i18n} = useI18nNamespaces(["layout", "yakitUi"])
    const {
        isEngineLink,
        isReverse = false,
        engineMode,
        isRemoteMode,
        onEngineModeChange,
        runDynamicControlRemote,
        typeCallback,
        showProjectManage = false,
        system,
        isJudgeLicense,
        onDevToolRefresh
    } = props

    /** 登录用户信息 */
    const {userInfo, setStoreUserInfo} = useStore()

    const [loginShow, setLoginShow] = useState<boolean>(false)
    /** 用户功能菜单 */
    const [userMenu, setUserMenu] = useState<YakitMenuItemType[]>([UserMenusMap["singOut"]])

    /** 修改密码弹框 */
    const [passwordShow, setPasswordShow] = useState<boolean>(false)
    /** 是否允许密码框关闭 */
    const [passwordClose, setPasswordClose] = useState<boolean>(true)
    /** 上传数据弹框 */
    const [uploadModalShow, setUploadModalShow] = useState<boolean>(false)

    /** 发起远程弹框 受控端 - 控制端 */
    const [dynamicControlModal, setDynamicControlModal] = useState<boolean>(false)
    const [controlMyselfModal, setControlMyselfModal] = useState<boolean>(false)
    const [controlOtherModal, setControlOtherModal] = useState<boolean>(false)
    const [dynamicMenuOpen, setDynamicMenuOpen] = useState<boolean>(false)
    /** 当前远程连接状态 */
    const {dynamicStatus} = yakitDynamicStatus()
    const [dynamicConnect] = useState<boolean>(dynamicStatus.isDynamicStatus)
    let avatarColor = useRef<string>(randomAvatarColor())

    useEffect(() => {
        const SetUserInfoModule = () => (
            <SetUserInfo userInfo={userInfo} avatarColor={avatarColor.current} setStoreUserInfo={setStoreUserInfo} />
        )

        // 退出菜单
        const signOutMenu: YakitMenuItemType[] = [UserMenusMap["divider"], UserMenusMap["singOut"]]
        // 用户头像
        const userAvatar: YakitMenuItemType[] = [
            {key: "user-info", label: SetUserInfoModule(), noStyle: true},
            UserMenusMap["divider"]
        ]

        // CE 版本
        if (userInfo.platform !== "company") {
            let isNew: boolean = false
            // CE-超管
            if (userInfo.role === "superAdmin") {
                isNew = true
                let cacheMenus: YakitMenuItemType[] = [
                    UserMenusMap["trustList"],
                    UserMenusMap["licenseAdmin"],
                    UserMenusMap["pluginAudit"],
                    UserMenusMap["dataStatistics"],
                    UserMenusMap["misstatement"]
                ].concat(signOutMenu)
                if (isIRify()) {
                    cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "plugin-audit")
                }
                setUserMenu(cacheMenus)
            }
            // CE-管理员
            if (userInfo.role === "admin") {
                isNew = true
                let cacheMenus: YakitMenuItemType[] = [
                    UserMenusMap["pluginAudit"],
                    UserMenusMap["dataStatistics"],
                    UserMenusMap["misstatement"]
                ].concat(signOutMenu)
                // IRify 版本时管理员不显示插件管理
                if (isIRify()) {
                    cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "plugin-audit")
                }
                setUserMenu(cacheMenus)
            }
            // CE-操作员
            if (userInfo.role === "operate") {
                isNew = true
                setUserMenu([UserMenusMap["dataStatistics"]].concat(signOutMenu))
            }
            // CE-license管理员
            if (userInfo.role === "licenseAdmin") {
                isNew = true
                setUserMenu([UserMenusMap["licenseAdmin"]].concat(signOutMenu))
            }
            // CE-审核员
            if (userInfo.role === "auditor") {
                isNew = true
                let cacheMenus: YakitMenuItemType[] = [
                    UserMenusMap["pluginAudit"],
                    UserMenusMap["misstatement"]
                ].concat(signOutMenu)
                // IRify 版本时管理员不显示插件管理
                if (isIRify()) {
                    cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "plugin-audit")
                }
                setUserMenu(cacheMenus)
            }
            // CE-非权限人员
            if (!isNew) {
                setUserMenu([UserMenusMap["singOut"]])
            }
        } else {
            // EE|SE 版本
            if (userInfo.role === "admin") {
                // 管理员
                if (isEnpriTraceAgent()) {
                    setUserMenu([
                        ...userAvatar,
                        UserMenusMap["holeCollect"],
                        UserMenusMap["roleAdmin"],
                        UserMenusMap["accountAdmin"],
                        UserMenusMap["setPassword"],
                        UserMenusMap["pluginAudit"],
                        ...signOutMenu
                    ])
                } else {
                    let cacheMenus: YakitMenuItemType[] = [
                        ...userAvatar,
                        UserMenusMap["uploadData"],
                        UserMenusMap["dynamicControl"],
                        UserMenusMap["controlAdmin"],
                        UserMenusMap["closeDynamicControl"],
                        UserMenusMap["roleAdmin"],
                        UserMenusMap["accountAdmin"],
                        UserMenusMap["setPassword"],
                        UserMenusMap["pluginAudit"],
                        UserMenusMap["misstatement"],
                        UserMenusMap["systemConfig"],
                        ...signOutMenu
                    ]
                    // 仅在 IRify 企业版本时显示系统配置
                    if (!isEnpriTraceIRify()) {
                        cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "system-config")
                    }
                    if (dynamicConnect) {
                        // 远程中时不显示发起远程 显示退出远程
                        cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "dynamic-control")
                    } else {
                        // 非远程控制时显示发起远程 不显示退出远程
                        cacheMenus = cacheMenus.filter(
                            (item) => (item as YakitMenuItemProps).key !== "close-dynamic-control"
                        )
                    }
                    // IRify 版本时管理员不显示插件管理
                    if (isIRify()) {
                        cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "plugin-audit")
                    }
                    setUserMenu([...cacheMenus])
                }
            } else {
                let isNew: boolean = false
                let cacheMenus: YakitMenuItemType[] = [
                    ...userAvatar,
                    UserMenusMap["uploadData"],
                    UserMenusMap["dynamicControl"],
                    UserMenusMap["closeDynamicControl"],
                    UserMenusMap["setPassword"],
                    UserMenusMap["pluginAudit"],
                    UserMenusMap["misstatement"],
                    ...signOutMenu
                ]
                if (userInfo.role !== "auditor") {
                    // 不为审核员时 移除插件管理
                    isNew = true
                    cacheMenus = cacheMenus.filter(
                        (item) => !["plugin-audit"].includes((item as YakitMenuItemProps).key)
                    )
                }

                // 不为审核员或超级管理员时 移除误报记录
                if (!["superAdmin", "auditor"].includes(userInfo.role || "")) {
                    isNew = true
                    cacheMenus = cacheMenus.filter(
                        (item) => !["misstatement"].includes((item as YakitMenuItemProps).key)
                    )
                }

                if (isEnpriTraceAgent()) {
                    isNew = true
                    cacheMenus = cacheMenus.filter(
                        (item) => !["upload-data", "misstatement"].includes((item as YakitMenuItemProps).key)
                    )
                }
                // 远程中时不显示发起远程 显示退出远程
                if (dynamicConnect) {
                    isNew = true
                    cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== "dynamic-control")
                }
                // 非远程控制时显示发起远程 不显示退出远程
                if (!dynamicConnect) {
                    isNew = true
                    cacheMenus = cacheMenus.filter(
                        (item) => (item as YakitMenuItemProps).key !== "close-dynamic-control"
                    )
                }

                if (isNew) {
                    setUserMenu([...cacheMenus])
                } else {
                    // 非权限人员
                    setUserMenu([UserMenusMap["singOut"]])
                }
            }
        }
    }, [userInfo.role, userInfo.platform, userInfo.companyHeadImg, dynamicConnect])

    /** 渲染端通信-打开一个指定页面 */
    const onOpenPage = useMemoizedFn((info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    })

    const {screenRecorderInfo, setRecording} = useScreenRecorder()
    useEffect(() => {
        ipcRenderer.on(`${screenRecorderInfo.token}-data`, async (e, data) => {})
        ipcRenderer.on(`${screenRecorderInfo.token}-error`, (e, error) => {
            setRecording(false)
        })
        ipcRenderer.on(`${screenRecorderInfo.token}-end`, (e, data) => {
            setRecording(false)
        })
        return () => {
            setRecording(false)
            ipcRenderer.invoke("cancel-StartScrecorder", screenRecorderInfo.token)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-data`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-error`)
            ipcRenderer.removeAllListeners(`${screenRecorderInfo.token}-end`)
        }
    }, [screenRecorderInfo.token])
    useEffect(() => {
        ipcRenderer.on("open-screenCap-modal", async (e) => {
            openScreenRecorder()
        })
        return () => {
            ipcRenderer.removeAllListeners("open-screenCap-modal")
        }
    }, [])

    const openScreenRecorder = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsScrecorderReady", {})
            .then((data: {Ok: boolean; Reason: string}) => {
                if (data.Ok) {
                    const m = showYakitModal({
                        title: t("FuncDomain.screenRecordingNotice"),
                        footer: null,
                        type: "white",
                        width: 520,
                        content: (
                            <ScrecorderModal
                                onClose={() => {
                                    m.destroy()
                                }}
                                token={screenRecorderInfo.token}
                                onStartCallback={() => {
                                    setRecording(true)
                                    m.destroy()
                                }}
                            />
                        )
                    })
                } else {
                    addToTab("**screen-recorder")
                }
            })
            .catch((err) => {
                yakitFailed(t("FuncDomain.isScrecorderReadyFailed", {error: err}))
            })
    })

    useEffect(() => {
        // ipc通信退出登录
        ipcRenderer.on("ipc-sign-out-callback", async (e) => {
            setStoreUserInfo(defaultUserInfo)
            loginOut(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("ipc-sign-out-callback")
        }
    }, [])

    useEffect(() => {
        // 强制修改密码
        ipcRenderer.on("reset-password-callback", async (e) => {
            setPasswordShow(true)
            setPasswordClose(false)
        })
        return () => {
            ipcRenderer.removeAllListeners("reset-password-callback")
        }
    }, [])

    // mcp 全局监听
    const [mcpStreamInfo, mcpStreamEvent] = useMcpStream({})

    // 引擎日志 全局监听
    useEngineConsole({})

    const onCloseControlMyselfModal = useMemoizedFn(() => {
        setControlMyselfModal(false)
    })
    useEffect(() => {
        emiter.on("onCloseControlMyselfModal", onCloseControlMyselfModal)
        return () => {
            emiter.off("onCloseControlMyselfModal", onCloseControlMyselfModal)
        }
    }, [])

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classNames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                {showDevTool() && <UIDevTool onDevToolRefresh={onDevToolRefresh} />}

                <ScreenAndScreenshot
                    system={system}
                    token={screenRecorderInfo.token}
                    isRecording={screenRecorderInfo.isRecording}
                />

                {!showProjectManage && (
                    <div className={styles["ui-op-btn-wrapper"]} onClick={openConsoleNewWindow}>
                        <div className={styles["op-btn-body"]}>
                            <Tooltip placement='bottom' title={t("FuncDomain.engineConsole")}>
                                <TerminalIcon className={classNames(styles["icon-style"], styles["size-style"])} />
                            </Tooltip>
                        </div>
                    </div>
                )}

                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    {!showProjectManage && !isIRify() && <UIOpRisk isEngineLink={isEngineLink} />}
                    {!showProjectManage && isIRify() && <UIOpIRifyRisk isEngineLink={isEngineLink} />}
                    {!isEnpriTraceAgent() && (
                        <UIOpNotice
                            isEngineLink={isEngineLink}
                            isRemoteMode={isRemoteMode}
                            onLogin={() => setLoginShow(true)}
                        />
                    )}
                    {!showProjectManage && (
                        <UIOpSetting
                            engineMode={engineMode}
                            onEngineModeChange={onEngineModeChange}
                            typeCallback={typeCallback}
                            mcp={{
                                mcpStreamInfo,
                                mcpStreamEvent
                            }}
                        />
                    )}
                </div>
                {!showProjectManage && !isJudgeLicense && (
                    <>
                        <div className={styles["divider-wrapper"]}></div>
                        <div
                            className={classNames(styles["user-wrapper"], {
                                [styles["user-wrapper-dynamic"]]: dynamicConnect
                            })}
                        >
                            {userInfo.isLogin ? (
                                <div
                                    className={classNames({
                                        [styles["user-info"]]: !dynamicConnect,
                                        [styles["user-info-dynamic"]]: dynamicConnect
                                    })}
                                >
                                    <YakitDropdownMenu
                                        key={i18n.language}
                                        menu={{
                                            data: userMenu.map((item) => {
                                                const obj = cloneDeep(item)
                                                // @ts-ignore
                                                if (obj?.label && typeof obj.label === "string") {
                                                    // @ts-ignore
                                                    obj.label = t(obj.label)
                                                }
                                                return obj
                                            }),
                                            onClick: (e) => {
                                                const {key} = e
                                                setDynamicMenuOpen(false)
                                                if (key === "sign-out") {
                                                    if (
                                                        dynamicStatus.isDynamicStatus ||
                                                        dynamicStatus.isDynamicSelfStatus
                                                    ) {
                                                        Modal.confirm({
                                                            title: t("YakitModal.friendlyReminder"),
                                                            icon: <ExclamationCircleOutlined />,
                                                            content: t("FuncDomain.signOutRemoteConfirm"),
                                                            cancelText: t("YakitButton.cancel"),
                                                            okText: t("YakitButton.exit"),
                                                            onOk() {
                                                                if (dynamicStatus.isDynamicStatus) {
                                                                    ipcRenderer.invoke("lougin-out-dynamic-control", {
                                                                        loginOut: true
                                                                    })
                                                                }
                                                                if (dynamicStatus.isDynamicSelfStatus) {
                                                                    ipcRenderer
                                                                        .invoke("kill-dynamic-control")
                                                                        .finally(() => {
                                                                            setStoreUserInfo(defaultUserInfo)
                                                                            loginOut(userInfo)
                                                                            setTimeout(
                                                                                () =>
                                                                                    success(
                                                                                        t("FuncDomain.signOutSuccess")
                                                                                    ),
                                                                                500
                                                                            )
                                                                        })
                                                                    // 立即退出界面
                                                                    ipcRenderer.invoke(
                                                                        "lougin-out-dynamic-control-page"
                                                                    )
                                                                }
                                                            },
                                                            onCancel() {},
                                                            cancelButtonProps: {
                                                                size: "small",
                                                                className: "modal-cancel-button"
                                                            },
                                                            okButtonProps: {size: "small", className: "modal-ok-button"}
                                                        })
                                                    } else {
                                                        setStoreUserInfo(defaultUserInfo)
                                                        loginOut(userInfo)
                                                        setTimeout(() => success(t("FuncDomain.signOutSuccess")), 500)
                                                    }
                                                }
                                                if (key === "trust-list") {
                                                    onOpenPage({route: YakitRoute.TrustListPage})
                                                }
                                                if (key === "set-password") {
                                                    setPasswordClose(true)
                                                    setPasswordShow(true)
                                                }
                                                if (key === "upload-data") setUploadModalShow(true)
                                                if (key === "role-admin") {
                                                    onOpenPage({route: YakitRoute.RoleAdminPage})
                                                }
                                                if (key === "account-admin") {
                                                    onOpenPage({route: YakitRoute.AccountAdminPage})
                                                }
                                                if (key === "license-admin") {
                                                    onOpenPage({route: YakitRoute.LicenseAdminPage})
                                                }
                                                if (key === "plugin-audit") {
                                                    onOpenPage({route: YakitRoute.Plugin_Audit})
                                                }
                                                if (key === "hole-collect") {
                                                    onOpenPage({route: YakitRoute.HoleCollectPage})
                                                }
                                                if (key === "control-admin") {
                                                    onOpenPage({route: YakitRoute.ControlAdminPage})
                                                }
                                                if (key === "data-statistics") {
                                                    onOpenPage({route: YakitRoute.Data_Statistics})
                                                }
                                                if (key === "system-config") {
                                                    onOpenPage({route: YakitRoute.System_Config})
                                                }
                                                if (key === "dynamic-control") {
                                                    setDynamicControlModal(true)
                                                }
                                                if (key === "close-dynamic-control") {
                                                    ipcRenderer.invoke("lougin-out-dynamic-control", {loginOut: false})
                                                }
                                                if (key === "misstatement") {
                                                    onOpenPage({route: YakitRoute.Misstatement})
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            placement: "bottom",
                                            trigger: ["click"],
                                            onVisibleChange: (value: boolean) => {
                                                setDynamicMenuOpen(value)
                                            }
                                        }}
                                    >
                                        {userInfo.platform === "company" ? (
                                            judgeDynamic(
                                                userInfo,
                                                avatarColor.current,
                                                dynamicMenuOpen,
                                                dynamicConnect,
                                                t
                                            )
                                        ) : (
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg
                                                }
                                                style={{width: 24, height: 24, borderRadius: "50%"}}
                                            />
                                        )}
                                    </YakitDropdownMenu>
                                </div>
                            ) : (
                                <div className={styles["user-show"]} onClick={() => setLoginShow(true)}>
                                    <UnLoginSvgIcon />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {loginShow && <Login visible={loginShow} onCancel={() => setLoginShow(false)} />}
            <YakitModal
                visible={passwordShow}
                closable={passwordClose}
                title={t("Main.setPassword")}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setPasswordShow(false)}
                footer={null}
            >
                <SetPassword onCancel={() => setPasswordShow(false)} userInfo={userInfo} />
            </YakitModal>

            <YakitModal
                visible={uploadModalShow}
                title={t("FuncDomain.uploadData")}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setUploadModalShow(false)}
                footer={null}
            >
                <SelectUpload onCancel={() => setUploadModalShow(false)} />
            </YakitModal>

            <DynamicControl
                mainTitle={t("FuncDomain.remoteControl")}
                secondTitle={t("FuncDomain.selectRole")}
                isShow={dynamicControlModal}
                onCancle={() => setDynamicControlModal(false)}
                width={345}
            >
                <SelectControlType
                    onControlMyself={() => {
                        setControlMyselfModal(true)
                        setDynamicControlModal(false)
                    }}
                    onControlOther={() => {
                        setControlOtherModal(true)
                        setDynamicControlModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={t("FuncDomain.controlledSide")}
                secondTitle={t("FuncDomain.controlledSideDesc")}
                isShow={controlMyselfModal}
                onCancle={() => setControlMyselfModal(false)}
            >
                <ControlMyself
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlMyselfModal(false)
                    }}
                />
            </DynamicControl>

            <DynamicControl
                mainTitle={t("FuncDomain.controllerSide")}
                secondTitle={t("FuncDomain.controllerSideDesc")}
                isShow={controlOtherModal}
                onCancle={() => setControlOtherModal(false)}
            >
                <ControlOther
                    goBack={() => {
                        setDynamicControlModal(true)
                        setControlOtherModal(false)
                    }}
                    runControl={(v: string, url: string) => {
                        setControlOtherModal(false)
                        runDynamicControlRemote(v, url)
                    }}
                />
            </DynamicControl>
        </div>
    )
})

// 运行节点弹窗内容
interface RunNodeContProp {
    runNodeModalVisible: boolean
    onClose: () => void
}

const initRunNodeModalParams = {
    ipOrdomain: "",
    port: "",
    nodename: ""
}

const RunNodeModal: React.FC<RunNodeContProp> = (props) => {
    const {t} = useI18nNamespaces(["layout", "yakitUi"])
    const {runNodeModalVisible, onClose} = props
    const [visible, setVisible] = useState(false)
    const [form] = Form.useForm()
    const [params, setParams] = useState<{ipOrdomain: string; port: string; nodename: string}>(initRunNodeModalParams)
    const {hasRunNodeInList, setRunNodeList, firstRunNodeFlag, setFirstRunNodeFlag} = useRunNodeStore()

    useEffect(() => {
        setVisible(runNodeModalVisible)
    }, [runNodeModalVisible])

    // 表单字段改变回调
    const onValuesChange = useMemoizedFn((changedValues, allValues) => {
        const key = Object.keys(changedValues)[0]
        const value = allValues[key]
        setParams({...params, [key]: value.trim()})
    })

    const onOKFun = useMemoizedFn(async () => {
        try {
            if (!params.ipOrdomain || !params.port || !params.nodename) {
                throw Error(t("RunNodeModal.inputNodeParamsError"))
            }
            if (hasRunNodeInList(JSON.stringify(params))) {
                throw Error(t("RunNodeModal.duplicateNodeRunning"))
            }
            const res = await ipcRenderer.invoke("call-command-generate-node", {
                ipOrdomain: params.ipOrdomain,
                port: params.port,
                nodename: params.nodename
            })
            setRunNodeList(JSON.stringify(params), res + "")
            yakitNotify("success", t("RunNodeModal.startNodeSuccess"))
            !firstRunNodeFlag && setFirstRunNodeFlag(true)
            onCloseModal()
        } catch (error) {
            yakitFailed(error + "")
        }
    })

    const onCloseModal = useMemoizedFn(() => {
        setParams(initRunNodeModalParams)
        form.setFieldsValue(initRunNodeModalParams)
        onClose()
    })

    return (
        <YakitModal
            title={t("RunNodeModal.runNode")}
            width={506}
            maskClosable={false}
            closable={true}
            visible={visible}
            okText={t("YakitButton.confirm")}
            onCancel={onCloseModal}
            onOk={onOKFun}
        >
            <div>
                <div style={{fontSize: 12, color: "#85899e", marginBottom: 10}}>{t("RunNodeModal.runNodeDesc")}</div>
                <Form
                    form={form}
                    colon={false}
                    onSubmitCapture={(e) => e.preventDefault()}
                    labelCol={{span: 6}}
                    wrapperCol={{span: 18}}
                    initialValues={{...params}}
                    style={{height: "100%"}}
                    onValuesChange={onValuesChange}
                >
                    <Form.Item
                        label={t("RunNodeModal.platformIpDomain")}
                        name='ipOrdomain'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: t("RunNodeModal.platformIpDomain")}]}
                    >
                        <YakitInput placeholder={t("RunNodeModal.platformIpDomain")} maxLength={100} showCount />
                    </Form.Item>
                    <Form.Item
                        label={t("RunNodeModal.platformPort")}
                        name='port'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: t("RunNodeModal.platformPort")}]}
                    >
                        <YakitInput placeholder={t("RunNodeModal.platformPort")} maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item
                        label={t("RunNodeModal.nodeName")}
                        name='nodename'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: t("RunNodeModal.nodeName")}]}
                    >
                        <YakitInput placeholder={t("RunNodeModal.nodeName")} maxLength={50} showCount />
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
}

interface UIOpSettingProp {
    /** 当前引擎模式 */
    engineMode: YaklangEngineMode
    /** yaklang引擎切换启动模式 */
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: YakitSettingCallbackType) => any
    mcp: mcpStreamHooks
}

/** @name 菜单模式切换 目前只有Yakit 社区版有 */
const ModeSwitch = (t: TFunction) => {
    if (isCommunityYakit()) {
        return {
            key: "modeSwitching",
            label: t("FuncDomain.modeSwitching"),
            children: [
                {
                    key: YakitModeEnum.Classic,
                    label: t("FuncDomain.classicMode")
                },
                {
                    key: YakitModeEnum.SecurityExpert,
                    label: t("FuncDomain.securityExpertMode")
                },
                {
                    key: YakitModeEnum.Scan,
                    label: t("FuncDomain.scanMode")
                }
            ]
        }
    }

    return null
}

const DBCacheManager = (t: TFunction) => {
    if (SystemInfo.mode === "local") {
        return {
            key: "db-cache-manager",
            label: t("FuncDomain.databaseCacheManagement"),
            children: [
                {key: "invalidCache", label: t("FuncDomain.deleteCacheData")},
                {key: "reclaimDatabaseSpace", label: t("FuncDomain.reclaimDatabaseSpace")}
            ]
        }
    }
    return {
        key: "db-cache-manager",
        label: t("FuncDomain.databaseCacheManagement"),
        children: [{key: "invalidCache", label: t("FuncDomain.deleteCacheData")}]
    }
}

const GetUIOpSettingMenu = (t: TFunction) => {
    // 便携版
    if (isEnpriTraceAgent()) {
        return [
            {
                key: "pcapfix",
                label: t("FuncDomain.pcapfix")
            },
            {
                key: "store",
                label: t("FuncDomain.configurePluginSource")
            },
            DBCacheManager(t),
            {
                key: "diagnose-network",
                label: t("FuncDomain.networkDiagnostics")
            },
            {
                key: "link",
                label: t("FuncDomain.switchConnectionMode"),
                children: [
                    {label: t("FuncDomain.local"), key: "local"},
                    {label: t("FuncDomain.remote"), key: "remote"}
                ]
            },
            {
                key: "i18nSwitching",
                label: t("FuncDomain.languageSwitching"),
                children: [
                    {
                        key: "zh",
                        label: t("FuncDomain.chinese")
                    },
                    {
                        key: "en",
                        label: t("FuncDomain.english")
                    }
                ]
            },
            {type: "divider"},
            {
                key: "logs",
                label: t("FuncDomain.logCollection"),
                children: [
                    {label: t("FuncDomain.renderLog"), key: "renderLog"},
                    {label: t("FuncDomain.engineLog"), key: "engineLog"},
                    {label: t("FuncDomain.debugLog"), key: "printLog"}
                ]
            }
        ]
    }

    // 默认社区版
    return [
        {
            key: "pcapfix",
            label: t("FuncDomain.pcapfix")
        },
        {
            key: "project",
            label: t("FuncDomain.projectManagement"),
            children: [
                {label: t("FuncDomain.switchProject"), key: "changeProject"},
                {label: t("FuncDomain.encryptedExport"), key: "encryptionProject"},
                {label: t("FuncDomain.plaintextExport"), key: "plaintextProject"}
            ]
        },
        {
            key: "explab",
            label: t("FuncDomain.experimentalFeatures"),
            children: [
                {
                    key: "bas-chaosmaker",
                    label: t("FuncDomain.BASLab")
                },
                {
                    key: "debug-monaco-editor",
                    label: t("FuncDomain.devPlayground")
                },
                {
                    key: "vulinbox-manager",
                    label: t("FuncDomain.vulinbox")
                },
                {
                    key: "debug-traffic-analize",
                    label: t("FuncDomain.trafficAnalysis")
                },
                {
                    key: "run-node",
                    label: t("FuncDomain.runNode")
                },
                {
                    key: "webshell-manager",
                    label: t("FuncDomain.websiteManagement")
                },
                {key: "mcp", label: "Yak Mcp"},
                {key: "ai-agent", label: "AI Agent"},
                {key: "ssa-result-diff", label: "ssa-result-diff"},
                {key: "ai-repository", label: t("FuncDomain.knowledgeBase")},
                {key: "ssa-compile-history", label: t("FuncDomain.ssaCompileHistory")},
                {key: "memory-base", label: t("FuncDomain.memoryBase")}
            ]
        },
        ModeSwitch(t),
        {
            key: "themeSwitching",
            label: t("FuncDomain.themeSwitching"),
            children: [
                {
                    key: "light",
                    label: t("FuncDomain.lightTheme")
                },
                {
                    key: "dark",
                    label: t("FuncDomain.darkTheme")
                }
            ]
        },
        {
            key: "i18nSwitching",
            label: t("FuncDomain.languageSwitching"),
            children: [
                {
                    key: "zh",
                    label: t("FuncDomain.chinese")
                },
                {
                    key: "en",
                    label: t("FuncDomain.english")
                }
            ]
        },
        {type: "divider"},
        DBCacheManager(t),
        {
            key: "store",
            label: t("FuncDomain.configurePluginSource")
        },
        {
            key: "cve-database",
            label: t("FuncDomain.cveDatabase"),
            children: [
                {label: t("FuncDomain.fullUpdate"), key: "cve-database-all-update"},
                {label: t("FuncDomain.differentialUpdate"), key: "cve-database-differential-update"}
            ]
        },
        {
            key: "link",
            label: t("FuncDomain.switchConnectionMode"),
            children: [
                {label: t("FuncDomain.local"), key: "local"},
                {label: t("FuncDomain.remote"), key: "remote"}
            ]
        },
        {type: "divider"},
        {
            key: "systemSet",
            label: t("FuncDomain.systemSettings"),
            children: [
                {key: "reverse", label: t("FuncDomain.globalReverse")},
                {key: "agent", label: t("FuncDomain.systemProxy")},
                // { key: "engineVar",label: "引擎环境变量" },
                {key: "config-network", label: t("FuncDomain.globalConfig")},
                {key: "setShortcutKey", label: t("FuncDomain.shortcutSettings")}
            ]
        },
        {
            key: "diagnose-network",
            label: t("FuncDomain.networkDiagnostics")
        },
        {
            key: "refreshMenu",
            label: t("FuncDomain.refreshMenu")
        },
        {type: "divider"},
        {
            key: "logs",
            label: t("FuncDomain.logCollection"),
            children: [
                {label: t("FuncDomain.renderLog"), key: "renderLog"},
                {label: t("FuncDomain.engineLog"), key: "engineLog"},
                {label: t("FuncDomain.debugLog"), key: "printLog"}
            ]
        }
    ].filter((item) => item)
}

const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, onEngineModeChange, typeCallback, mcp} = props

    const [runNodeModalVisible, setRunNodeModalVisible] = useState<boolean>(false)
    const [show, setShow] = useState<boolean>(false)
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [available, setAvailable] = useState(false) // cve数据库是否可用
    const [isDiffUpdate, setIsDiffUpdate] = useState(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const {delTemporaryProject} = useTemporaryProjectStore()
    const [configMcpModalVisible, setConfigMcpModalVisible] = useState<boolean>(false)
    /** 当前主题 */
    const {setTheme} = useTheme()
    const {softMode, setSoftMode} = useSoftMode()
    const [reclaimHint, setReclaimHint] = useState<boolean>(false)
    const {t, i18n} = useI18nNamespaces(["home", "layout"])

    useEffect(() => {
        onIsCVEDatabaseReady()
    }, [])
    const onIsCVEDatabaseReady = useMemoizedFn(() => {
        ipcRenderer
            .invoke("IsCVEDatabaseReady")
            .then((rsp: {Ok: boolean; Reason: string; ShouldUpdate: boolean}) => {
                setAvailable(rsp.Ok)
            })
            .catch((err) => {
                yakitFailed(t("FuncDomain.isCVEDatabaseReadyFailed", {error: String(err)}))
            })
    })

    const menuSelect = useMemoizedFn((type: string) => {
        if (show) setShow(false)
        switch (type) {
            case "cve-database-all-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(false)
                return
            case "cve-database-differential-update":
                setDataBaseUpdateVisible(true)
                setIsDiffUpdate(true)
                return
            case "store":
                if (dynamicStatus.isDynamicStatus) {
                    warn(t("UIOpSetting.remoteModeCannotModify"))
                    return
                }
                const m = showYakitModal({
                    title: t("UIOpSetting.configPrivateDomain"),
                    type: "white",
                    footer: null,
                    maskClosable: false,
                    // onCancel: () => m.destroy(),
                    content: <ConfigPrivateDomain onClose={() => m.destroy()} />
                })
                return m
            case "reverse":
                showYakitModal({
                    type: "white",
                    title: t("UIOpSetting.configGlobalReverse"),
                    width: 800,
                    content: (
                        <div style={{width: 800}}>
                            <ConfigGlobalReverse />
                        </div>
                    ),
                    footer: null
                })
                return
            case "agent":
                showConfigSystemProxyForm()
                return
            case "mcp":
                setConfigMcpModalVisible(true)
                return
            case "engineVar":
                showConfigYaklangEnvironment()
                return
            case "remote":
                if (dynamicStatus.isDynamicStatus) {
                    warn(t("UIOpSetting.remoteModeCannotModify"))
                    return
                }
                onEngineModeChange(type)
                return
            case "local":
                if (dynamicStatus.isDynamicStatus) {
                    warn(t("UIOpSetting.remoteModeCannotModify"))
                    return
                }
                if (type === engineMode) {
                    warn(t("UIOpSetting.alreadyLocalMode"))
                    return
                }
                onEngineModeChange(type)
                return
            case "refreshMenu":
                ipcRenderer.invoke("change-main-menu")
                return
            case "bas-chaosmaker":
                addToTab("**chaos-maker")
                return
            case "screen-recorder":
                addToTab("**screen-recorder")
                return
            // case "matcher-extractor":
            //     addToTab("**matcher-extractor")
            //     return
            case "debug-monaco-editor":
                addToTab("**debug-monaco-editor")
                return
            case "vulinbox-manager":
                addToTab("**vulinbox-manager")
                return
            case "diagnose-network":
                addToTab("**diagnose-network")
                return
            case "config-network":
                addToTab("**config-network")
                return
            case "debug-traffic-analize":
                addToTab("**beta-debug-traffic-analize")
                return
            case "webshell-manager":
                addToTab("**webshell-manager")
                return
            case "invalidCache":
                invalidCacheAndUserData(delTemporaryProject)
                return
            case "reclaimDatabaseSpace":
                setReclaimHint(true)
                return
            case "pcapfix":
                showPcapPermission()
                return
            case "changeProject":
            case "encryptionProject":
            case "plaintextProject":
                typeCallback(type)
                return
            case "run-node":
                setRunNodeModalVisible(true)
                return
            case "setShortcutKey":
                emiter.emit(
                    "openPage",
                    JSON.stringify({
                        route: YakitRoute.ShortcutKey,
                        params: "global" as ShortcutKeyPageName
                    })
                )
                return
            case "renderLog":
                grpcOpenRenderLogFolder()
                return
            case "engineLog":
                grpcOpenEngineLogFolder()
                return
            case "printLog":
                grpcOpenPrintLogFolder()
                return
            case "ai-agent":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_Agent}))
                return
            case "ssa-result-diff":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.Ssa_Result_Diff}))
                return
            case "ai-repository":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
                return
            case "ssa-compile-history":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.SSA_Compile_History}))
                return
            case "memory-base":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_Memory}))
                return
            case YakitModeEnum.Classic:
            case YakitModeEnum.SecurityExpert:
            case YakitModeEnum.Scan:
                if (softMode === type) {
                    yakitNotify("info", t("UIOpSetting.modeAlreadySet"))
                } else {
                    setSoftMode(type)
                }
                return
            case "light":
                setTheme("light")
                return
            case "dark":
                setTheme("dark")
                return
            case "zh":
            case "en":
                i18n.changeLanguage(type)
                setLocalValue(getRemoteI18nGV(), type)
                return
            default:
                return
        }
    })
    useEffect(() => {
        emiter.on("onUIOpSettingMenuSelect", menuSelect)
        return () => {
            emiter.off("onUIOpSettingMenuSelect", menuSelect)
        }
    }, [])

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            // triggerSubMenuAction={'click'}
            data={GetUIOpSettingMenu(t) as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )

    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                placement={"bottom"}
                content={menu}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
                trigger='click'
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
            <DatabaseUpdateModal
                available={available}
                visible={dataBaseUpdateVisible}
                setVisible={setDataBaseUpdateVisible}
                latestMode={isDiffUpdate}
            />
            <RunNodeModal runNodeModalVisible={runNodeModalVisible} onClose={() => setRunNodeModalVisible(false)} />
            {configMcpModalVisible && <ConfigMcpModal mcp={mcp} onClose={() => setConfigMcpModalVisible(false)} />}
            <YakitHint
                visible={reclaimHint}
                title={t("HomeCom.reclaimDatabaseSpaceTitle")}
                content={t("HomeCom.reclaimDatabaseSpaceCont")}
                onOk={() => {
                    setReclaimHint(false)
                    emiter.emit("openEngineLinkWin", "reclaimDatabaseSpace_start")
                }}
                onCancel={() => {
                    setReclaimHint(false)
                }}
            />
        </>
    )
})

interface UIDevTool {
    onDevToolRefresh: () => void
}
const UIDevTool: React.FC<UIDevTool> = React.memo((props) => {
    const {onDevToolRefresh} = props
    const [show, setShow] = useState<boolean>(false)
    const {t} = useI18nNamespaces(["layout"])

    const {delTemporaryProject} = useTemporaryProjectStore()

    const menuSelect = useMemoizedFn(async (type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                await delTemporaryProject()
                onDevToolRefresh()
                setTimeout(() => {
                    ipcRenderer.invoke("trigger-reload")
                }, 1000)
                return
            case "reloadCache":
                await delTemporaryProject()
                onDevToolRefresh()
                setTimeout(() => {
                    ipcRenderer.invoke("trigger-reload-cache")
                }, 1000)
                return

            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            selectedKeys={undefined}
            data={[
                {
                    key: "devtool",
                    label: t("FuncDomain.console")
                },
                {
                    key: "reload",
                    label: t("FuncDomain.refresh")
                },
                {
                    key: "reloadCache",
                    label: t("FuncDomain.forceRefresh")
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        ></YakitMenu>
    )

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            trigger={"click"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})

interface UIOpUpdateProps {
    /** 公共属性 */
    version: string
    lastVersion: string
    role?: string | null
    updateContent?: string
    onDownload: (type: "yakit" | "yaklang" | "intranetYakit") => any
    onUpdateEdit?: (type: "yakit" | "yaklang") => any
    isUpdate: boolean

    /** yakit属性 */
    isUpdateWait?: boolean // 是否已下载未安装
    onResetUpdateWait?: () => void

    /** yaklang属性 */
    localVersion?: string // 本地引擎文件版本
    moreYaklangVersionList?: string[] // 更多引擎版本列表
    isRemoteMode?: boolean // 是否为远程模式
    onNoticeShow?: (visible: boolean) => void
    isUpdateYakit?: boolean // 下载引擎之前判断yakit是否需要先更新
    // 是否为内网版本
    intranet?: boolean
}

/** @name Yakit版本以及更新内容 */
const UIOpUpdateYakit: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        isUpdate,
        isUpdateWait,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit,
        intranet,
        onResetUpdateWait
    } = props
    const {t} = useI18nNamespaces(["home", "layout"])

    // 是否可编辑
    const isShowModify = useMemo(() => {
        if (intranet) return false // 内网版不允许编辑
        if (isCommunityEdition() && role === "superAdmin") return true
        if (isEnpriTrace() && role === "admin") return true
        return false
    }, [role])

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    const versionTitle = useMemoizedFn(() => {
        if (isCommunityEdition()) {
            return t("FuncDomain.communityEdition")
        } else {
            if (intranet) return t("FuncDomain.intranetEdition")
            return t("FuncDomain.officialEdition")
        }
    })

    const handleOpenPath = useMemoizedFn(async () => {
        const EditionName = getReleaseEditionName().replace(/\s+/g, "")
        const Version = lastVersion || version
        const cleanVersion = Version.startsWith("v") ? Version.substring(1) : Version
        const filename = `${EditionName}-${cleanVersion}`
        try {
            const fileExists = await ipcRenderer.invoke("check-yakit-install-file", filename)
            if (fileExists) {
                ipcRenderer.invoke("open-yakit-path")
            } else {
                onResetUpdateWait?.()
            }
        } catch (error) {
            yakitFailed(`${error}`)
        }
    })

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: isUpdate && !isUpdateWait
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YakitWhiteSvgIcon />
                    </div>
                    <div>
                        <div className={styles["update-title"]}>{`${versionTitle()} ${getReleaseEditionName()} ${
                            lastVersion || version
                        }`}</div>
                        <div className={styles["update-time"]}>{t("FuncDomain.currentVersion", {version})}</div>
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isUpdateWait ? (
                        <YakitButton onClick={handleOpenPath}>{t("FuncDomain.install")}</YakitButton>
                    ) : lastVersion === "" ? (
                        t("FuncDomain.fetchFailed")
                    ) : isUpdate ? (
                        <div
                            className={styles["update-btn"]}
                            onClick={() => onDownload(intranet ? "intranetYakit" : "yakit")}
                        >
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            {t("FuncDomain.downloadNow")}
                        </div>
                    ) : (
                        t("FuncDomain.alreadyLatest")
                    )}
                    {isShowModify && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yakit")
                            }}
                        >
                            <OutlinePencilaltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            {!intranet && (
                <div className={styles["update-content-wrapper"]}>
                    <div
                        className={classNames({
                            [styles["update-content"]]: !isShowModify,
                            [styles["update-admin-content"]]: isShowModify
                        })}
                    >
                        {content.length === 0 ? (
                            <div className={isShowModify ? styles["empty-content"] : ""}>{t("FuncDomain.noUpdateNotice")}</div>
                        ) : (
                            content.map((item, index) => {
                                return (
                                    <div
                                        key={index}
                                        className={classNames({[styles["paragraph-spacing"]]: index !== 0})}
                                    >
                                        {item}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})
/** @name Yaklang引擎版本 */
const UIOpUpdateYaklang: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        localVersion = "",
        moreYaklangVersionList = [],
        isRemoteMode = false,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit,
        onNoticeShow = () => {},
        isUpdate,
        isUpdateYakit
    } = props
    const {t} = useI18nNamespaces(["home", "layout"])

    const [updateHint, setUpdateHint] = useState<boolean>(false)
    const [moreVersionPopShow, setMoreVersionPopShow] = useState<boolean>(false)
    /** 判断连接引擎版本和本地引擎文件版本是否相同，不同提示是否重新启动引擎 */
    const isKillEngine = useMemo(() => {
        return (
            localVersion &&
            removePrefixV(localVersion) !== removePrefixV(version) &&
            removePrefixV(localVersion) === removePrefixV(lastVersion) &&
            !isUpdate
        )
    }, [localVersion, version, lastVersion, isUpdate])

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    const isShowModify = useMemo(() => {
        if (isCommunityEdition() && role === "superAdmin") return true
        if (isEnpriTrace() && role === "admin") return true
        return false
    }, [role])

    const versionTextMaxWidth = useMemo(() => {
        // 更多版本 立即更新 管理员编辑
        if (isUpdate && isShowModify) return 150
        // 更多版本 获取失败 管理员编辑
        if (!lastVersion && isShowModify) return 175
        // 更多版本 立即更新
        if (isUpdate) return 179
        // 更多版本 已是最新 管理员编辑
        if (lastVersion && !isUpdate && !isKillEngine && isShowModify) return 170
        // 更多版本 其他
        return 190
    }, [isUpdate, isShowModify, lastVersion, isKillEngine])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && (isUpdate || isKillEngine)
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <img src={YakitLogo} width={30} />
                    </div>
                    <div
                        style={{
                            width: versionTextMaxWidth
                        }}
                    >
                        <div className={styles["update-title"]}>{`Yaklang ${lastVersion || version}`}</div>
                        <div className={styles["update-time"]}>{t("FuncDomain.currentVersion", {version})}</div>
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isRemoteMode ? (
                        <>{isUpdate && t("FuncDomain.remoteCannotUpdate")}</>
                    ) : (
                        <>
                            <YakitPopover
                                visible={moreVersionPopShow}
                                overlayClassName={styles["more-versions-popover"]}
                                placement='bottomLeft'
                                trigger='click'
                                content={
                                    <MoreYaklangVersion
                                        moreYaklangVersionList={moreYaklangVersionList}
                                        onClosePop={() => {
                                            setMoreVersionPopShow(false)
                                            onNoticeShow(false)
                                        }}
                                    />
                                }
                                onVisibleChange={(visible) => {
                                    setMoreVersionPopShow(visible)
                                }}
                            >
                                <div className={styles["more-version-btn"]}>{t("FuncDomain.moreVersions")}</div>
                            </YakitPopover>
                            {isUpdate && (
                                <div
                                    className={styles["update-btn"]}
                                    onClick={() => {
                                        if (isUpdateYakit) {
                                            onNoticeShow(false)
                                            setUpdateHint(true)
                                        } else {
                                            onDownload("yaklang")
                                        }
                                    }}
                                >
                                    <UpdateSvgIcon style={{marginRight: 4}} />
                                    {t("FuncDomain.updateNow")}
                                </div>
                            )}
                            <YakitHint
                                visible={updateHint}
                                title={t("FuncDomain.updateHintTitle")}
                                content={t("FuncDomain.updateHintContent", {edition: getReleaseEditionName()})}
                                okButtonText={t("FuncDomain.updateHintOk", {edition: getReleaseEditionName()})}
                                cancelButtonText={t("FuncDomain.updateEngine")}
                                footerExtra={
                                    <YakitButton
                                        size='max'
                                        type='outline2'
                                        onClick={() => {
                                            setUpdateHint(false)
                                        }}
                                    >
                                        {t("FuncDomain.cancel")}
                                    </YakitButton>
                                }
                                onOk={() => {
                                    setUpdateHint(false)
                                    onDownload("yakit")
                                }}
                                onCancel={() => {
                                    setUpdateHint(false)
                                    onDownload("yaklang")
                                }}
                            />
                            {isKillEngine && (
                                <YakitButton
                                    onClick={() => ipcRenderer.invoke("kill-old-engine-process")}
                                >{t("FuncDomain.update")}</YakitButton>
                            )}
                            {!lastVersion ? t("FuncDomain.fetchFailed") : !isUpdate && !isKillEngine && t("FuncDomain.alreadyLatest")}
                        </>
                    )}
                    {isShowModify && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yaklang")
                            }}
                        >
                            <OutlinePencilaltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: !isShowModify,
                        [styles["update-admin-content"]]: isShowModify
                    })}
                >
                    {content.length === 0 ? (
                            <div className={isShowModify ? styles["empty-content"] : ""}>{t("FuncDomain.noUpdateNotice")}</div>
                    ) : (
                        content.map((item, index) => {
                            return (
                                <div key={index} className={classNames({[styles["paragraph-spacing"]]: index !== 0})}>
                                    {item}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
})

interface MoreYaklangVersionProps {
    moreYaklangVersionList: string[]
    onClosePop: (visible: boolean) => void
}
/** @name 更多Yaklang版本 */
const MoreYaklangVersion: React.FC<MoreYaklangVersionProps> = React.memo((props) => {
    const {moreYaklangVersionList, onClosePop} = props
    const {t} = useI18nNamespaces(["layout"])
    const [versionList, setVersionList] = useState<string[]>(moreYaklangVersionList)
    const [searchVersionVal, setSearchVersionVal] = useState<string>("")
    const [searchVersionList, setSearchVersionList] = useState<string[]>([])

    useEffect(() => {
        setVersionList(moreYaklangVersionList)
    }, [moreYaklangVersionList])

    const onSearchVersion = (version: string) => {
        setSearchVersionVal(version)
        const arr = versionList.filter((v) => v.includes(version))
        setSearchVersionList(arr)
    }

    const renderVersionList = useMemo(() => {
        return searchVersionVal ? searchVersionList : versionList
    }, [searchVersionVal, searchVersionList, versionList])

    const versionListItemClick = (version: string) => {
        onClosePop(false)
        emiter.emit(
            "downYaklangSpecifyVersion",
            JSON.stringify({
                version,
                killPssText: {
                    title: t("FuncDomain.replaceEngineTitle"),
                    content:
                        t("FuncDomain.replaceEngineContent")
                }
            })
        )
    }

    return (
        <div className={styles["more-versions-popover-content"]}>
            <div className={styles["search-version-header"]}>
                <YakitInput
                    value={searchVersionVal}
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    onChange={(e) => onSearchVersion(e.target.value.trim())}
                />
            </div>
            <div className={styles["version-list-wrap"]}>
                {renderVersionList.length ? (
                    <>
                        {renderVersionList.map((v, index) => (
                            <div
                                className={styles["version-list-item"]}
                                key={index}
                                onClick={() => versionListItemClick(v)}
                            >
                                {v}
                            </div>
                        ))}
                    </>
                ) : (
                    <YakitEmpty></YakitEmpty>
                )}
            </div>
        </div>
    )
})

interface UIOpNoticeProp {
    isEngineLink: boolean
    isRemoteMode: boolean
    onLogin: () => void
}

export interface UpdateContentProp {
    version: string
    content: string
}

export interface FetchUpdateContentProp {
    type: "yakit" | "yaklang"
}

export interface FetchEnpriTraceUpdateContentProp {
    version: string
}

export interface UpdateEnpriTraceInfoProps {
    version: string
}

interface SetUpdateContentProp extends FetchUpdateContentProp {
    updateContent: string
    // 默认为yakit
    source?: "yakit" | "irify"
}

const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const {isEngineLink, isRemoteMode, onLogin} = props

    const {userInfo} = useStore()
    const {t} = useI18nNamespaces(["home", "layout"])

    const [show, setShow] = useState<boolean>(false)

    /** Yakit版本号 */
    const [yakitVersion, setYakitVersion] = useState<string>("dev")
    const [yakitLastVersion, setYakitLastVersion] = useState<string>("")
    const yakitTime = useRef<any>(null)

    /** Yaklang引擎版本号 */
    const [yaklangVersion, setYaklangVersion] = useState<string>("dev") // 当前连接引擎的版本号
    const [yaklangLastVersion, setYaklangLastVersion] = useState<string>("") // 官方推荐的最新版
    const [yaklangLocalVersion, setYaklangLocalVersion] = useState<string>("") // 本地引擎文件版本号
    const yaklangTime = useRef<any>(null)

    /** 更多引擎列表 */
    const [moreYaklangVersionList, setMoreYaklangVersionList] = useState<string[]>([]) // 更多引擎版本list
    const moreYaklangTime = useRef<any>(null)

    // 是否低于主推引擎版本
    const lowerYaklangLastVersion = useMemo(() => {
        // 如果是远程模式，不显示更新
        if (isRemoteMode) return false
        if (!moreYaklangVersionList.length) return false
        if (!yaklangLastVersion) return false
        const index1 = moreYaklangVersionList.indexOf(yaklangLastVersion)
        const index2 = moreYaklangVersionList.indexOf(yaklangVersion)
        if (index2 === -1) return true
        if (index2 > index1) return true
        return false
    }, [isRemoteMode, moreYaklangVersionList, yaklangLastVersion, yaklangVersion])

    const versionsInfoTime = useRef<any>(null)
    const [communityYakitContent, setCommunityYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYaklangContent, setCommunityYaklangContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const communityYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        const lastVersion = removePrefixV(yakitLastVersion)
        const contentVersion = removePrefixV(communityYakitContent.version)
        if (lastVersion === contentVersion) return communityYakitContent.content
        return ""
    }, [yakitLastVersion, communityYakitContent])
    const communityYaklang: string = useMemo(() => {
        if (!yaklangLastVersion) return ""
        const lastVersion = removePrefixV(yaklangLastVersion)
        const contentVersion = removePrefixV(communityYaklangContent.version)
        if (lastVersion === contentVersion) return communityYaklangContent.content
        return ""
    }, [yaklangLastVersion, communityYaklangContent])

    /** 是否启动检测更新 */
    const [isCheck, setIsCheck] = useState<boolean>(true)

    /**获取社区版yakit&yaklang更新内容 */
    const fetchYakitAndYaklangVersionInfo = useMemoizedFn(() => {
        NetWorkApi<any, API.YakVersionsInfoResponse>({
            method: "get",
            url: "yak/versions/info",
            params: {
                source: isIRify() ? "irify" : "yakit"
            }
        })
            .then((res: API.YakVersionsInfoResponse) => {
                if (!res) return
                const data = res.data || []
                try {
                    data.forEach((item) => {
                        if (item.type === "yakit") {
                            const content: UpdateContentProp = JSONParseLog(item.content, {
                                page: "FuncDomain",
                                fun: "fetchYakitAndYaklangVersionInfo-yakit"
                            })
                            setCommunityYakitContent({...content})
                        } else if (item.type === "yaklang") {
                            const content: UpdateContentProp = JSONParseLog(item.content, {
                                page: "FuncDomain",
                                fun: "fetchYakitAndYaklangVersionInfo-yaklang"
                            })
                            setCommunityYaklangContent({...content})
                        }
                    })
                } catch (error) {}
            })
            .catch((err) => {})
    })

    const isUpdateEnpriTraceRef = useRef<boolean>(true)
    const {eeSystemConfig} = useEeSystemConfig()
    const [isShowEnpriTraceUpdateVisible, setShowEnpriTraceUpdateVisible] = useState<boolean>(false)
    const [intranetHintLoading, setIntranetHintLoading] = useState<boolean>(false)
    // 是否从内网读取版本号
    const [isIntranet, setIsIntranet] = useState<boolean>(false)
    // 内网版号
    const [yakitLastIntranetVersion, setYakitLastIntranetVersion] = useState<string>("")
    // 内网版是否下载中
    const [isYakitIntranetDownloading, setYakitIntranetDownloading] = useState<boolean>(false)
    // 内网版下载后的文件路径
    const [yakitIntranetFilePath, setYakitIntranetFilePath] = useState<string>("")

    const onDownloadFinish = useMemoizedFn((filePath: string, status: boolean) => {
        // 下载完成后的处理逻辑
        if (status) {
            setYakitIntranetFilePath(filePath)
            setShowEnpriTraceUpdateVisible(true)
            setIsIntranetYakitUpdateWait(true)
        }
        setYakitIntranetDownloading(false)
    })
    // 后台隐藏下载内网版
    const [_, {onDownloadStart}] = useDownloadYakit({onDownloadFinish})

    useEffect(() => {
        if (!isEnpriTrace()) return
        // 是否从内网读取版本号
        let intranet = false
        eeSystemConfig.forEach((item) => {
            if (item.configName === "clientUpdateType" && item.isOpen) {
                intranet = true
            }
        })
        setIsIntranet(intranet)
    }, [eeSystemConfig])

    useUpdateEffect(() => {
        if (isIntranet) {
            // 从内网读取版本号
            grpcFetchIntranetYakitVersion().then((filePath: string) => {
                const match = filePath.match(/EnpriTrace-([\d.-]+)/)
                const version = match ? match[1] : ""
                const data = `v${version.endsWith("-") ? version.slice(0, -1) : version}` // 去掉末尾的'-'符号

                // 企业版初次进入时 如若配置文件为强制更新则隐藏下载更新内容后弹出提示框
                if (isUpdateEnpriTraceRef.current && data.length > 0) {
                    const isUpdateYakit = data !== "" && removePrefixV(data) !== removePrefixV(yakitVersion)
                    // 是否强制更新
                    let forceUpdate = false
                    eeSystemConfig.forEach((item) => {
                        if (item.configName === "forceUpdate") {
                            forceUpdate = item.isOpen
                        }
                    })
                    if (isUpdateYakit && forceUpdate) {
                        isUpdateEnpriTraceRef.current = false
                        setYakitIntranetDownloading(true)
                        onDownloadStart()
                    }
                }
                setYakitLastIntranetVersion(data)
            })
        }
    }, [isIntranet])

    /** 获取最新Yakit版本号 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        /** 社区版埋点 */
        if (isCommunityEdition()) visitorsStatisticsFun()
        grpcFetchLatestYakitVersion(undefined, true)
            .then((data: string) => {
                setYakitLastVersion(data)
            })
            .catch(() => {
                setYakitLastVersion("")
            })
    })
    /** 获取最新官方推荐Yaklang版本号和本地版本号 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        grpcFetchLatestYakVersion(true)
            .then((data: string) => {
                setYaklangLastVersion(data)
            })
            .catch((err) => {
                setYaklangLastVersion("")
            })
        if (!isRemoteMode) {
            grpcFetchLocalYakVersion(true)
                .then((data: string) => {
                    !isRemoteMode && setYaklangLocalVersion(data)
                })
                .catch(() => {})
        }
    })
    /** 获取更多Yaklang引擎版本 */
    const fetchMoreYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-yaklang-version-list")
            .then((data: string) => {
                const arr = data.split("\n").filter((v) => v)
                let devPrefix: string[] = []
                let noPrefix: string[] = []
                arr.forEach((item) => {
                    if (item.startsWith("dev")) {
                        devPrefix.push(item)
                    } else {
                        noPrefix.push(item)
                    }
                })
                setMoreYaklangVersionList(noPrefix.concat(devPrefix))
            })
            .catch((err) => {
                setMoreYaklangVersionList([])
            })
    })

    /** 接收当前正在连接引擎的版本号 */
    useEffect(() => {
        if (isEngineLink) {
            ipcRenderer.on("fetch-yak-version-callback", async (e: any, data: string) => {
                setYaklangVersion(data || "dev")
            })
            return () => {
                ipcRenderer.removeAllListeners("fetch-yak-version-callback")
            }
        }
    }, [isEngineLink])

    /** 清空定时器 */
    const handleClearIntervals = useMemoizedFn(() => {
        if (versionsInfoTime.current) {
            clearInterval(versionsInfoTime.current)
            versionsInfoTime.current = null
        }
        if (yakitTime.current) {
            clearInterval(yakitTime.current)
            yakitTime.current = null
        }
        if (yaklangTime.current) {
            clearInterval(yaklangTime.current)
            yaklangTime.current = null
        }
        if (moreYaklangTime.current) {
            clearInterval(moreYaklangTime.current)
            moreYaklangTime.current = null
        }
    })

    useEffect(() => {
        if (isEngineLink) {
            // 获取是否 启动检测更新 的缓存状态
            getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
                setIsCheck(val)
            })

            // 设置获取更新内容的定时器(yakit&yaklang)
            if (versionsInfoTime.current) clearInterval(versionsInfoTime.current)
            versionsInfoTime.current = setInterval(fetchYakitAndYaklangVersionInfo, 60000)
            fetchYakitAndYaklangVersionInfo()

            // 获取本地的 yakit 版本号，启动定时器(获取最新的 yakit 版本号)
            grpcFetchLocalYakitVersion(true).then((v: string) => setYakitVersion(`v${v}`))
            if (yakitTime.current) clearInterval(yakitTime.current)
            fetchYakitLastVersion()
            yakitTime.current = setInterval(fetchYakitLastVersion, 60000)

            // 获取当前连接引擎的版本号，启动定时器(获取最新和本地引擎文件的版本号)
            ipcRenderer.invoke("fetch-yak-version")
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            fetchYaklangLastVersion()
            yaklangTime.current = setInterval(fetchYaklangLastVersion, 60000)

            // 获取更多引擎列表，并启动定时器
            if (moreYaklangTime.current) clearInterval(moreYaklangTime.current)
            fetchMoreYaklangLastVersion()
            moreYaklangTime.current = setInterval(fetchMoreYaklangLastVersion, 60000)
        } else {
            setYakitLastVersion("")
            setYaklangVersion("dev")
            setYaklangLastVersion("")
            setYaklangLocalVersion("")
            setMoreYaklangVersionList([])
        }

        return () => {
            handleClearIntervals()
        }
    }, [isEngineLink])

    // intranetYakit为内网Yakit
    const onDownload = useMemoizedFn((type: "yakit" | "yaklang" | "intranetYakit") => {
        setShow(false)
        if (["yakit", "intranetYakit"].includes(type)) {
            emiter.emit("activeUpdateYakitOrYaklang", type)
        } else {
            emiter.emit("downYaklangSpecifyVersion", JSON.stringify({version: yaklangLastVersion}))
        }
    })

    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    const [isIntranetYakitUpdateWait, setIsIntranetYakitUpdateWait] = useState<boolean>(false)
    /** 监听 yakit 下载后不安装，在 UI 上提示安装按钮 */
    useEffect(() => {
        const onsetIsYakitUpdateWait = () => {
            setIsYakitUpdateWait(true)
        }
        const onsetIsYakitIntranetUpdateWait = () => {
            setIsIntranetYakitUpdateWait(true)
        }
        emiter.on("downloadedYakitFlag", onsetIsYakitUpdateWait)
        emiter.on("downloadedYakitIntranetFlag", onsetIsYakitIntranetUpdateWait)
        return () => {
            emiter.off("downloadedYakitFlag", onsetIsYakitUpdateWait)
            emiter.off("downloadedYakitIntranetFlag", onsetIsYakitIntranetUpdateWait)
        }
    }, [])

    const [editLoading, setEditLoading] = useState<boolean>(false)
    const [editShow, setEditShow] = useState<{visible: boolean; type: "yakit" | "yaklang"}>({
        visible: false,
        type: "yakit"
    })
    const [editInfo, setEditInfo] = useState<string>("")
    const UpdateContentEdit = useMemoizedFn((type: "yakit" | "yaklang") => {
        if (editShow.visible) return
        setEditInfo(type === "yakit" ? communityYakit : communityYaklang)
        setEditShow({visible: true, type: type})
        setShow(false)
    })
    const onSubmitEdit = useMemoizedFn(() => {
        if (editShow.type === "yakit" && yakitLastVersion.length === 0) {
            warn(`未获取${getReleaseEditionName()}最新版本`)
            return
        }
        if (editShow.type !== "yakit" && yaklangLastVersion.length === 0) {
            warn(`未获取引擎最新版本`)
            return
        }
        setEditLoading(true)
        const params: SetUpdateContentProp = {
            type: editShow.type,
            updateContent: JSON.stringify({
                version: editShow.type === "yakit" ? yakitLastVersion : yaklangLastVersion,
                content: editInfo || ""
            }),
            source: isIRify() ? "irify" : "yakit"
        }

        NetWorkApi<SetUpdateContentProp, API.ActionSucceeded>({
            method: "post",
            url: "yak/versions",
            data: params
        })
            .then((res) => {
                info("修改更新内容成功")
                fetchYakitAndYaklangVersionInfo()
                if (editShow.type === "yakit") fetchYakitLastVersion()
                else fetchYaklangLastVersion()
                setTimeout(() => setEditShow({visible: false, type: "yakit"}), 100)
            })
            .catch((e) => failed(`修改错误 ${e}`))
            .finally(() => {
                setTimeout(() => setEditLoading(false), 300)
            })
    })

    const [messageList, setMessageList] = useState<API.MessageLogDetail[]>([])
    const isUpdate = useMemo(() => {
        const unRead = messageList.filter((item) => !item.isRead).length > 0
        return (
            (yakitLastVersion !== "" && removePrefixV(yakitLastVersion) !== removePrefixV(yakitVersion)) ||
            lowerYaklangLastVersion ||
            unRead
        )
    }, [yakitVersion, yakitLastVersion, lowerYaklangLastVersion, messageList])

    const [noticeType, setNoticeType] = useState<"message" | "update">("update")
    useUpdateEffect(() => {
        if (userInfo.isLogin) {
            setNoticeType("message")
        } else {
            setNoticeType("update")
        }
    }, [userInfo.isLogin])

    const getAllMessage = useMemoizedFn(() => {
        setShow(false)
        emiter.emit("openAllMessageNotification")
    })

    const onFetchMessage = useMemoizedFn(() => {
        apiFetchQueryMessage({
            page: 1,
            limit: 20
        }).then((res) => {
            setMessageList(res.data || [])
        })
    })

    // 初始化获取消息中心
    useEffect(() => {
        if (userInfo.isLogin) {
            onFetchMessage()
        }
    }, [userInfo.isLogin, show])

    const onRefreshMessageSocketFun = useMemoizedFn((data: string) => {
        try {
            const obj: API.MessageLogDetail = JSONParseLog(data, {page: "FuncDomain", fun: "onRefreshMessageSocketFun"})
            setMessageList((prev) => {
                return [obj, ...prev]
            })
        } catch (error) {}
    })

    useEffect(() => {
        emiter.on("onRefreshMessageSocket", onRefreshMessageSocketFun)
        return () => {
            emiter.off("onRefreshMessageSocket", onRefreshMessageSocketFun)
        }
    }, [])

    const onRedAllMessage = useMemoizedFn(() => {
        apiFetchMessageRead({
            isAll: true,
            hash: ""
        }).then((ok) => {
            if (ok) {
                setMessageList((prev) => {
                    return prev.map((item) => {
                        return {...item, isRead: true}
                    })
                })
            }
        })
    })

    const notice = useMemo(() => {
        const isUpdateYakit = yakitLastVersion !== "" && removePrefixV(yakitLastVersion) !== removePrefixV(yakitVersion)
        const isUpdateYakitIntranet =
            yakitLastIntranetVersion !== "" && removePrefixV(yakitLastIntranetVersion) !== removePrefixV(yakitVersion)
        const isUpdateYaklang = lowerYaklangLastVersion

        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-notice-body"]}>
                    <div className={styles["notice-version-header"]}>
                        <YakitRadioButtons
                            value={noticeType}
                            onChange={(e) => {
                                const value = e.target.value
                                setNoticeType(value as "message" | "update")
                            }}
                            buttonStyle='solid'
                            options={[
                                {
                                    label: t("FuncDomain.messageCenter"),
                                    value: "message"
                                },
                                {
                                    label: t("FuncDomain.updateNotice"),
                                    value: "update"
                                }
                            ]}
                        />
                        {noticeType === "update" ? (
                            <div className={styles["switch-title"]}>
                                {t("FuncDomain.autoCheckUpdate")}
                                <YakitSwitch
                                    style={{marginLeft: 4}}
                                    showInnerText={true}
                                    size='large'
                                    checked={!isCheck}
                                    onChange={(val: boolean) => {
                                        setLocalValue(LocalGV.NoAutobootLatestVersionCheck, !val)
                                        setIsCheck(!val)
                                    }}
                                />
                            </div>
                        ) : (
                            <div className={styles["message-title"]}>
                                {userInfo.isLogin && (
                                    <>
                                        {messageList.length > 0 && (
                                            <>
                                                <YakitButton
                                                    type='text'
                                                    style={{fontWeight: 400}}
                                                    onClick={onRedAllMessage}
                                                >
                                                    {t("FuncDomain.allRead")}
                                                </YakitButton>
                                                <Divider type={"vertical"} style={{margin: "0px 8px 0px"}} />
                                            </>
                                        )}
                                        <YakitButton
                                            type='text'
                                            style={{fontWeight: 400, color: "#85899E"}}
                                            onClick={getAllMessage}
                                        >
                                            {t("FuncDomain.viewAll")}
                                        </YakitButton>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {noticeType === "update" ? (
                        <div className={styles["notice-version-wrapper"]}>
                            <div className={styles["version-wrapper"]}>
                                {/* 企业版内网Yakit更新 - 无需显示更新内容 */}
                                {yakitLastIntranetVersion.length > 0 && !isYakitIntranetDownloading && (
                                    <UIOpUpdateYakit
                                        version={yakitVersion}
                                        lastVersion={yakitLastIntranetVersion}
                                        isUpdateWait={isIntranetYakitUpdateWait}
                                        onDownload={onDownload}
                                        role={userInfo.role}
                                        isUpdate={isUpdateYakitIntranet}
                                        intranet={true}
                                        onResetUpdateWait={() => setIsIntranetYakitUpdateWait(false)}
                                    />
                                )}

                                <UIOpUpdateYakit
                                    version={yakitVersion}
                                    lastVersion={yakitLastVersion}
                                    isUpdateWait={isYakitUpdateWait}
                                    onDownload={onDownload}
                                    role={userInfo.role}
                                    updateContent={communityYakit}
                                    onUpdateEdit={UpdateContentEdit}
                                    isUpdate={isUpdateYakit}
                                    onResetUpdateWait={() => setIsYakitUpdateWait(false)}
                                />
                                <UIOpUpdateYaklang
                                    version={yaklangVersion}
                                    lastVersion={yaklangLastVersion}
                                    localVersion={yaklangLocalVersion}
                                    moreYaklangVersionList={moreYaklangVersionList}
                                    isRemoteMode={isRemoteMode}
                                    onDownload={onDownload}
                                    role={userInfo.role}
                                    updateContent={communityYaklang}
                                    onUpdateEdit={UpdateContentEdit}
                                    onNoticeShow={setShow}
                                    isUpdate={isUpdateYaklang}
                                    isUpdateYakit={isUpdateYakit}
                                />
                            </div>
                            <div className={styles["history-version"]}>
                                <div
                                    className={styles["content-style"]}
                                    onClick={() => ipcRenderer.invoke("open-url", WebsiteGV.YakitHistoryVersionAddress)}
                                >
                                    <GithubSvgIcon className={styles["icon-style"]} /> {t("FuncDomain.historyVersion")}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles["notice-info-wrapper"]}>
                            <MessageCenter
                                messageList={messageList}
                                getAllMessage={getAllMessage}
                                onLogin={() => {
                                    setShow(false)
                                    onLogin()
                                }}
                                onClose={() => setShow(false)}
                            />
                        </div>
                    )}
                </div>
            </div>
        )
    }, [
        isCheck,
        userInfo.role,
        userInfo.isLogin,
        yakitVersion,
        yakitLastVersion,
        isYakitUpdateWait,
        communityYakit,

        yaklangVersion,
        yaklangLastVersion,
        yaklangLocalVersion,
        moreYaklangVersionList,
        lowerYaklangLastVersion,
        isRemoteMode,
        communityYaklang,
        noticeType,
        messageList,
        isIntranetYakitUpdateWait
    ])

    const [__, taskModalInfo, taskErrModalInfo, debugTaskEvent] = useEETaskNotificationHook({})
    useEffect(() => {
        debugTaskEvent.startT()
    }, [userInfo.isLogin])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            visible={show}
            onVisibleChange={(visible) => {
                if (isShowEnpriTraceUpdateVisible) return
                if (editShow.visible) setShow(false)
                else setShow(visible)
            }}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge dot={isUpdate}>
                        <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
            <YakitModal
                title={
                    editShow.type === "yakit"
                        ? t("FuncDomain.updateNoticeTitleYakit", {edition: getReleaseEditionName(), version: yakitLastVersion})
                        : t("FuncDomain.updateNoticeTitleYaklang", {version: yaklangLastVersion})
                }
                centered={true}
                closable={true}
                type='white'
                size='large'
                visible={editShow.visible}
                cancelButtonProps={{loading: editLoading}}
                okButtonProps={{loading: editLoading}}
                onCancel={() => setEditShow({visible: false, type: "yakit"})}
                onOk={onSubmitEdit}
                bodyStyle={{padding: "16px 24px"}}
            >
                <div>
                    <YakitInput.TextArea
                        rows={10}
                        value={editInfo}
                        onChange={(e) => setEditInfo(e.target.value)}
                    ></YakitInput.TextArea>
                </div>
            </YakitModal>

            <YakitModal
                type='white'
                size='large'
                visible={isShowEnpriTraceUpdateVisible}
                title={t("FuncDomain.intranetUpdateTitle")}
                children={t("FuncDomain.intranetUpdateContent", {version: yakitLastIntranetVersion})}
                onCancel={() => {
                    setShowEnpriTraceUpdateVisible(false)
                }}
                maskClosable={false}
                footer={
                    <div style={{display: "flex", justifyContent: "flex-end", gap: 12, width: "100%"}}>
                        <YakitButton size='max' type='outline1' onClick={() => ipcRenderer.invoke("open-yakit-path")}>
                            {t("FuncDomain.openPath")}
                        </YakitButton>
                        <YakitButton
                            loading={intranetHintLoading}
                            size='max'
                            onClick={() => {
                                setIntranetHintLoading(true)
                                ipcRenderer
                                    .invoke("install-intranet-yakit", yakitIntranetFilePath)
                                    .then(() => {
                                        setShowEnpriTraceUpdateVisible(false)
                                    })
                                    .catch((e) => {
                                        failed(t("FuncDomain.intranetUpdateFailed", {error: String(e)}))
                                    })
                                    .finally(() => {
                                        setIntranetHintLoading(false)
                                    })
                            }}
                        >
                            {t("FuncDomain.updateNow")}
                        </YakitButton>
                    </div>
                }
            />

            {/* 任务通知 */}
            <YakitHint
                visible={taskModalInfo.visible}
                title={taskModalInfo.title}
                content={<TaskNotification taskList={taskModalInfo.data} />}
                okButtonText={taskModalInfo.okButtonText}
                onOk={debugTaskEvent.sureT}
                cancelButtonProps={taskModalInfo.cancelButtonProps}
                okButtonProps={{loading: taskModalInfo.loading}}
                wrapClassName={styles["task-notification-wrap"]}
                width={600}
            />
            {/* 创建任务重名 */}
            <YakitHint
                visible={taskErrModalInfo.visible}
                title={taskErrModalInfo.title}
                content={<TaskErrNotification reNames={taskErrModalInfo.data} />}
                okButtonText={taskErrModalInfo.okButtonText}
                cancelButtonText={taskErrModalInfo.cancelButtonText}
                onOk={debugTaskEvent.coverP}
                onCancel={debugTaskEvent.waitP}
                wrapClassName={styles["task-notification-wrap"]}
                width={600}
            />
        </YakitPopover>
    )
})

interface UIOpRiskProp {
    isEngineLink: boolean
}

/** 最新风险与漏洞信息 */
interface LatestRiskInfo {
    Title: string
    Id: number
    CreatedAt: number
    UpdatedAt: number
    Verbose: string
    TitleVerbose: string
    IsRead: boolean
}

interface RisksProps {
    Data: LatestRiskInfo[]
    Total: number
    NewRiskTotal: number
    /**全部未读 */
    Unread: number
}

/** 漏洞与风险等级对应关系 */
const RiskType: {[key: string]: string} = {
    信息: "info",
    低危: "low",
    中危: "middle",
    高危: "high",
    严重: "critical"
}
const UIOpRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const {isEngineLink} = props
    const {t} = useI18nNamespaces(["layout"])

    const [show, setShow] = useState<boolean>(false)

    /** 查询最新风险与漏洞信息节点 */
    const fetchNode = useRef<number>(0)
    const [risks, setRisks] = useState<RisksProps>({
        Data: [],
        Total: 0,
        NewRiskTotal: 0,
        Unread: 0
    })

    /** 定时器 */
    const timeRef = useRef<any>(null)

    /** 查询最新的风险数据 */
    const update = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-risk-info", {AfterId: fetchNode.current})
            .then((res: RisksProps) => {
                if (
                    JSON.stringify(risks.Data) === JSON.stringify(res.Data) &&
                    risks.NewRiskTotal === res.NewRiskTotal &&
                    risks.Total === res.Total
                ) {
                    return
                }

                const risksOjb: RisksProps = {
                    Total: res.Total,
                    NewRiskTotal: res.NewRiskTotal,
                    Unread: res.Unread,
                    Data: [...res.Data]
                }
                setRisks({...risksOjb})
            })
            .catch(() => {})
    })

    /** 获取最新的风险与漏洞信息(5秒一次) */
    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)

            ipcRenderer
                .invoke("QueryRisks", {
                    Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "id"}
                })
                .then((res: QueryGeneralResponse<Risk>) => {
                    const {Data} = res
                    fetchNode.current = Data.length === 0 ? 0 : Data[0].Id
                })
                .catch((e) => {})
                .finally(() => {
                    update()
                    emiter.on("onRefreshQueryNewRisk", update)
                    // 以下为兼容以前的引擎 PS:以前的引擎依然为轮询
                    if (!serverPushStatus) {
                        timeRef.current = setInterval(() => {
                            if (serverPushStatus) {
                                if (timeRef.current) clearInterval(timeRef.current)
                                timeRef.current = null
                                return
                            }
                            update()
                        }, 5000)
                    }
                })
            emiter.on("onRefRisksRead", onRefRisksRead)
            return () => {
                clearInterval(timeRef.current)
                emiter.off("onRefreshQueryNewRisk", update)
                emiter.off("onRefRisksRead", onRefRisksRead)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            fetchNode.current = 0
            setRisks({Data: [], Total: 0, NewRiskTotal: 0, Unread: 0})
        }
    }, [isEngineLink])

    const onRefRisksRead = useMemoizedFn((res) => {
        try {
            const value = JSONParseLog(res, {page: "FuncDomain", fun: "onRefRisksRead"})
            if (!!value.isAllRead) {
                // 全部已读
                setRisks({
                    ...risks,
                    Unread: 0,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => ({...item, IsRead: true}))
                })
            } else if (!!value.Id) {
                // 单条已读
                const newRiskTotal = risks.NewRiskTotal - 1
                const newUnread = risks.Unread - 1
                setRisks({
                    ...risks,
                    Unread: newUnread > 0 ? newUnread : 0,
                    NewRiskTotal: newRiskTotal > 0 ? newRiskTotal : 0,
                    Data: risks.Data.map((item) => {
                        if (item.Id === value.Id) item.IsRead = true
                        return item
                    })
                })
            }
        } catch (error) {}
    })

    /** 单条点击阅读 */
    const singleRead = useMemoizedFn((info: LatestRiskInfo) => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current, Ids: [info.Id]})
            .then((res: Risk) => {
                const newUnread = risks.Unread - 1 > 0 ? risks.Unread - 1 : 0
                const newRiskTotal = risks.NewRiskTotal - 1 > 0 ? risks.NewRiskTotal - 1 : 0
                setRisks({
                    ...risks,
                    NewRiskTotal: info.IsRead ? risks.NewRiskTotal : newRiskTotal,
                    Unread: info.IsRead ? risks.Unread : newUnread,
                    Data: risks.Data.map((item) => {
                        if (item.Id === info.Id && item.Title === info.Title) item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
        ipcRenderer
            .invoke("QueryRisk", {Id: info.Id})
            .then((res: Risk) => {
                if (!res) return
                showYakitModal({
                    width: "80%",
                    title: t("FuncDomain.details"),
                    content: (
                        <div style={{overflow: "auto", maxHeight: "70vh"}}>
                            {isShowCodeScanDetail(res) ? (
                                <YakitCodeScanRiskDetails info={res} />
                            ) : (
                                <YakitRiskDetails info={res} boxStyle={{height: 400}} />
                            )}
                        </div>
                    )
                })
            })
            .catch(() => {})
    })
    /** 全部已读 */
    const allRead = useMemoizedFn(() => {
        ipcRenderer
            .invoke("set-risk-info-read", {Ids: []})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    Unread: 0,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => {
                        item.IsRead = true
                        return item
                    })
                })
                emiter.emit("onRefRiskList")
            })
            .catch(() => {})
    })
    /** 查看全部 */
    const viewAll = useMemoizedFn(() => {
        addToTab(YakitRoute.DB_Risk)
        emiter.emit("onRefRiskList")
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-risk-body"]}>
                    <div className={styles["risk-header"]}>
                        {t("FuncDomain.vulnerabilityRiskStatistics", {total: risks.Total || 0, unread: risks.Unread || 0})}
                    </div>

                    <div className={styles["risk-info"]}>
                        {risks.Data.map((item) => {
                            const type = RiskType[item.Verbose]
                            if (!!type) {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <div
                                            className={classNames(styles["opt-icon-style"], styles[`opt-${type}-icon`])}
                                        >
                                            {item.Verbose}
                                        </div>
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis
                                                text={item.TitleVerbose || item.Title}
                                                width={type === "info" ? 280 : 310}
                                            />
                                        </Badge>
                                    </div>
                                )
                            } else {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={`${item.Title} ${item.Verbose}}`} width={350} />
                                        </Badge>
                                    </div>
                                )
                            }
                        })}
                    </div>

                    <div className={styles["risk-footer"]}>
                        <div className={styles["risk-footer-btn"]} onClick={allRead}>
                            {t("FuncDomain.allRead")}
                        </div>
                        <div className={styles["risk-footer-btn"]} onClick={viewAll}>
                            {t("FuncDomain.viewAll")}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [risks])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge count={risks.NewRiskTotal} offset={[2, 15]}>
                        <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
        </YakitPopover>
    )
})
const UIOpIRifyRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const {isEngineLink} = props
    const {t} = useI18nNamespaces(["layout"])

    const [show, setShow] = useState<boolean>(false)

    /** 查询最新风险与漏洞信息节点 */
    const fetchNode = useRef<number>(0)
    const [risks, setRisks] = useState<QueryNewSSARisksResponse>({
        Data: [],
        Total: 0,
        NewRiskTotal: 0,
        Unread: 0
    })

    /** 定时器 */
    const timeRef = useRef<any>(null)

    /** 查询最新的风险数据 */
    const update = useMemoizedFn(() => {
        apiQueryNewSSARisks({
            AfterID: fetchNode.current
        }).then((res: QueryNewSSARisksResponse) => {
            if (
                JSON.stringify(risks.Data) === JSON.stringify(res.Data) &&
                risks.NewRiskTotal === res.NewRiskTotal &&
                risks.Total === res.Total
            ) {
                return
            }
            setRisks({...res})
        })
    })

    /** 获取最新的风险与漏洞信息(5秒一次) */
    useEffect(() => {
        if (isEngineLink) {
            if (timeRef.current) clearInterval(timeRef.current)
            apiQuerySSARisks({
                Pagination: {
                    Limit: 1,
                    Page: 1,
                    Order: "desc",
                    OrderBy: "id"
                },
                Filter: {}
            })
                .then((res) => {
                    const {Data} = res
                    fetchNode.current = Data.length === 0 ? 0 : Data[0].Id
                })
                .catch((e) => {})
                .finally(() => {
                    update()
                    emiter.on("onRefreshQuerySSARisks", update)
                    // 以下为兼容以前的引擎 PS:以前的引擎依然为轮询
                    if (!serverPushStatus) {
                        timeRef.current = setInterval(() => {
                            if (serverPushStatus) {
                                if (timeRef.current) clearInterval(timeRef.current)
                                timeRef.current = null
                                return
                            }
                            update()
                        }, 5000)
                    }
                })
            emiter.on("onRefRisksRead", onRefRisksRead)
            return () => {
                clearInterval(timeRef.current)
                emiter.off("onRefreshQuerySSARisks", update)
                emiter.off("onRefRisksRead", onRefRisksRead)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            fetchNode.current = 0
            setRisks({Data: [], Total: 0, NewRiskTotal: 0, Unread: 0})
        }
    }, [isEngineLink])

    const onRefRisksRead = useMemoizedFn((res) => {
        try {
            const value = JSONParseLog(res, {page: "FuncDomain", fun: "onRefRisksRead-IRify"})
            if (!!value.isAllRead) {
                // 全部已读
                setRisks({
                    ...risks,
                    Unread: 0,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => ({...item, IsRead: true}))
                })
            } else if (!!value.Id) {
                // 单条已读
                const newRiskTotal = risks.NewRiskTotal - 1
                const newUnread = risks.Unread - 1
                setRisks({
                    ...risks,
                    Unread: newUnread > 0 ? newUnread : 0,
                    NewRiskTotal: newRiskTotal > 0 ? newRiskTotal : 0,
                    Data: risks.Data.map((item) => {
                        if (item.Id === value.Id) item.IsRead = true
                        return item
                    })
                })
            }
        } catch (error) {}
    })

    /** 单条点击阅读 */
    const singleRead = useMemoizedFn((info: SSARisk) => {
        apiNewRiskRead({ID: [info.Id]}).then(() => {
            const newUnread = risks.Unread - 1 > 0 ? risks.Unread - 1 : 0
            const newRiskTotal = risks.NewRiskTotal - 1 > 0 ? risks.NewRiskTotal - 1 : 0
            setRisks({
                ...risks,
                NewRiskTotal: info.IsRead ? risks.NewRiskTotal : newRiskTotal,
                Unread: info.IsRead ? risks.Unread : newUnread,
                Data: risks.Data.map((item) => {
                    if (item.Id === info.Id && item.Title === info.Title) item.IsRead = true
                    return item
                })
            })
        })
        apiQuerySSARisks({
            Pagination: {...genDefaultPagination()},
            Filter: {
                ID: [info.Id]
            }
        }).then((res) => {
            if (!res || res.Data.length === 0) return
            setShow(false)
            let m = showModal({
                width: "80%",
                    title: t("FuncDomain.details"),
                content: (
                    <div style={{overflow: "auto", maxHeight: "70vh"}}>
                        <YakitAuditRiskDetails info={res.Data[0]} isShowExtra={true} isExtraClick={() => m.destroy()} />
                    </div>
                )
            })
        })
    })
    /** 全部已读 */
    const allRead = useMemoizedFn(() => {
        apiNewRiskRead({ID: []}).then(() => {
            setRisks({
                ...risks,
                Unread: 0,
                NewRiskTotal: 0,
                Data: risks.Data.map((item) => {
                    item.IsRead = true
                    return item
                })
            })
            emiter.emit("onRefAuditRiskList")
        })
    })
    /** 查看全部 */
    const viewAll = useMemoizedFn(() => {
        addToTab(YakitRoute.YakRunner_Audit_Hole)
        emiter.emit("onRefAuditRiskList")
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-risk-body"]}>
                    <div className={styles["risk-header"]}>
                        {t("FuncDomain.vulnerabilityRiskStatistics", {total: risks.Total || 0, unread: risks.Unread || 0})}
                    </div>

                    <div className={styles["risk-info"]}>
                        {risks.Data.map((item) => {
                            const title = Object.keys(RiskType).filter((key) => RiskType[key] === item.Severity)?.[0]
                            if (!!title) {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <div
                                            className={classNames(
                                                styles["opt-icon-style"],
                                                styles[`opt-${item.Severity}-icon`]
                                            )}
                                        >
                                            {title}
                                        </div>
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis
                                                text={item.TitleVerbose || item.Title}
                                                width={item.Severity === "info" ? 280 : 310}
                                            />
                                        </Badge>
                                    </div>
                                )
                            } else {
                                return (
                                    <div
                                        className={styles["risk-info-opt"]}
                                        key={item.Id}
                                        onClick={() => singleRead(item)}
                                    >
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={`${item.Title} ${title}}`} width={350} />
                                        </Badge>
                                    </div>
                                )
                            }
                        })}
                    </div>

                    <div className={styles["risk-footer"]}>
                        <div className={styles["risk-footer-btn"]} onClick={allRead}>
                            {t("FuncDomain.allRead")}
                        </div>
                        <div className={styles["risk-footer-btn"]} onClick={viewAll}>
                            {t("FuncDomain.viewAll")}
                        </div>
                    </div>
                </div>
            </div>
        )
    }, [risks])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            visible={show}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge count={risks.NewRiskTotal} offset={[2, 15]}>
                        <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
        </YakitPopover>
    )
})

interface ScreenAndScreenshotProps {
    system: YakitSystem
    isRecording: boolean
    token: string
}
const ScreenAndScreenshot: React.FC<ScreenAndScreenshotProps> = React.memo((props) => {
    const {system, isRecording, token} = props
    const [show, setShow] = useState<boolean>(false)
    /** 截图功能的loading */
    const [screenshotLoading, setScreenshotLoading] = useState<boolean>(false)
    /** 录屏功能的loading */
    const [screenCapLoading, setScreenCapLoading] = useState<boolean>(false)
    const {t} = useI18nNamespaces(["layout"])

    const yakitMenuData = useCreation(() => {
        if (system === "Darwin" || system === "Windows_NT") {
            return [
                {
                    label: t("FuncDomain.performanceSampling"),
                    key: "performance-sampling"
                },
                {
                    label: t("FuncDomain.crashLogCollection"),
                    key: "crash-log"
                },
                {
                    label: isRecording ? (
                        <div
                            className={styles["stop-screen-menu-item"]}
                            onClick={() => {
                                ipcRenderer.invoke("cancel-StartScrecorder", token)
                            }}
                        >
                            {t("FuncDomain.stopScreenRecording")}
                        </div>
                    ) : (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>{t("FuncDomain.screenRecording")}</span>
                            {/* <span className={styles["shortcut-keys"]}>
                                {system === "Darwin"
                                    ? `${MacKeyborad[17]} ${MacKeyborad[16]} X`
                                    : `${WinKeyborad[17]} ${WinKeyborad[16]} X`}
                            </span> */}
                        </div>
                    ),
                    key: "screenCap"
                },
                {
                    label: (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>{t("FuncDomain.screenshot")}</span>
                            {
                                screenshotLoading && (
                                    <div
                                        className={styles["icon-loading-wrapper"]}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <LoadingOutlined className={styles["icon-hover-style"]} />
                                    </div>
                                )
                                // : (
                                //     <span className={styles["shortcut-keys"]}>
                                //         {system === "Darwin"
                                //             ? `${MacKeyborad[17]} ${MacKeyborad[16]} B`
                                //             : `${WinKeyborad[17]} ${WinKeyborad[16]} B`}
                                //     </span>
                                // )
                            }
                        </div>
                    ),
                    key: "screenshot"
                },
                {
                    type: "divider"
                },
                {
                    label: t("FuncDomain.screenRecordingManagement"),
                    key: "screen-recorder"
                }
            ]
        }
        return [
            {
                label: t("FuncDomain.performanceSampling"),
                key: "performance-sampling"
            },
            {
                label: isRecording ? (
                    <div
                        className={styles["stop-screen-menu-item"]}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", token)
                        }}
                    >
                        {t("FuncDomain.stopScreenRecording")}
                    </div>
                ) : (
                    <div className={styles["screen-and-screenshot-menu-item"]}>
                        <span>{t("FuncDomain.screenRecording")}</span>
                        <span className={styles["shortcut-keys"]}>{`${WinKeyborad[17]} ${WinKeyborad[16]} X`}</span>
                    </div>
                ),
                key: "screenCap"
            },
            {
                type: "divider"
            },
            {
                label: <span>{t("FuncDomain.screenRecordingManagement")}</span>,
                key: "screen-recorder"
            }
        ]
    }, [system, screenshotLoading, isRecording])
    const menuSelect = useMemoizedFn((type: string) => {
        setShow(false)
        switch (type) {
            case "performance-sampling":
                handlePerformanceSampling()
                break
            case "crash-log":
                handleCrashLog()
                break
            case "screenCap":
                if (isRecording) {
                    ipcRenderer.invoke("cancel-StartScrecorder", token)
                } else {
                    ipcRenderer.invoke("send-open-screenCap-modal")
                }

                break
            case "screenshot":
                if (screenshotLoading) return
                setScreenshotLoading(true)
                ipcRenderer.invoke("activate-screenshot")
                setTimeout(() => {
                    setScreenshotLoading(false)
                }, 1000)
                break
            case "screen-recorder":
                addToTab("**screen-recorder")
                break
            default:
                break
        }
    })

    // 性能采样
    const performanceModalRef = useRef<any>(null)
    const performanceModalLoading = useRef(false)
    const performanceParamsRef = useRef<{timeout: string}>({timeout: "10"})
    const {performanceSamplingInfo, setPerformanceSamplingLog, setSampling} = usePerformanceSampling()
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: performanceSamplingInfo.token,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setSampling(false)
        }
    })
    const streamInfoCom = useCampare(streamInfo)
    useEffect(() => {
        try {
            if (
                streamInfo.progressState.length &&
                streamInfo.progressState[0].id === "main" &&
                streamInfo.progressState[0].progress === 1
            ) {
                const logs: PerformanceSamplingLog[] = []
                streamInfo.logState.forEach((item) => {
                    if (item.level === "file") {
                        const {title, path, dir} = JSONParseLog(item.data, {page: "FuncDomain", fun: "useEffect"}) || {}
                        logs.push({title, path, dir})
                    }
                })
                setPerformanceSamplingLog(logs)
                yakitNotify("success", t("FuncDomain.samplingCompleted"))
            }
        } catch (error) {
            setPerformanceSamplingLog([])
        }
    }, [streamInfoCom])

    const handlePerformanceSampling = () => {
        if (performanceSamplingInfo.isPerformanceSampling) return
        if (performanceModalRef.current || performanceModalLoading.current) return // 已有弹窗或正在请求
        performanceModalLoading.current = true
        grpcFetchLocalPluginDetail({Name: t("FuncDomain.coreEngineSamplingPluginName")}, true)
            .then((res) => {
                const samplingPlugin = res
                const requiredParams = samplingPlugin.Params.filter(
                    (item) => item.Required && item.Field === "timeout"
                ).map((item) => {
                    item.TypeVerbose = "uint"
                    return item
                })
                let initRequiredFormValue: CustomPluginExecuteFormValue = {}
                samplingPlugin.Params.forEach((ele) => {
                    const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
                    initRequiredFormValue = {
                        ...initRequiredFormValue,
                        [ele.Field]: value
                    }
                })
                let m = showYakitModal({
                    title: t("FuncDomain.performanceSampling"),
                    width: 400,
                    closable: true,
                    centered: true,
                    maskClosable: false,
                    content: (
                        <PerformanceSampleForm
                            onPerformanceParams={(params) => {
                                performanceParamsRef.current = params
                            }}
                            initRequiredFormValue={initRequiredFormValue}
                            requiredParams={requiredParams}
                        ></PerformanceSampleForm>
                    ),
                    okButtonProps: {icon: <SolidPlayIcon />},
                    onOkText: t("FuncDomain.startDetection"),
                    onOk: () => {
                        const yakExecutorParams: YakExecutorParam[] = []
                        initRequiredFormValue["timeout"] = Number(performanceParamsRef.current.timeout) || 0
                        if (!initRequiredFormValue["timeout"]) {
                            yakitNotify("error", t("FuncDomain.detectionTimeMustBeGreaterThanZero"))
                            return
                        }
                        const executeParams: DebugPluginRequest = {
                            Code: "",
                            PluginType: samplingPlugin.Type,
                            Input: "",
                            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                            ExecParams: yakExecutorParams,
                            PluginName: samplingPlugin.ScriptName
                        }
                        executeParams.ExecParams = getYakExecutorParam({...initRequiredFormValue})
                        setPerformanceSamplingLog([])
                        debugPluginStreamEvent.reset()
                        apiDebugPlugin({
                            params: executeParams,
                            token: performanceSamplingInfo.token,
                            pluginCustomParams: samplingPlugin.Params
                        }).then(() => {
                            debugPluginStreamEvent.start()
                            setSampling(true)
                            m.destroy()
                            performanceModalRef.current = null
                            performanceModalLoading.current = false
                        })
                    },
                    onCancel: () => {
                        m.destroy()
                        performanceModalRef.current = null
                        performanceModalLoading.current = false
                    }
                })
                performanceModalRef.current = m
            })
            .catch(() => {
                performanceModalLoading.current = false
                yakitNotify("info", t("FuncDomain.pluginNotFoundCoreEngineSampling"))
            })
    }
    const cancelPerformanceSampling = () => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    }
    useEffect(() => {
        emiter.on("performanceSampling", handlePerformanceSampling)
        emiter.on("cancelPerformanceSampling", cancelPerformanceSampling)
        return () => {
            emiter.off("cancelPerformanceSampling", cancelPerformanceSampling)
            emiter.off("performanceSampling", handlePerformanceSampling)
        }
    }, [])

    // 崩溃日志收集
    const [crashLogVisible, setCrashLogVisible] = useState<boolean>(false)
    const crashLogParamsRef = useRef<{
        params: DebugPluginRequest
        pluginCustomParams?: YakParamProps[]
    }>()
    const handleCrashLog = () => {
        grpcFetchLocalPluginDetail({Name: t("FuncDomain.crashLogPluginName")}, true)
            .then((res) => {
                const executeParams: DebugPluginRequest = {
                    Code: "",
                    PluginType: res.Type,
                    Input: "",
                    HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                    ExecParams: [],
                    PluginName: res.ScriptName
                }
                crashLogParamsRef.current = {
                    params: executeParams,
                    pluginCustomParams: res.Params
                }
                setCrashLogVisible(true)
            })
            .catch(() => {
                yakitNotify("info", t("FuncDomain.pluginNotFoundCrashLog"))
            })
    }

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            data={yakitMenuData as YakitMenuItemProps[]}
            onClick={({key}) => menuSelect(key)}
        />
    )
    return (
        <>
            <YakitPopover
                overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
                overlayStyle={{paddingBottom: 0}}
                placement={"bottom"}
                content={menu}
                visible={show}
                onVisibleChange={(visible) => setShow(visible)}
                trigger={"click"}
            >
                <div className={styles["ui-op-btn-wrapper"]}>
                    <div className={classNames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                        <OutlineWrenchIcon
                            className={classNames(
                                show ? styles["icon-hover-style"] : styles["icon-style"],
                                styles["wrench-icon"]
                            )}
                        />
                    </div>
                </div>
            </YakitPopover>
            {crashLogVisible && (
                <CrashLogModal
                    crashLogParams={crashLogParamsRef.current}
                    onClose={() => {
                        setCrashLogVisible(false)
                    }}
                ></CrashLogModal>
            )}
        </>
    )
})

interface CrashLogModalProps {
    crashLogParams?: {
        params: DebugPluginRequest
        pluginCustomParams?: YakParamProps[]
    }
    onClose: () => void
}
const CrashLogModal: React.FC<CrashLogModalProps> = (props) => {
    const {crashLogParams, onClose} = props
    const {t} = useI18nNamespaces(["layout"])

    const tokenRef = useRef<string>(randomString(40))
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default")
    const [runtimeId, setRuntimeId] = useState<string>("")

    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => {
                setExecuteStatus("finished")
            }, 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    const isExecuting = useCreation(() => {
        if (executeStatus === "process") return true
        return false
    }, [executeStatus])

    const onStartExecute = useMemoizedFn(() => {
        if (crashLogParams) {
            debugPluginStreamEvent.reset()
            apiDebugPlugin({
                params: crashLogParams.params,
                token: tokenRef.current,
                pluginCustomParams: crashLogParams.pluginCustomParams
            }).then(() => {
                debugPluginStreamEvent.start()
                setExecuteStatus("process")
            })
        }
    })

    useEffect(() => {
        onStartExecute()
    }, [])

    const onCancel = useMemoizedFn(() => {
        debugPluginStreamEvent.stop()
        setRuntimeId("")
        onClose()
    })

    return (
        <YakitModal
            title={t("FuncDomain.crashLogCapture")}
            width={"70%"}
            visible={!!runtimeId}
            destroyOnClose
            onCancel={onCancel}
            footer={
                <div className={styles["crash-log-footer"]}>
                    <YakitButton onClick={onCancel}>{t("FuncDomain.cancel")}</YakitButton>
                </div>
            }
        >
            <div className={styles["crash-log-wrapper"]}>
                {streamInfo.progressState.length === 1 && (
                    <div className={styles["crash-log-progress"]}>
                        <PluginExecuteProgress
                            percent={streamInfo.progressState[0].progress}
                            name={streamInfo.progressState[0].id}
                        />
                    </div>
                )}
                <PluginExecuteResult
                    streamInfo={streamInfo}
                    runtimeId={runtimeId}
                    loading={isExecuting}
                    defaultActiveKey={t("FuncDomain.log")}
                    pluginExecuteResultWrapper={styles["plugin-execute-result-wrapper"]}
                />
            </div>
        </YakitModal>
    )
}

interface PerformanceSampleFormProp {
    onPerformanceParams: (params: {timeout: string}) => void
    initRequiredFormValue: CustomPluginExecuteFormValue
    requiredParams: YakParamProps[]
}
const PerformanceSampleForm: React.FC<PerformanceSampleFormProp> = (props) => {
    const {onPerformanceParams, initRequiredFormValue, requiredParams} = props
    const [form] = Form.useForm()

    return (
        <Form
            form={form}
            layout={"horizontal"}
            labelCol={{span: 8}}
            wrapperCol={{span: 15}}
            style={{marginTop: 10}}
            initialValues={initRequiredFormValue}
            onValuesChange={(changedValues, allValues) => {
                onPerformanceParams({...allValues})
            }}
        >
            <ExecuteEnterNodeByPluginParams paramsList={requiredParams} pluginType={"yak"} isExecuting={false} />
        </Form>
    )
}
