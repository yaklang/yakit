import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Modal, Tooltip, Avatar, Form, Typography} from "antd"
import {
    BellSvgIcon,
    RiskStateSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import {showModal} from "@/utils/showModal"
import {failed, info, success, yakitFailed, warn, yakitNotify} from "@/utils/notification"
import {ConfigPrivateDomain} from "../ConfigPrivateDomain/ConfigPrivateDomain"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YakitSettingCallbackType, YakitSystem, YaklangEngineMode} from "@/yakitGVDefine"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import Login from "@/pages/Login"
import {useStore, yakitDynamicStatus} from "@/store"
import {defaultUserInfo, MenuItemType, SetUserInfo} from "@/pages/MainOperator"
import {DropdownMenu} from "../baseTemplate/DropdownMenu"
import {loginOut} from "@/utils/login"
import {UserPlatformType} from "@/pages/globalVariable"
import SetPassword from "@/pages/SetPassword"
import SelectUpload from "@/pages/SelectUpload"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails} from "@/pages/risks/RiskTable"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu, YakitMenuItemProps} from "../yakitUI/YakitMenu/YakitMenu"
import {
    getReleaseEditionName,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseEdition,
    showDevTool
} from "@/utils/envfile"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {showPcapPermission} from "@/utils/ConfigPcapPermission"
import {GithubSvgIcon, PencilAltIcon, TerminalIcon, CameraIcon} from "@/assets/newIcon"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {YakitInput} from "../yakitUI/YakitInput/YakitInput"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {addToTab} from "@/pages/MainTabs"
import {DatabaseUpdateModal} from "@/pages/cve/CVETable"
import {ExclamationCircleOutlined, LoadingOutlined} from "@ant-design/icons"
import {DynamicControl, SelectControlType, ControlMyself, ControlOther} from "../../pages/dynamicControl/DynamicControl"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {MacKeyborad, WinKeyborad} from "../yakitUI/YakitEditor/editorUtils"
import {ScrecorderModal} from "@/pages/screenRecorder/ScrecorderModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitRoute} from "@/enums/yakitRoute"
import {RouteToPageProps} from "@/pages/layout/publicMenu/PublicMenu"
import {useRunNodeStore} from "@/store/runNode"
import emiter from "@/utils/eventBus/eventBus"
import {useTemporaryProjectStore} from "@/store/temporaryProject"
import {visitorsStatisticsFun} from "@/utils/visitorsStatistics"
import {serverPushStatus} from "@/utils/duplex/duplex"

import yakitImg from "../../assets/yakit.jpg"
import classNames from "classnames"
import styles from "./funcDomain.module.scss"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {YakitSpin} from "../yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "../yakitUI/YakitEmpty/YakitEmpty"
import {YakitHint} from "../yakitUI/YakitHint/YakitHint"
import {yakProcess} from "./PerformanceDisplay"

const {ipcRenderer} = window.require("electron")

export const judgeDynamic = (userInfo, avatarColor: string, active: boolean, dynamicConnect: boolean) => {
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
                    远程中
                </div>
            )}
        </div>
    )
}

