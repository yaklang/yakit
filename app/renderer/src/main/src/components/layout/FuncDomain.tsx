import React, {useEffect, useMemo, useRef, useState} from "react"
import {Badge, Button, Modal, Tooltip} from "antd"
import {
    BellSvgIcon,
    HelpSvgIcon,
    RiskStateSvgIcon,
    ScreensHotSvgIcon,
    UISettingSvgIcon,
    UnLoginSvgIcon,
    UpdateSvgIcon,
    VersionUpdateSvgIcon,
    YakitWhiteSvgIcon,
    YaklangSvgIcon
} from "./icons"
import {YakitPopover} from "../basics/YakitPopover"
import {YakitMenu} from "../basics/YakitMenu"
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
import {TrustList} from "@/pages/TrustList"
import SetPassword from "@/pages/SetPassword"
import {QueryGeneralResponse} from "@/pages/invoker/schema"
import {Risk} from "@/pages/risks/schema"
import {RiskDetails, RiskTable} from "@/pages/risks/RiskTable"

import classnames from "classnames"
import styles from "./funcDomain.module.scss"
import yakitImg from "../../assets/yakit.jpg"

const {ipcRenderer} = window.require("electron")

export interface FuncDomainProp {
    isEngineLink: boolean
    isReverse?: Boolean
    engineMode: YaklangEngineMode
    isRemoteMode: boolean
    startEngineMode: (type: string) => any
}

