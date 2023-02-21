import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Modal, Tooltip,Form,Input,Button} from "antd"
import {
    BellSvgIcon,
    RiskStateSvgIcon,
    RocketSvgIcon,
    ScreensHotSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitEllipsis} from "../basics/YakitEllipsis"
import {useMemoizedFn} from "ahooks"
import {showDrawer, showModal} from "@/utils/showModal"
import {LoadYakitPluginForm} from "@/pages/yakitStore/YakitStorePage"
import {info, success} from "@/utils/notification"
import {ConfigPrivateDomain} from "../ConfigPrivateDomain/ConfigPrivateDomain"
import {ConfigGlobalReverse} from "@/utils/basic"
import {YaklangEngineMode} from "@/yakitGVDefine"
import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
import {showConfigEngineProxyForm} from "@/utils/ConfigEngineProxy"
import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import Login from "@/pages/Login"
import {useStore} from "@/store"
import {defaultUserInfo, judgeAvatar, MenuItemType, SetUserInfo} from "@/pages/MainOperator"
import {DropdownMenu} from "../baseTemplate/DropdownMenu"
import {loginOut} from "@/utils/login"
import {Route} from "@/routes/routeSpec"
import {UserPlatformType} from "@/pages/globalVariable"
import SetPassword from "@/pages/SetPassword"
import SelectUpload from "@/pages/SelectUpload"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails, RiskTable} from "@/pages/risks/RiskTable"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitPopover} from "../yakitUI/YakitPopover/YakitPopover"
import {YakitMenu} from "../yakitUI/YakitMenu/YakitMenu"
import {showConfigMenuItems} from "@/utils/ConfigMenuItems"
import {showDevTool} from "@/utils/envfile"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {YakitSwitch} from "../yakitUI/YakitSwitch/YakitSwitch"
import {LocalGV} from "@/yakitGV"
import {getLocalValue, setLocalValue} from "@/utils/kv"
import {showPcapPermission} from "@/utils/ConfigPcapPermission"
import {migrateLegacyDatabase} from "@/utils/ConfigMigrateLegacyDatabase"

import {isSimbleEnterprise} from "@/utils/envfile"
import classnames from "classnames"
import styles from "./funcDomain.module.scss"
import yakitImg from "../../assets/yakit.jpg"

const {ipcRenderer} = window.require("electron")