/** 随机头像颜色 */
export const randomAvatarColor = () => {
    const colorArr: string[] = ["#8863F7", "#DA5FDD", "#4A94F8", "#35D8EE", "#56C991", "#F4736B", "#FFB660", "#B4BBCA"]
    let color: string = colorArr[Math.round(Math.random() * 7)]
    return color
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
    onYakEngineVersionList: (versionList: string[]) => void
    onYaklangLastVersion: (version: string) => void
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
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
        onYakEngineVersionList,
        onYaklangLastVersion
    } = props

    /** 登录用户信息 */
    const {userInfo, setStoreUserInfo} = useStore()

    const [loginShow, setLoginShow] = useState<boolean>(false)
    /** 用户功能菜单 */
    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {title: "退出登录", key: "sign-out"}
        // {title: "帐号绑定(监修)", key: "account-bind"}
    ])
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
        const LoginOutBox = () => <div className={styles["login-out-component"]}>退出登录</div>
        // 非企业管理员登录
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "plugin-aduit", title: "插件管理"},
                {key: "data-statistics", title: "数据统计"},
                {key: "sign-out", title: "退出登录", render: () => LoginOutBox()}
            ])
        }
        // 非企业超级管理员登录
        else if (userInfo.role === "superAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: "用户管理"},
                {key: "license-admin", title: "License管理"},
                {key: "plugin-aduit", title: "插件管理"},
                {key: "data-statistics", title: "数据统计"},
                {key: "sign-out", title: "退出登录", render: () => LoginOutBox()}
            ])
        }
        // 非企业操作员
        else if (userInfo.role === "operate" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "data-statistics", title: "数据统计"},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 非企业license管理员
        else if (userInfo.role === "licenseAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "license-admin", title: "License管理"},
                {key: "sign-out", title: "退出登录", render: () => LoginOutBox()}
            ])
        }
        // 企业用户管理员登录
        else if (userInfo.role === "admin" && userInfo.platform === "company") {
            let cacheMenu = (() => {
                if (isEnpriTraceAgent()) {
                    return [
                        {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
                        {key: "hole-collect", title: "漏洞汇总"},
                        {key: "role-admin", title: "角色管理"},
                        {key: "account-admin", title: "用户管理"},
                        {key: "set-password", title: "修改密码"},
                        {key: "plugin-aduit", title: "插件管理"},
                        {key: "sign-out", title: "退出登录", render: () => LoginOutBox()}
                    ]
                }
                let cacheMenu = [
                    {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
                    {key: "upload-data", title: "上传数据"},
                    {key: "dynamic-control", title: "发起远程"},
                    {key: "control-admin", title: "远程管理"},
                    {key: "close-dynamic-control", title: "退出远程"},
                    {key: "role-admin", title: "角色管理"},
                    {key: "account-admin", title: "用户管理"},
                    {key: "set-password", title: "修改密码"},
                    {key: "plugin-aduit", title: "插件管理"},
                    {key: "sign-out", title: "退出登录", render: () => LoginOutBox()}
                ]
                // 远程中时不显示发起远程 显示退出远程
                if (dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
                }
                // 非远程控制时显示发起远程 不显示退出远程
                if (!dynamicConnect) {
                    cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
                }
                return cacheMenu
            })()
            setUserMenu(cacheMenu)
        }
        // 企业用户非管理员登录
        else if (userInfo.role !== "admin" && userInfo.platform === "company") {
            let cacheMenu = [
                {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
                {key: "upload-data", title: "上传数据"},
                {key: "dynamic-control", title: "发起远程"},
                {key: "close-dynamic-control", title: "退出远程"},
                {key: "set-password", title: "修改密码"},
                {key: "plugin-aduit", title: "插件管理"},
                {key: "sign-out", title: "退出登录"}
            ]
            // 不为审核员时 移除插件管理
            if (userInfo.role !== "auditor") {
                cacheMenu = cacheMenu.filter((item) => item.key !== "plugin-aduit")
            }
            if (isEnpriTraceAgent()) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "upload-data")
            }
            // 远程中时不显示发起远程 显示退出远程
            if (dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "dynamic-control")
            }
            // 非远程控制时显示发起远程 不显示退出远程
            if (!dynamicConnect) {
                cacheMenu = cacheMenu.filter((item) => item.key !== "close-dynamic-control")
            }
            setUserMenu(cacheMenu)
        } else {
            setUserMenu([{key: "sign-out", title: "退出登录"}])
        }
    }, [userInfo.role, userInfo.companyHeadImg, dynamicConnect])

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
                        title: "录屏须知",
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
                yakitFailed("IsScrecorderReady失败:" + err)
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

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classNames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                {showDevTool() && <UIDevTool />}

                <ScreenAndScreenshot
                    system={system}
                    token={screenRecorderInfo.token}
                    isRecording={screenRecorderInfo.isRecording}
                />

                {!showProjectManage && (
                    <div
                        className={styles["ui-op-btn-wrapper"]}
                        onClick={() => {
                            getLocalValue(RemoteGV.ShowBaseConsole).then((val: boolean) => {
                                if (!val) {
                                    typeCallback("console")
                                }
                            })
                        }}
                    >
                        <div className={styles["op-btn-body"]}>
                            <Tooltip placement='bottom' title='引擎Console'>
                                <TerminalIcon className={classNames(styles["icon-style"], styles["size-style"])} />
                            </Tooltip>
                        </div>
                    </div>
                )}

                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    {!showProjectManage && <UIOpRisk isEngineLink={isEngineLink} />}
                    {isCommunityEdition() && (
                        <UIOpNotice
                            isEngineLink={isEngineLink}
                            isRemoteMode={isRemoteMode}
                            onYakEngineVersionList={onYakEngineVersionList}
                            onYaklangLastVersion={onYaklangLastVersion}
                        />
                    )}
                    {!showProjectManage && (
                        <UIOpSetting
                            engineMode={engineMode}
                            onEngineModeChange={onEngineModeChange}
                            typeCallback={typeCallback}
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
                                    <DropdownMenu
                                        menu={{
                                            data: userMenu
                                        }}
                                        dropdown={{
                                            placement: "bottom",
                                            trigger: ["click"],
                                            overlayClassName: "user-dropdown-menu-box",
                                            onVisibleChange: (value: boolean) => {
                                                setDynamicMenuOpen(value)
                                            }
                                        }}
                                        onClick={(key) => {
                                            setDynamicMenuOpen(false)
                                            if (key === "sign-out") {
                                                if (
                                                    dynamicStatus.isDynamicStatus ||
                                                    dynamicStatus.isDynamicSelfStatus
                                                ) {
                                                    Modal.confirm({
                                                        title: "温馨提示",
                                                        icon: <ExclamationCircleOutlined />,
                                                        content: "点击退出登录将自动退出远程控制，是否确认退出",
                                                        cancelText: "取消",
                                                        okText: "退出",
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
                                                                        setTimeout(() => success("已成功退出账号"), 500)
                                                                    })
                                                                // 立即退出界面
                                                                ipcRenderer.invoke("lougin-out-dynamic-control-page")
                                                            }
                                                        },
                                                        onCancel() {}
                                                    })
                                                } else {
                                                    setStoreUserInfo(defaultUserInfo)
                                                    loginOut(userInfo)
                                                    setTimeout(() => success("已成功退出账号"), 500)
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
                                            if (key === "plugin-aduit") {
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
                                            if (key === "dynamic-control") {
                                                setDynamicControlModal(true)
                                            }
                                            if (key === "close-dynamic-control") {
                                                ipcRenderer.invoke("lougin-out-dynamic-control", {loginOut: false})
                                            }
                                        }}
                                    >
                                        {userInfo.platform === "company" ? (
                                            judgeDynamic(userInfo, avatarColor.current, dynamicMenuOpen, dynamicConnect)
                                        ) : (
                                            <img
                                                src={
                                                    userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg
                                                }
                                                style={{width: 24, height: 24, borderRadius: "50%"}}
                                            />
                                        )}
                                    </DropdownMenu>
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
            <Modal
                visible={passwordShow}
                closable={passwordClose}
                title={"修改密码"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setPasswordShow(false)}
                footer={null}
            >
                <SetPassword onCancel={() => setPasswordShow(false)} userInfo={userInfo} />
            </Modal>

            <Modal
                visible={uploadModalShow}
                title={"上传数据"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={520}
                onCancel={() => setUploadModalShow(false)}
                footer={null}
            >
                <SelectUpload onCancel={() => setUploadModalShow(false)} />
            </Modal>

            <DynamicControl
                mainTitle={"远程控制"}
                secondTitle={"请选择你的角色"}
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
                mainTitle={"受控端"}
                secondTitle={"复制密钥，并分享给控制端用户"}
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
                mainTitle={"控制端"}
                secondTitle={"可通过受控端分享的密钥远程控制他的 客户端"}
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
                throw Error("请输入ip/域名、端口号、节点名")
            }
            if (hasRunNodeInList(JSON.stringify(params))) {
                throw Error("相同节点正在运行")
            }
            const res = await ipcRenderer.invoke("call-command-generate-node", {
                ipOrdomain: params.ipOrdomain,
                port: params.port,
                nodename: params.nodename
            })
            setRunNodeList(JSON.stringify(params), res + "")
            yakitNotify("success", "成功开启运行节点")
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
            title='运行节点'
            width={506}
            maskClosable={false}
            closable={true}
            visible={visible}
            okText='确认'
            onCancel={onCloseModal}
            onOk={onOKFun}
        >
            <div>
                <div style={{fontSize: 12, color: "#85899e", marginBottom: 10}}>
                    运行节点会占用引擎资源，建议运行节点的时候，适度使用Yakit，否则会造成节点运行任务缓慢，可以运行多个节点（运行在不同平台，或统一平台节点名称不同）。
                </div>
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
                        label='平台IP/域名'
                        name='ipOrdomain'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "请输入平台IP/域名"}]}
                    >
                        <YakitInput placeholder='请输入平台IP/域名' maxLength={100} showCount />
                    </Form.Item>
                    <Form.Item
                        label='平台端口'
                        name='port'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "请输入平台端口"}]}
                    >
                        <YakitInput placeholder='请输入平台端口' maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item
                        label='节点名称'
                        name='nodename'
                        style={{marginBottom: 4}}
                        rules={[{required: true, message: "请输入节点名称"}]}
                    >
                        <YakitInput placeholder='请输入节点名称' maxLength={50} showCount />
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
}