export const FuncDomain: React.FC<FuncDomainProp> = React.memo((props) => {
    const {isEngineLink, isReverse = false, engineMode, isRemoteMode, startEngineMode} = props

    /** 登录用户信息 */
    const {userInfo, setStoreUserInfo} = useStore()

    const [loginShow, setLoginShow] = useState<boolean>(false)
    /** 用户功能菜单 */
    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {title: "退出登录", key: "sign-out"}
        // {title: "帐号绑定(监修)", key: "account-bind"}
    ])
    /** 信任用户弹框 */
    const [trustShow, setTrustShow] = useState<boolean>(false)
    /** 修改密码弹框 */
    const [passwordShow, setPasswordShow] = useState<boolean>(false)

    useEffect(() => {
        const SetUserInfoModule = () => <SetUserInfo userInfo={userInfo} setStoreUserInfo={setStoreUserInfo} />
        // 非企业管理员登录
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: "用户管理"},
                // {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 企业用户管理员登录
        else if (userInfo.role === "admin" && userInfo.platform === "company") {
            setUserMenu([
                {key: "user-info", title: "用户信息", render: () => SetUserInfoModule()},
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

    return (
        <div className={styles["func-domain-wrapper"]} onDoubleClick={(e) => e.stopPropagation()}>
            <div className={classnames(styles["func-domain-body"], {[styles["func-domain-reverse-body"]]: isReverse})}>
                <div
                    className={styles["ui-op-btn-wrapper"]}
                    onClick={() => ipcRenderer.invoke("open-url", "https://www.yaklang.com/docs/intro/")}
                >
                    <Tooltip placement='bottom' title='官方网站'>
                        <HelpSvgIcon style={{fontSize: 20}} className={styles["icon-style"]} />
                    </Tooltip>
                </div>
                <div className={styles["ui-op-btn-wrapper"]} onClick={() => ipcRenderer.invoke("activate-screenshot")}>
                    <ScreensHotSvgIcon className={styles["icon-style"]} />
                </div>
                <div className={styles["short-divider-wrapper"]}>
                    <div className={styles["divider-style"]}></div>
                </div>
                <div className={styles["state-setting-wrapper"]}>
                    <UIOpRisk isEngineLink={isEngineLink} />
                    <UIOpNotice isEngineLink={isEngineLink} isRemoteMode={isRemoteMode} />
                    <UIOpSetting engineMode={engineMode} startEngineMode={startEngineMode} />
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
                                    if (key === "trust-list") setTrustShow(true)
                                    if (key === "set-password") setPasswordShow(true)
                                    if (key === "role-admin") {
                                        const key = Route.RoleAdminPage
                                        // goRouterPage(key)
                                    }
                                    if (key === "account-admin") {
                                        const key = Route.AccountAdminPage
                                        // goRouterPage(key)
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
                visible={trustShow}
                title={"用户管理"}
                destroyOnClose={true}
                maskClosable={false}
                bodyStyle={{padding: "10px 24px 24px 24px"}}
                width={800}
                onCancel={() => setTrustShow(false)}
                footer={null}
            >
                <TrustList />
            </Modal>
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
        </div>
    )
})

interface UIOpSettingProp {
    /** 当前引擎模式 */
    engineMode: YaklangEngineMode
    /** yaklang引擎切换启动模式 */
    startEngineMode: (type: string) => any
}
const UIOpSetting: React.FC<UIOpSettingProp> = React.memo((props) => {
    const {engineMode, startEngineMode} = props

    const [show, setShow] = useState<boolean>(false)

    const menuSelect = useMemoizedFn((type: string) => {
        switch (type) {
            case "external":
                showModal({
                    title: "更新插件源",
                    width: 800,
                    content: (
                        <div style={{width: 800}}>
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
            case "local":
            case "remote":
            case "admin":
                if (type === engineMode && type !== "remote") return
                startEngineMode(type)
                return

            default:
                return
        }
    })

    const menu = (
        <YakitMenu
            selectedKeys={[engineMode]}
            data={[
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
                        {label: "远程", key: "remote"},
                        {label: "管理员", key: "admin"}
                    ]
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
                <UISettingSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
            </div>
        </YakitPopover>
    )
})

interface UIOpUpdateProps {
    version: string
    lastVersion: string
    isUpdateWait: boolean
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
                    {/* 等使用更新内容时，下面div样式需要被删除 */}
                    <div style={{display: "flex", alignItems: "center"}}>
                        <div className={styles["update-title"]}>{`Yakit ${isUpdate ? lastVersion : version}`}</div>
                        {/* <div className={styles["update-time"]}>2022-10-01</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {isUpdateWait ? (
                        <Button
                            className={styles["btn-style"]}
                            onClick={() => {
                                ipcRenderer.invoke("open-yakit-or-yaklang")
                            }}
                        >{`安装 `}</Button>
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
    const {version, lastVersion, isUpdateWait, isRemoteMode = false, onDownload} = props

    const isUpdate = lastVersion !== "" && lastVersion !== version

    return (
        <div
            className={classnames(styles["version-update-wrapper"], {
                [styles["version-has-update"]]: !isRemoteMode && isUpdate && !isUpdateWait
            })}
        >
            <div className={styles["update-header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["update-icon"]}>
                        <YaklangSvgIcon />
                    </div>
                    {/* 等使用更新内容时，下面div样式需要被删除 */}
                    <div style={{display: "flex", alignItems: "center"}}>
                        <div className={styles["update-title"]}>{`Yaklang ${isUpdate ? lastVersion : version}`}</div>
                        {/* <div className={styles["upda te-time"]}>2022-09-29</div> */}
                    </div>
                </div>

                <div className={styles["header-btn"]}>
                    {!isRemoteMode && isUpdateWait && (
                        <Button
                            className={styles["btn-style"]}
                            onClick={() => ipcRenderer.invoke("update-yaklang-reconnect", lastVersion)}
                        >{`更新 `}</Button>
                    )}
                    {!isRemoteMode && !isUpdateWait && isUpdate && (
                        <div className={styles["update-btn"]} onClick={() => onDownload("yaklang")}>
                            <UpdateSvgIcon style={{marginRight: 4}} />
                            立即更新
                        </div>
                    )}
                    {!isUpdate && "已是最新"}
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
    const yaklangTime = useRef<any>(null)

    /** 获取最新Yakit版本号 */
    const fetchYakitLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-yakit-version")
            .then((data: string) => {
                if (yakitVersion !== data) setYakitLastVersion(data)
            })
            .catch(() => {})
    })
    /** 获取最新Yaklang版本号 */
    const fetchYaklangLastVersion = useMemoizedFn(() => {
        ipcRenderer
            .invoke("fetch-latest-yaklang-version")
            .then((data: string) => {
                if (yaklangVersion !== data) setYaklangLastVersion(data)
            })
            .catch(() => {})
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

    const [isYaklangUpdateWait, setIsYaklangUpdateWait] = useState<boolean>(false)
    const [isYakitUpdateWait, setIsYakitUpdateWait] = useState<boolean>(false)
    /** 监听下载 yaklang 或 yakit 成功后是否稍后安装 */
    useEffect(() => {
        ipcRenderer.on("download-update-wait-callback", (e: any, type: "yaklang" | "yakit") => {
            if (type === "yakit") setIsYakitUpdateWait(true)
            if (type === "yaklang") setIsYaklangUpdateWait(true)
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

                    {type === "update" && (
                        <div className={styles["notice-version-wrapper"]}>
                            <UIOpUpdateYakit
                                version={yakitVersion}
                                lastVersion={yakitLastVersion}
                                isUpdateWait={isYakitUpdateWait}
                                onDownload={onDownload}
                            />
                            <UIOpUpdateYaklang
                                version={yaklangVersion}
                                lastVersion={yaklangLastVersion}
                                isUpdateWait={isYaklangUpdateWait}
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
        isEngineLink,
        isRemoteMode,
        yakitVersion,
        yakitLastVersion,
        yaklangVersion,
        yaklangLastVersion,
        isYaklangUpdateWait,
        isYakitUpdateWait
    ])

    const isUpdate = useMemo(() => {
        return (
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
                <Badge dot={isUpdate}>
                    <VersionUpdateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </Badge>
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
    Unread: boolean
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

                const infos = [...res.Data]
                const risksOjb: RisksProps = {
                    Total: res.Total,
                    NewRiskTotal: res.NewRiskTotal,
                    Data: infos.map((item) => {
                        const info = risks.Data.filter((el) => el.Id === item.Id && el.Title === item.Title)[0]
                        if (!!info) item.Unread = info.Unread
                        else item.Unread = true
                        return item
                    })
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
                    Pagination: {Limit: 1, Page: 1, Order: "desc", OrderBy: "updated_at"}
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

    const unread = useMemo(() => {
        let flag = false
        for (let info of risks.Data) {
            if (info.Unread) {
                flag = true
                break
            }
        }
        return flag
    }, [risks])

    /** 单条点击阅读 */
    const singleRead = useMemoizedFn((info: LatestRiskInfo) => {
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
                setRisks({
                    ...risks,
                    Data: risks.Data.map((item) => {
                        if (item.Id === info.Id && item.Title === info.Title) item.Unread = false
                        return item
                    })
                })
            })
            .catch(() => {})
    })
    /** 全部已读 */
    const allRead = useMemoizedFn(() => {
        setRisks({
            ...risks,
            Data: risks.Data.map((item) => {
                item.Unread = false
                return item
            })
        })
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
                        漏洞和风险统计（共 {risks.Total || 0} 条，其中新增 {risks.NewRiskTotal || 0} 条）
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
                                        <Badge dot={item.Unread} offset={[3, 0]}>
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
                                        <Badge dot={item.Unread} offset={[3, 0]}>
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
                <Badge dot={unread} offset={[2, 0]}>
                    <RiskStateSvgIcon className={show ? styles["icon-hover-style"] : styles["icon-style"]} />
                </Badge>
            </div>
        </YakitPopover>
    )
})