export interface FuncDomainProp {
    isEngineLink: boolean
    isReverse?: Boolean
    engineMode: YaklangEngineMode
    isRemoteMode: boolean
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: "console" | "adminMode" | "break") => any
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {isEngineLink, isReverse = false, engineMode, isRemoteMode, onEngineModeChange, typeCallback} = props

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
    /** 上传数据弹框 */
    const [uploadModalShow, setUploadModalShow] = useState<boolean>(false)

    useEffect(() => {
        const SetUserInfoModule = () => <SetUserInfo userInfo={userInfo} setStoreUserInfo={setStoreUserInfo} />
        // 非企业管理员登录
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 非企业超级管理员登录
        else if (userInfo.role === "superAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: "用户管理"},
                {key: "license-admin", title: "License管理"},
                {key: "plugIn-admin", title: "插件权限"},
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 非企业license管理员
        else if (userInfo.role === "licenseAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "license-admin", title: "License管理"},
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 企业用户管理员登录
        else if (userInfo.role === "admin" && userInfo.platform === "company") {
            setUserMenu([
                {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
                {key: "upload-data", title: "上传数据"},
                {key: "role-admin", title: "角色管理"},
                {key: "account-admin", title: "用户管理"},
                {key: "set-password", title: "修改密码"},
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 企业用户非管理员登录
        else if (userInfo.role !== "admin" && userInfo.platform === "company") {
            setUserMenu([
                {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
                {key: "upload-data", title: "上传数据"},
                {key: "set-password", title: "修改密码"},
                {key: "sign-out", title: "退出登录"}
            ])
        } else {
            setUserMenu([
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
    }, [userInfo.role, userInfo.companyHeadImg])

    /** 通知软件打开管理页面 */
    const openMenu = (type: Route) => {
        ipcRenderer.invoke("open-user-manage", type)
    }

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classnames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                {showDevTool() && <UIDevTool />}

                {/* <div className={styles["ui-op-btn-wrapper"]} onClick={() => ipcRenderer.invoke("activate-screenshot")}>
                    <ScreensHotSvgIcon className={styles["icon-style"]} />
                </div> */}

                <div
                    className={styles["ui-op-btn-wrapper"]}
                    onClick={() => {
                        getLocalValue("SHOW_BASE_CONSOLE").then((val: boolean) => {
                            if (!val) {
                                typeCallback("console")
                            }
                        })
                    }}
                >
                    <div className={styles["op-btn-body"]}>
                        <Tooltip placement='bottom' title='引擎Console'>
                            <RocketSvgIcon style={{fontSize: 20}} className={styles["icon-style"]} />
                        </Tooltip>
                    </div>
                </div>

                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    <UIOpRisk isEngineLink={isEngineLink} />
                    <UIOpNotice isEngineLink={isEngineLink} isRemoteMode={isRemoteMode} />
                    <UIOpSetting
                        engineMode={engineMode}
                        onEngineModeChange={onEngineModeChange}
                        typeCallback={typeCallback}
                    />
                </div>
                <div className={styles["divider-wrapper"]}></div>
                <div className={styles["user-wrapper"]}>
                    {userInfo.isLogin ? (
                        <div className={styles["user-info"]}>
                            <DropdownMenu
                                menu={{
                                    data: userMenu
                                }}
                                dropdown={{
                                    placement: "bottomCenter",
                                    trigger: ["click"]
                                }}
                                onClick={(key) => {
                                    if (key === "sign-out") {
                                        setStoreUserInfo(defaultUserInfo)
                                        loginOut(userInfo)
                                        setTimeout(() => success("已成功退出账号"), 500)
                                    }
                                    if (key === "trust-list") {
                                        const key = Route.TrustListPage
                                        openMenu(key)
                                    }
                                    if (key === "set-password") setPasswordShow(true)
                                    if (key === "upload-data") setUploadModalShow(true)
                                    if (key === "role-admin") {
                                        const key = Route.RoleAdminPage
                                        openMenu(key)
                                    }
                                    if (key === "account-admin") {
                                        const key = Route.AccountAdminPage
                                        openMenu(key)
                                    }
                                    if (key === "license-admin") {
                                        const key = Route.LicenseAdminPage
                                        openMenu(key)
                                    }
                                    if (key === "plugIn-admin") {
                                        const key = Route.PlugInAdminPage
                                        openMenu(key)
                                    }
                                }}
                            >
                                {userInfo.platform === "company" ? (
                                    judgeAvatar(userInfo)
                                ) : (
                                    <img
                                        src={userInfo[UserPlatformType[userInfo.platform || ""].img] || yakitImg}
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
            </div>

            {loginShow && <Login visible={loginShow} onCancel={() => setLoginShow(false)} />}
            <Modal
                visible={passwordShow}
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
        </div>
    )
})

interface NetworkDetectionProp{
    onClose:()=>void
}

const NetworkDetection: React.FC<NetworkDetectionProp> = React.memo((props) => {
    const [form] = Form.useForm()
    const {onClose} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [result,setResult] = useState<string>()
    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const {url} = values
        setResult(undefined)
        ipcRenderer
            .invoke("try-network-detection", url)
            .then((value: boolean) => {
                // console.log("value",value)
                let str:string = value?"网络连接正常":"网络无法连接"
                setResult(str)
            })
            .catch(() => {})
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    const layout = {
        labelCol: {span: 5},
        wrapperCol: {span: 16}
    }
    // 判断是否为网址
    const judgeUrl = () =>[ 
        {
            validator: (_, value) => {
                let re = /([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/
                if (re.test(value)) {
                    return Promise.resolve()
                } else {
                    return Promise.reject("请输入符合要求的地址")
                }
            }
        }
    ]
    return(
        <div>
            <Form {...layout} form={form} onFinish={onFinish}>
                <Form.Item name='url' label='地址' rules={[{required: true, message: "该项为必填"},...judgeUrl()]}>
                    <Input placeholder='请输入地址' allowClear />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <Button type='primary' htmlType='submit' loading={loading}>
                        确认
                    </Button>
                    {result&&<div style={{marginTop:10}}>检测结果：{result}</div>}  
                </div>
            </Form>
        </div>
    )
})

interface UIOpSettingProp {
    /** 当前引擎模式 */
    engineMode: YaklangEngineMode
    /** yaklang引擎切换启动模式 */
    onEngineModeChange: (type: YaklangEngineMode) => any
    typeCallback: (type: "console" | "adminMode" | "break") => any
}

const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, onEngineModeChange, typeCallback} = props

    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "external":
                showModal({
                    title: "更新插件源",
                    width: 800,
                    content: (
                        <div style={{width: 780}}>
                            <LoadYakitPluginForm onFinished={() => info("更新进程执行完毕")} />
                        </div>
                    )
                })
                return
            case "store":
                const m = showModal({
                    title: "配置私有域",
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
            case "engineAgent":
                showConfigEngineProxyForm()
                return
            case "engineVar":
                showConfigYaklangEnvironment()
                return
            case "remote":
                onEngineModeChange(type)
                return
            case "local":
            case "admin":
                if (type === engineMode) {
                    return
                }
                onEngineModeChange(type)
                return
            case "refreshMenu":
                ipcRenderer.invoke("change-main-menu")
                return
            case "settingMenu":
                showConfigMenuItems()
                return
            case "invalidCache":
                invalidCacheAndUserData()
                return
            case "pcapfix":
                showPcapPermission()
                return
            case "adminMode":
                typeCallback("adminMode")
                return
            case "migrateLegacy":
                migrateLegacyDatabase()
                return
            case "network-detection":
                const n = showModal({
                    title: "网络检测",
                    content: <NetworkDetection onClose={() => n.destroy()}/>
                })
                return n
            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            selectedKeys={[engineMode]}
            data={isSimbleEnterprise?[
                {
                    key: "pcapfix",
                    label: "网卡权限修复"
                },
                {
                    key: "plugin",
                    label: "配置插件源",
                    children: [
                        {label: "外部", key: "external"},
                        {label: "插件商店", key: "store"}
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
                {
                    key: "refreshMenu",
                    label: "刷新菜单"
                },
                {
                    key: "settingMenu",
                    label: "配置菜单栏"
                },
                {
                    key: "system-manager",
                    label: "进程与缓存管理",
                    children: [{key: "invalidCache", label: "删除缓存数据"}]
                },
                {
                    key: "network-detection",
                    label: "网络检测"
                }
            ]:[
                {
                    key: "pcapfix",
                    label: "网卡权限修复"
                },
                {
                    key: "plugin",
                    label: "配置插件源",
                    children: [
                        {label: "外部", key: "external"},
                        {label: "插件商店", key: "store"}
                    ]
                },
                {
                    key: "reverse",
                    label: "全局反连"
                },
                {
                    key: "agent",
                    label: "系统代理"
                },
                {
                    key: "engineAgent",
                    label: "引擎扫描代理"
                },
                {
                    key: "engineVar",
                    label: "引擎环境变量"
                },
                {
                    key: "link",
                    label: "切换连接模式",
                    children: [
                        {label: "本地", key: "local"},
                        {label: "远程", key: "remote"}
                    ]
                },
                {
                    key: "refreshMenu",
                    label: "刷新菜单"
                },
                {
                    key: "settingMenu",
                    label: "配置菜单栏"
                },
                {
                    key: "system-manager",
                    label: "进程与缓存管理",
                    children: [{key: "invalidCache", label: "删除缓存数据"}]
                },
                {
                    key: "otherMode",
                    label: "其他操作",
                    children: [
                        {label: "管理员模式", key: "adminMode"},
                        {label: "旧版本迁移", key: "migrateLegacy"}
                    ]
                },
                {
                    key: "network-detection",
                    label: "网络检测"
                }
            ]}
            onClick={({key}) => menuSelect(key)}
        />
    )

    return (
        <YakitPopover
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classnames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </div>
            </div>
        </YakitPopover>
    )
})

const UIDevTool: React.FC = React.memo(() => {
    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "devtool":
                ipcRenderer.invoke("trigger-devtool")
                return
            case "reload":
                ipcRenderer.invoke("trigger-reload")
                return
            case "reloadCache":
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
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-setting-dropdown"])}
            placement={"bottom"}
            content={menu}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classnames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
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
    isUpdateWait?: boolean
    isRemoteMode?: boolean
    onDownload: (type: "yakit" | "yaklang") => any
}

/** @name Yakit版本 */
const UIOpUpdateYakit: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {version, lastVersion, isUpdateWait, onDownload} = props

    const isUpdate = lastVersion !== "" && lastVersion !== version

    return (
        <div
            className={classnames(styles["version-update-wrapper"], {
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
                        <div className={styles["update-title"]}>{`Yakit ${isUpdate ? lastVersion : version}`}</div>
                        <div className={styles["update-time"]}>{`当前版本: ${version}`}</div>
                        {/* <div className={styles["update-time"]}>2022-10-01</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isUpdateWait ? (
                        <YakitButton onClick={() => ipcRenderer.invoke("open-yakit-or-yaklang")}>{`安装 `}</YakitButton>
                    ) : isUpdate ? (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yakit")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            立即下载
                        </div>
                    ) : (
                        "已是最新"
                    )}
                </div>
            </div>

            {/* <div className={styles["update-content-wrapper"]}>
                <div className={styles["update-content"]}>
                    1. 修复前端 Web Fuzzer 数据过多的时候纯前端卡顿问题 <br />
                    2. 修复 HTTP History Flow 筛选与屏蔽的 BUG <br />
                    3. 新增 Java Hack Yso GUI Dump 功能（需配合1.1.3-sp5引...
                </div>
                <div className={styles["current-version"]}>当前版本：Yakit 1.1.3-sq1</div>
            </div> */}
        </div>
    )
})
/** @name Yaklang引擎版本 */
const UIOpUpdateYaklang: React.FC<UIOpUpdateProps> = React.memo((props) => {
    const {version, lastVersion, localVersion = "", isRemoteMode = false, onDownload} = props

    const isUpdate = lastVersion !== "" && lastVersion !== version && localVersion !== lastVersion
    const isKillEngine = localVersion && localVersion !== version && localVersion === lastVersion

    return (
        <div
            className={classnames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && (isUpdate || isKillEngine)
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    {/* 等使用更新内容时，下面"当前版本"-div需要被删除 */}
                    <div>
                        <div className={styles["update-title"]}>{`Yaklang ${isUpdate ? lastVersion : version}`}</div>
                        <div className={styles["update-time"]}>{`当前版本: ${version}`}</div>
                        {/* <div className={styles["upda te-time"]}>2022-09-29</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {!isRemoteMode && isUpdate && (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yaklang")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            立即更新
                        </div>
                    )}
                    {!isRemoteMode && isKillEngine && (
                        <YakitButton
                            onClick={() => ipcRenderer.invoke("kill-old-engine-process")}
                        >{`更新 `}</YakitButton>
                    )}
                    {!isUpdate && !isKillEngine && "已是最新"}
                    {isRemoteMode && isUpdate && "远程连接无法更新"}
                </div>
            </div>

            {/* <div className={styles["update-content-wrapper"]}>
                <div className={styles["update-content"]}>
                    1. 修复了 GetCommonParams 对 Post Data 的不当处理
                    <br />
                    2. 允许劫持并修改 Websocket 握手包
                    <br />
                    3. Fuzz tag 别名，randstr -{">"} rs...
                </div>
                <div className={styles["current-version"]}>当前版本：Yaklang 1.1.3-sp3-5</div>
            </div> */}
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
}

const UIOpNotice: React.FC<UIOpNoticeProp> = React.memo((props) => {
    const {isEngineLink, isRemoteMode} = props
    const [show, setShow] = useState<boolean>(false)
    const [type, setType] = useState<"letter" | "update">("update")

    /** Yakit版本号 */
    const [yakitVersion, setYakitVersion] = useState<string>("dev")
    const [yakitLastVersion, setYakitLastVersion] = useState<string>("")
    const yakitTime = useRef<any>(null)

    /** Yaklang引擎版本号 */
    const [yaklangVersion, setYaklangVersion] = useState<string>("dev")
    const [yaklangLastVersion, setYaklangLastVersion] = useState<string>("")
    const [yaklangLocalVersion, setYaklangLocalVersion] = useState<string>("")
    const yaklangTime = useRef<any>(null)

    /** 是否启动检测更新 */
    const [isCheck, setIsCheck] = useState<boolean>(true)

    /** 获取最新Yakit版本号 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-yakit-version")
            .then((data: string) => {
                if (yakitVersion !== data) setYakitLastVersion(data)
            })
            .catch(() => {})
    })
    /** 获取最新Yaklang版本号和本地版本号 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer.invoke("fetch-latest-yaklang-version").then((data: string) => {
            if (yaklangVersion !== data) setYaklangLastVersion(data)
        })
        ipcRenderer.invoke("get-current-yak").then((data: string) => {
            setYaklangLocalVersion(data)
        })
    })

    /** 接收本地Yaklang引擎版本号信息 */
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

    useEffect(() => {
        if (isEngineLink) {
            getLocalValue(LocalGV.NoAutobootLatestVersionCheck).then((val: boolean) => {
                setIsCheck(val)
            })
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

            return () => {
                clearInterval(yakitTime.current)
                clearInterval(yaklangTime.current)
            }
        } else {
            /** 清空Yakit引擎相关版本号和定时器 */
            if (yakitTime.current) clearInterval(yakitTime.current)
            yakitTime.current = null
            setYakitLastVersion("")
            /** 清空Yaklang引擎相关版本号和定时器 */
            if (yaklangTime.current) clearInterval(yaklangTime.current)
            yaklangTime.current = null
            setYaklangLastVersion("")
        }
    }, [isEngineLink])

    const onDownload = useMemoizedFn((type: "yakit" | "yaklang") => {
        ipcRenderer.invoke("receive-download-yaklang-or-yakit", type)
    })

    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    /** 监听下载 yaklang 或 yakit 成功后是否稍后安装 */
    useEffect(() => {
        ipcRenderer.on("download-update-wait-callback", (e: any, type: "yakit") => {
            if (type === "yakit") setIsYakitUpdateWait(true)
        })

        return () => {
            ipcRenderer.removeAllListeners("download-update-wait-callback")
        }
    }, [])

    const notice = useMemo(() => {
        return (
            <div className={styles["ui-op-plus-wrapper"]}>
                <div className={styles["ui-op-notice-body"]}>
                    {/* <div className={styles["notice-tabs-wrapper"]}>
                        <div className={styles["notice-tabs-body"]}>
                            <div
                                className={classnames(styles["tabs-opt"], {
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
                                className={classnames(styles["tabs-opt"], {
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
                            {!isSimbleEnterprise&&<UIOpUpdateYakit
                                version={yakitVersion}
                                lastVersion={yakitLastVersion}
                                isUpdateWait={isYakitUpdateWait}
                                onDownload={onDownload}
                            />}
                            <UIOpUpdateYaklang
                                version={yaklangVersion}
                                lastVersion={yaklangLastVersion}
                                localVersion={yaklangLocalVersion}
                                isRemoteMode={isRemoteMode}
                                onDownload={onDownload}
                            />
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
        isCheck,
        isEngineLink,
        isRemoteMode,
        yakitVersion,
        yakitLastVersion,
        yaklangVersion,
        yaklangLastVersion,
        yaklangLocalVersion,
        isYakitUpdateWait
    ])

    const isUpdate = useMemo(() => {
        return (
            isSimbleEnterprise?(yaklangLastVersion !== "" && yaklangLastVersion !== yaklangVersion):
            (yakitLastVersion !== "" && yakitLastVersion !== yakitVersion) ||
            (yaklangLastVersion !== "" && yaklangLastVersion !== yaklangVersion)
        )
    }, [yakitVersion, yakitLastVersion, yaklangLastVersion, yaklangVersion])

    return (
        <YakitPopover
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classnames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge dot={isUpdate}>
                        <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
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
                    setTimeout(() => {
                        update()
                        timeRef.current = setInterval(update, 5000)
                    }, 300)
                })

            return () => {
                clearInterval(timeRef.current)
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
        showDrawer({
            title: "Vulnerabilities && Risks",
            width: "70%",
            content: (
                <>
                    <RiskTable />
                </>
            )
        })
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
                                            className={classnames(styles["opt-icon-style"], styles[`opt-${type}-icon`])}
                                        >
                                            {item.Verbose}
                                        </div>
                                        <Badge dot={!item.IsRead} offset={[3, 0]}>
                                            <YakitEllipsis text={item.Title} width={type === "info" ? 280 : 310} />
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
            overlayClassName={classnames(styles["ui-op-dropdown"], styles["ui-op-plus-dropdown"])}
            placement={"bottomRight"}
            content={notice}
            onVisibleChange={(visible) => setShow(visible)}
        >
            <div className={styles["ui-op-btn-wrapper"]}>
                <div className={classnames(styles["op-btn-body"], {[styles["op-btn-body-hover"]]: show})}>
                    <Badge count={risks.NewRiskTotal} offset={[2, 15]}>
                        <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                    </Badge>
                </div>
            </div>
        </YakitPopover>
    )
})