const GetUIOpSettingMenu = () => {
    // 便携版
    if (isEnpriTraceAgent()) {
        return [
            {
                key: "pcapfix",
                label: "网卡权限修复"
            },
            {
                key: "store",
                label: "配置插件源"
            },
            {
                key: "system-manager",
                label: "进程与缓存管理",
                children: [{key: "invalidCache", label: "删除缓存数据"}]
            },
            {
                key: "diagnose-network",
                label: "网络诊断"
            },
            {
                key: "link",
                label: "切换连接模式",
                children: [
                    {label: "本地", key: "local"},
                    {label: "远程", key: "remote"}
                ]
            }
        ]
    }

    // 默认社区版
    return [
        {
            key: "pcapfix",
            label: "网卡权限修复"
        },
        {
            key: "project",
            label: "项目管理",
            children: [
                {label: "切换项目", key: "changeProject"},
                {label: "加密导出", key: "encryptionProject"},
                {label: "明文导出", key: "plaintextProject"}
            ]
        },
        {
            key: "explab",
            label: "试验性功能",
            children: [
                {
                    key: "bas-chaosmaker",
                    label: "BAS实验室"
                },
                // {
                //     key: "debug-plugin",
                //     label: "插件调试功能"
                // },
                {
                    key: "debug-monaco-editor",
                    label: "(DEV)调试Playground"
                },
                {
                    key: "vulinbox-manager",
                    label: "(靶场)Vulinbox"
                },
                {
                    key: "debug-traffic-analize",
                    label: "流量分析"
                },
                {
                    key: "run-node",
                    label: "运行节点"
                },
                {
                    key: "webshell-manager",
                    label: "网站管理"
                }
            ]
        },
        {type: "divider"},
        {
            key: "system-manager",
            label: "进程与缓存管理",
            children: [{key: "invalidCache", label: "删除缓存数据"}]
        },
        {
            key: "store",
            label: "配置插件源"
        },
        {
            key: "cve-database",
            label: "CVE 数据库",
            children: [
                {label: "全量更新", key: "cve-database-all-update"},
                {label: "差量更新", key: "cve-database-differential-update"}
            ]
        },
        {
            key: "link",
            label: "切换连接模式",
            children: [
                {label: "本地", key: "local"},
                {label: "远程", key: "remote"}
            ]
        },
        {type: "divider"},
        {
            key: "systemSet",
            label: "系统设置",
            children: [
                {key: "reverse", label: "全局反连"},
                {key: "agent", label: "系统代理"},
                // { key: "engineVar",label: "引擎环境变量" },
                {key: "config-network", label: "全局配置"}
            ]
        },
        {
            key: "diagnose-network",
            label: "网络诊断"
        },
        {
            key: "refreshMenu",
            label: "刷新菜单"
        }
    ]
}

const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, onEngineModeChange, typeCallback} = props

    const [runNodeModalVisible, setRunNodeModalVisible] = useState<boolean>(false)
    const [show, setShow] = useState<boolean>(false)
    const [dataBaseUpdateVisible, setDataBaseUpdateVisible] = useState<boolean>(false)
    const [available, setAvailable] = useState(false) // cve数据库是否可用
    const [isDiffUpdate, setIsDiffUpdate] = useState(false)
    const {dynamicStatus} = yakitDynamicStatus()
    const {delTemporaryProject} = useTemporaryProjectStore()

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
                yakitFailed("IsCVEDatabaseReady失败：" + err)
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
                    warn("远程控制中，暂无法修改")
                    return
                }
                const m = showYakitModal({
                    title: "配置私有域",
                    type: "white",
                    footer: null,
                    maskClosable: false,
                    // onCancel: () => m.destroy(),
                    content: <ConfigPrivateDomain onClose={() => m.destroy()} />
                })
                return m
            case "reverse":
                showModal({
                    title: "配置全局反连",
                    width: 800,
                    content: (
                        <div style={{width: 800}}>
                            <ConfigGlobalReverse />
                        </div>
                    )
                })
                return
            case "agent":
                showConfigSystemProxyForm()
                return
            case "engineVar":
                showConfigYaklangEnvironment()
                return
            case "remote":
                if (dynamicStatus.isDynamicStatus) {
                    warn("远程控制中，暂无法修改")
                    return
                }
                onEngineModeChange(type)
                return
            case "local":
                if (dynamicStatus.isDynamicStatus) {
                    warn("远程控制中，暂无法修改")
                    return
                }
                if (type === engineMode) {
                    warn("已为本地连接")
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
            case "debug-plugin":
                addToTab("**debug-plugin")
                return
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
            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            width={142}
            selectedKeys={[]}
            // triggerSubMenuAction={'click'}
            data={GetUIOpSettingMenu() as YakitMenuItemProps[]}
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
        </>
    )
})

const UIDevTool: React.FC = React.memo(() => {
    const [show, setShow] = useState<boolean>(false)

    const {delTemporaryProject} = useTemporaryProjectStore()

    const menuSelect = useMemoizedFn(async (type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                await delTemporaryProject()
                ipcRenderer.invoke("trigger-reload")
                return
            case "reloadCache":
                await delTemporaryProject()
                ipcRenderer.invoke("trigger-reload-cache")
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
                    label: "控制台"
                },
                {
                    key: "reload",
                    label: "刷新"
                },
                {
                    key: "reloadCache",
                    label: "强制刷新"
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
    version: string
    lastVersion: string
    localVersion?: string
    moreYaklangVersionList?: string[]
    lowerYaklangLastVersion?: boolean
    isUpdateWait?: boolean
    isRemoteMode?: boolean
    onDownload: (type: "yakit" | "yaklang") => any
    role?: string | null
    updateContent?: string
    onUpdateEdit?: (type: "yakit" | "yaklang") => any
    removePrefixV: (version: string) => string
    onNoticeShow?: (visible: boolean) => void
}

/** @name Yakit版本 */
const UIOpUpdateYakit: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {
        version,
        lastVersion,
        isUpdateWait,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit,
        removePrefixV
    } = props

    const isUpdate = lastVersion !== "" && removePrefixV(lastVersion) !== removePrefixV(version)

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

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
                    {/* 等使用更新内容时，下面"当前版本"-div需要被删除 */}
                    <div>
                        <div className={styles["update-title"]}>{`社区版 ${getReleaseEditionName()} ${
                            lastVersion || version
                        }`}</div>
                        <div className={styles["update-time"]}>{`当前版本: ${version}`}</div>
                        {/* <div className={styles["update-time"]}>2022-10-01</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isUpdateWait ? (
                        <YakitButton onClick={() => ipcRenderer.invoke("open-yakit-path")}>{`安装 `}</YakitButton>
                    ) : lastVersion === "" ? (
                        "获取失败"
                    ) : isUpdate ? (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yakit")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            立即下载
                        </div>
                    ) : (
                        "已是最新"
                    )}
                    {role === "superAdmin" && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yakit")
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>管理员未编辑更新通知</div>
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
                {/* <div className={styles["current-version"]}>当前版本：Yakit 1.1.3-sq1</div> */}
            </div>
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
        lowerYaklangLastVersion = false,
        isRemoteMode = false,
        onDownload,
        role,
        updateContent = "",
        onUpdateEdit,
        removePrefixV,
        onNoticeShow = () => {}
    } = props

    const [moreVersionPopShow, setMoreVersionPopShow] = useState<boolean>(false)

    const isUpdate = lowerYaklangLastVersion
    const isKillEngine =
        localVersion &&
        removePrefixV(localVersion) !== removePrefixV(version) &&
        removePrefixV(localVersion) === removePrefixV(lastVersion) &&
        !lowerYaklangLastVersion

    const content: string[] = useMemo(() => {
        if (updateContent) {
            const strs = updateContent.split("\n")
            return strs
        }
        return []
    }, [updateContent])

    const showPencilAltIcon = useMemo(() => {
        return !isRemoteMode && role === "superAdmin"
    }, [isRemoteMode, role])

    const versionTextMaxWidth = useMemo(() => {
        // 更多版本 立即更新 管理员编辑
        if (isUpdate && showPencilAltIcon) return 150
        // 更多版本 获取失败 管理员编辑
        if (!lastVersion && showPencilAltIcon) return 175
        // 更多版本 立即更新
        if (isUpdate) return 179
        // 更多版本 已是最新 管理员编辑
        if (lastVersion && !isUpdate && !isKillEngine && showPencilAltIcon) return 170
        // 更多版本 其他
        return 190
    }, [isUpdate, showPencilAltIcon, lastVersion])

    return (
        <div
            className={classNames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && (isUpdate || isKillEngine)
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    <div
                        style={{
                            width: versionTextMaxWidth
                        }}
                    >
                        <div className={styles["update-title"]}>{`Yaklang ${lastVersion || version}`}</div>
                        <div className={styles["update-time"]}>{`当前版本: ${version}`}</div>
                        {/* <div className={styles["upda te-time"]}>2022-09-29</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isRemoteMode ? (
                        <>{isUpdate && "远程连接无法更新"}</>
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
                                    ></MoreYaklangVersion>
                                }
                                onVisibleChange={(visible) => {
                                    setMoreVersionPopShow(visible)
                                }}
                            >
                                <div className={styles["more-version-btn"]}>更多版本</div>
                            </YakitPopover>
                            {isUpdate && (
                                <div className={styles["update-btn"]} onClick={() => onDownload("yaklang")}>
                                    <UpdateSvgIcon style={{marginRight: 4}} />
                                    立即更新
                                </div>
                            )}
                            {isKillEngine && (
                                <YakitButton
                                    onClick={() => ipcRenderer.invoke("kill-old-engine-process")}
                                >{`更新 `}</YakitButton>
                            )}
                            {!lastVersion ? "获取失败" : !isUpdate && !isKillEngine && "已是最新"}
                        </>
                    )}
                    {showPencilAltIcon && (
                        <div
                            className={styles["edit-func"]}
                            onClick={() => {
                                if (onUpdateEdit) onUpdateEdit("yaklang")
                            }}
                        >
                            <PencilAltIcon className={styles["edit-icon"]} />
                        </div>
                    )}
                </div>
            </div>

            <div className={styles["update-content-wrapper"]}>
                <div
                    className={classNames({
                        [styles["update-content"]]: role !== "superAdmin",
                        [styles["update-admin-content"]]: role === "superAdmin"
                    })}
                >
                    {content.length === 0 ? (
                        <div className={role === "superAdmin" ? styles["empty-content"] : ""}>管理员未编辑更新通知</div>
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
                {/* <div className={styles["current-version"]}>当前版本：Yaklang 1.1.3-sp3-5</div> */}
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
        emiter.emit("downYaklangSpecifyVersion", JSON.stringify({version, isUpdate: false}))
    }

    return (
        <div className={styles["more-versions-popover-content"]}>
            <div className={styles["search-version-header"]}>
                <YakitInput
                    value={searchVersionVal}
                    size='middle'
                    prefix={<OutlineSearchIcon className='search-icon' />}
                    allowClear={true}
                    onChange={(e) => onSearchVersion(e.target.value.trim())}
                />
            </div>
            <div className={styles["version-list-wrap"]}>
                {renderVersionList.length ? (
                    <>
                        {renderVersionList.map((v) => (
                            <div
                                className={styles["version-list-item"]}
                                key={v}
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

interface UIOpLetterProps {}

/** @name 插件商店消息及系统消息 */
const UIOpLetter: React.FC<UIOpLetterProps> = React.memo((props) => {
    const LetterInfo = useMemoizedFn((type: string) => {
        return (
            <div key={type} className={styles["letter-info-wrapper"]}>
                <div className={styles["info-header"]}>
                    <BellSvgIcon />
                </div>
                {type === "follow" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>又又呀～</span>
                            &nbsp;关注了你
                        </div>
                        <div className={styles["content-time"]}>3 小时前</div>
                    </div>
                )}
                {type === "star" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>桔子爱吃橘子</span>
                            &nbsp;赞了你的插件&nbsp;
                            <span className={styles["accent-content"]}>致远OA Session泄露漏洞检测</span>
                        </div>
                        <div className={styles["content-time"]}>7 小时前</div>
                    </div>
                )}
                {type === "commit" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>桔子爱吃橘子</span>
                            &nbsp;评论了你的插件&nbsp;
                            <span className={styles["accent-content"]}>Websphere弱口令检测</span>
                        </div>
                        <div className={styles["content-commit"]}>“大佬，牛批！”</div>
                        <div className={styles["content-time"]}>3 天前</div>
                    </div>
                )}
                {type === "issue" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>Alex-null</span>
                            &nbsp;向你提交了&nbsp;
                            <span className={styles["accent-content"]}>issue</span>
                        </div>
                        <div className={styles["content-time"]}>2022-10-09</div>
                    </div>
                )}
                {type === "system" && (
                    <div className={styles["info-content"]}>
                        <div className={styles["content-body"]}>
                            <span className={styles["accent-content"]}>系统消息</span>
                        </div>
                        <div className={styles["content-commit"]}>
                            手把手教学，从入门到实战！Yak Events 9月16号下午3点，Yak Project直播间不见不散！
                        </div>
                        <div className={styles["content-time"]}>2022-10-01</div>
                    </div>
                )}
            </div>
        )
    })

    return (
        <div className={styles["letter-wrapper"]}>
            {["follow", "star", "commit", "issue", "system"].map((item) => LetterInfo(item))}
        </div>
    )
})

interface UIOpNoticeProp {
    isEngineLink: boolean
    isRemoteMode: boolean
    onYakEngineVersionList: (versionList: string[]) => void
    onYaklangLastVersion: (version: string) => void
}

export interface UpdateContentProp {
    version: string
    content: string
}

export interface FetchUpdateContentProp {
    source: "company" | "community"
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
}

const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const {isEngineLink, isRemoteMode, onYakEngineVersionList, onYaklangLastVersion} = props

    const {userInfo} = useStore()

    const [show, setShow] = useState<boolean>(false)
    const [type, setType] = useState<"letter" | "update">("update")

    /** Yakit版本号 */
    const [yakitVersion, setYakitVersion] = useState<string>("dev")
    const [yakitLastVersion, setYakitLastVersion] = useState<string>("")
    const yakitTime = useRef<any>(null)

    /** Yaklang引擎版本号 */
    const [yaklangVersion, setYaklangVersion] = useState<string>("dev")
    const [yaklangLastVersion, setYaklangLastVersion] = useState<string>("") // 官方推荐的最新版
    const [yaklangLocalVersion, setYaklangLocalVersion] = useState<string>("")
    const [moreYaklangVersionList, setMoreYaklangVersionList] = useState<string[]>([]) // 更多引擎版本list
    const yaklangTime = useRef<any>(null)
    const moreYaklangTime = useRef<any>(null)
    // 是否低于主推引擎版本
    const lowerYaklangLastVersion = useMemo(() => {
        if (!moreYaklangVersionList.length) return false
        if (!yaklangLastVersion) return false
        const index1 = moreYaklangVersionList.indexOf(yaklangLastVersion)
        const index2 = moreYaklangVersionList.indexOf(yaklangVersion)
        const index3 = moreYaklangVersionList.indexOf(yaklangLocalVersion)
        if (index2 === -1 && index3 === -1) return true
        if (index2 > index1 && index3 > index1) return true
        return false
    }, [moreYaklangVersionList, yaklangLastVersion, yaklangVersion, yaklangLocalVersion])
    useEffect(() => {
        onYakEngineVersionList(moreYaklangVersionList)
    }, [moreYaklangVersionList])
    useEffect(() => {
        onYaklangLastVersion(yaklangLastVersion)
    }, [yaklangLastVersion])
    const versionsInfoTime = useRef<any>(null)
    const [communityYakitContent, setCommunityYakitContent] = useState<UpdateContentProp>({version: "", content: ""})
    const [communityYaklangContent, setCommunityYaklangContent] = useState<UpdateContentProp>({
        version: "",
        content: ""
    })

    const removePrefixV = (version: string) => {
        return version.startsWith("v") ? version.slice(1) : version
    }
    const communityYakit: string = useMemo(() => {
        if (!yakitLastVersion) return ""
        const lastVersion = removePrefixV(yakitLastVersion)
        const contentVersion = removePrefixV(communityYakitContent.version)
        if (lastVersion !== contentVersion) return ""
        if (lastVersion === contentVersion) return communityYakitContent.content
        return ""
    }, [yakitLastVersion, communityYakitContent])
    const communityYaklang: string = useMemo(() => {
        if (!yaklangLastVersion) return ""
        const lastVersion = removePrefixV(yaklangLastVersion)
        const contentVersion = removePrefixV(communityYaklangContent.version)
        if (lastVersion !== contentVersion) return ""
        if (lastVersion === contentVersion) return communityYaklangContent.content
        return ""
    }, [yaklangLastVersion, communityYaklangContent])

    /** 是否启动检测更新 */
    const [isCheck, setIsCheck] = useState<boolean>(true)

    /**获取社区版yakit&yaklang更新内容 */
    const fetchYakitAndYaklangVersionInfo = useMemoizedFn(() => {
        NetWorkApi<any, API.YakVersionsInfoResponse>({
            method: "get",
            url: "yak/versions/info"
        })
            .then((res: API.YakVersionsInfoResponse) => {
                if (!res) return
                const data = res.data || []
                try {
                    data.forEach((item) => {
                        if (item.type === "yakit") {
                            const content: UpdateContentProp = JSON.parse(item.content)
                            setCommunityYakitContent({...content})
                        } else if (item.type === "yaklang") {
                            const content: UpdateContentProp = JSON.parse(item.content)
                            setCommunityYaklangContent({...content})
                        }
                    })
                } catch (error) {}
            })
            .catch((err) => {})
    })
    /** 获取最新Yakit版本号 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        /** 社区版埋点 */
        visitorsStatisticsFun()
        /** 社区版获取yakit最新版本号 */
        ipcRenderer
            .invoke("fetch-latest-yakit-version")
            .then((data: string) => {
                if (yakitVersion !== data) setYakitLastVersion(data)
            })
            .catch(() => {
                setYakitLastVersion("")
            })
    })
    /** 获取最新官方推荐Yaklang版本号和本地版本号 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                if (yaklangVersion !== data) setYaklangLastVersion(data.startsWith("v") ? data.slice(1) : data)
            })
            .catch((err) => {
                setYaklangLastVersion("")
            })
        if (!isRemoteMode) {
            ipcRenderer
                .invoke("get-current-yak")
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

    /** 接收本地Yaklang引擎版本号信息 */
    useEffect(() => {
        if (isEngineLink) {
            ipcRenderer.on("fetch-yak-version-callback", async (e: any, data: string) => {
                setYaklangVersion(data || "dev")
            })
        }
    }, [isEngineLink])

    useEffect(() => {
        if (isEngineLink) {
            getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
                setIsCheck(val)
            })
            /** 获取社区版yakit&yaklang更新内容 */
            if (versionsInfoTime.current) clearInterval(versionsInfoTime.current)
            fetchYakitAndYaklangVersionInfo()
            versionsInfoTime.current = setInterval(fetchYakitAndYaklangVersionInfo, 60000)
            /** 获取本地Yakit版本号，启动获取最新Yakit版本的定时器 */
            ipcRenderer.invoke("fetch-yakit-version").then((v: string) => setYakitVersion(`v${v}`))
            if (yakitTime.current) clearInterval(yakitTime.current)
            fetchYakitLastVersion()
            yakitTime.current = setInterval(fetchYakitLastVersion, 60000)

            /** 获取本地Yaklang版本号，启动获取最新Yaklang版本的定时器 */
            ipcRenderer.invoke("fetch-yak-version")
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            fetchYaklangLastVersion()
            yaklangTime.current = setInterval(fetchYaklangLastVersion, 60000)

            if (moreYaklangTime.current) clearInterval(moreYaklangTime.current)
            fetchMoreYaklangLastVersion()
            moreYaklangTime.current = setInterval(fetchMoreYaklangLastVersion, 60000)

            return () => {
                clearInterval(versionsInfoTime.current)
                clearInterval(yakitTime.current)
                clearInterval(yaklangTime.current)
                clearInterval(moreYaklangTime.current)
            }
        } else {
            if (versionsInfoTime.current) clearInterval(versionsInfoTime.current)
            versionsInfoTime.current = null
            /** 清空Yakit引擎相关版本号和定时器 */
            if (yakitTime.current) clearInterval(yakitTime.current)
            yakitTime.current = null
            setYakitLastVersion("")
            /** 清空Yaklang引擎相关版本号和定时器 */
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            yaklangTime.current = null
            setYaklangLastVersion("")
            /** 清空更多版本Yaklang引擎相关版本号和定时器 */
            if (moreYaklangTime.current) clearInterval(moreYaklangTime.current)
            moreYaklangTime.current = null
            setMoreYaklangVersionList([])
        }
    }, [isEngineLink])

    const onDownload = useMemoizedFn((type: "yakit" | "yaklang") => {
        setShow(false)
        if (type === "yakit") {
            emiter.emit("activeUpdateYakitOrYaklang", type)
        } else {
            emiter.emit("downYaklangSpecifyVersion", JSON.stringify({version: yaklangLastVersion, isUpdate: true}))
        }
    })

    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    /** 监听下载 yaklang 或 yakit 成功后是否稍后安装 */
    useEffect(() => {
        const onsetIsYakitUpdateWait = () => {
            setIsYakitUpdateWait(true)
        }

        emiter.on("downloadedYakitFlag", onsetIsYakitUpdateWait)
        return () => {
            emiter.off("downloadedYakitFlag", onsetIsYakitUpdateWait)
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
        setEditLoading(true)
        const params: SetUpdateContentProp = {
            type: editShow.type,
            source: "community",
            updateContent: JSON.stringify({
                version: editShow.type === "yakit" ? yakitLastVersion : yaklangLastVersion,
                content: editInfo || ""
            })
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

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-notice-body"]}>
                    {/* <div className={styles["notice-tabs-wrapper"]}>
                        <div className={styles["notice-tabs-body"]}>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "letter"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("letter")
                                }}
                            >
                                <Badge dot offset={[4, 0]}>
                                    私信
                                </Badge>
                            </div>
                            <div
                                className={classNames(styles["tabs-opt"], {
                                    [styles["tabs-opt-selected"]]: type === "update"
                                })}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setType("update")
                                }}
                            >
                                更新通知
                            </div>
                        </div>
                    </div> */}
                    <div className={styles["notice-version-header"]}>
                        <div className={styles["header-title"]}>更新通知</div>
                        <div className={styles["switch-title"]}>
                            启动检测更新
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
                    </div>

                    {type === "update" && (
                        <div className={styles["notice-version-wrapper"]}>
                            <div className={styles["version-wrapper"]}>
                                <UIOpUpdateYakit
                                    version={yakitVersion}
                                    lastVersion={yakitLastVersion}
                                    isUpdateWait={isYakitUpdateWait}
                                    onDownload={onDownload}
                                    role={userInfo.role}
                                    updateContent={communityYakit}
                                    onUpdateEdit={UpdateContentEdit}
                                    removePrefixV={removePrefixV}
                                />
                                <UIOpUpdateYaklang
                                    version={yaklangVersion}
                                    lastVersion={yaklangLastVersion}
                                    localVersion={yaklangLocalVersion}
                                    moreYaklangVersionList={moreYaklangVersionList}
                                    lowerYaklangLastVersion={lowerYaklangLastVersion}
                                    isRemoteMode={isRemoteMode}
                                    onDownload={onDownload}
                                    role={userInfo.role}
                                    updateContent={communityYaklang}
                                    onUpdateEdit={UpdateContentEdit}
                                    removePrefixV={removePrefixV}
                                    onNoticeShow={setShow}
                                />
                            </div>
                            <div className={styles["history-version"]}>
                                <div
                                    className={styles["content-style"]}
                                    onClick={() => ipcRenderer.invoke("open-url", CodeGV.HistoricalVersion)}
                                >
                                    <GithubSvgIcon className={styles["icon-style"]} /> 历史版本
                                </div>
                            </div>
                        </div>
                    )}

                    {/* {type === "letter" && (
                        <>
                            <div>
                                <UIOpLetter />
                            </div>
                            <div className={styles["notice-footer"]}>
                                <div className={styles["notice-footer-btn"]}>全部已读</div>
                                <div className={styles["notice-footer-btn"]}>查看所有私信</div>
                            </div>
                        </>
                    )} */}
                </div>
            </div>
        )
    }, [
        type,
        isCheck,
        userInfo,
        isEngineLink,
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
        communityYaklang
    ])

    const isUpdate = useMemo(() => {
        return (
            (yakitLastVersion !== "" && removePrefixV(yakitLastVersion) !== removePrefixV(yakitVersion)) ||
            (lowerYaklangLastVersion && !isRemoteMode)
        )
    }, [yakitVersion, yakitLastVersion, lowerYaklangLastVersion, isRemoteMode])

    return (
        <YakitPopover
            overlayClassName={classNames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            trigger={"click"}
            content={notice}
            visible={show}
            onVisibleChange={(visible) => {
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
                        ? `${getReleaseEditionName()} ${yakitLastVersion} 更新通知`
                        : `Yaklang ${yaklangLastVersion} 更新通知`
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
}

/** 漏洞与风险等级对应关系 */
const RiskType: {[key: string]: string} = {
    "信息/指纹": "info",
    低危: "low",
    中危: "middle",
    高危: "high",
    严重: "critical"
}
const UIOpRisk: React.FC<UIOpRiskProp> = React.memo((props) => {
    const {isEngineLink} = props

    const [show, setShow] = useState<boolean>(false)

    /** 查询最新风险与漏洞信息节点 */
    const fetchNode = useRef<number>(0)
    const [risks, setRisks] = useState<RisksProps>({
        Data: [],
        Total: 0,
        NewRiskTotal: 0
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

            return () => {
                clearInterval(timeRef.current)
                emiter.off("onRefreshQueryNewRisk", update)
            }
        } else {
            if (timeRef.current) clearInterval(timeRef.current)
            timeRef.current = null
            fetchNode.current = 0
            setRisks({Data: [], Total: 0, NewRiskTotal: 0})
        }
    }, [isEngineLink])

    /** 单条点击阅读 */
    const singleRead = useMemoizedFn((info: LatestRiskInfo) => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current, Ids: [info.Id]})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: info.IsRead ? risks.NewRiskTotal : risks.NewRiskTotal - 1,
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
                showModal({
                    width: "80%",
                    title: "详情",
                    content: (
                        <div style={{overflow: "auto"}}>
                            <RiskDetails info={res} />
                        </div>
                    )
                })
            })
            .catch(() => {})
    })
    /** 全部已读 */
    const allRead = useMemoizedFn(() => {
        ipcRenderer
            .invoke("set-risk-info-read", {AfterId: fetchNode.current})
            .then((res: Risk) => {
                setRisks({
                    ...risks,
                    NewRiskTotal: 0,
                    Data: risks.Data.map((item) => {
                        item.IsRead = true
                        return item
                    })
                })
            })
            .catch(() => {})
    })
    /** 查看全部 */
    const viewAll = useMemoizedFn(() => {
        addToTab(YakitRoute.DB_Risk)
    })

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-risk-body"]}>
                    <div className={styles["risk-header"]}>
                        漏洞和风险统计（共 {risks.Total || 0} 条，其中未读 {risks.NewRiskTotal || 0} 条）
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
                            全部已读
                        </div>
                        <div className={styles["risk-footer-btn"]} onClick={viewAll}>
                            查看全部
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

    const yakitMenuData = useCreation(() => {
        if (system === "Darwin" || system === "Windows_NT") {
            return [
                {
                    label: isRecording ? (
                        <div
                            className={styles["stop-screen-menu-item"]}
                            onClick={() => {
                                ipcRenderer.invoke("cancel-StartScrecorder", token)
                            }}
                        >
                            停止录屏
                        </div>
                    ) : (
                        <div className={styles["screen-and-screenshot-menu-item"]}>
                            <span>录屏</span>
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
                            <span>截屏</span>
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
                    label: "录屏管理",
                    key: "screen-recorder"
                }
            ]
        }
        return [
            {
                label: isRecording ? (
                    <div
                        className={styles["stop-screen-menu-item"]}
                        onClick={() => {
                            ipcRenderer.invoke("cancel-StartScrecorder", token)
                        }}
                    >
                        停止录屏
                    </div>
                ) : (
                    <div className={styles["screen-and-screenshot-menu-item"]}>
                        <span>录屏</span>
                        <span className={styles["shortcut-keys"]}>{`${WinKeyborad[17]} ${WinKeyborad[16]} X`}</span>
                    </div>
                ),
                key: "screenCap"
            },
            {
                type: "divider"
            },
            {
                label: <span>录屏管理</span>,
                key: "screen-recorder"
            }
        ]
    }, [system, screenshotLoading, isRecording])
    const menuSelect = useMemoizedFn((type: string) => {
        setShow(false)
        switch (type) {
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
                        <CameraIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </div>
                </div>
            </YakitPopover>
        </>
    )
})
