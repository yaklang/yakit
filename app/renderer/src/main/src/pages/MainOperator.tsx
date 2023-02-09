import React, {forwardRef, ReactNode, useEffect, useRef, useState} from "react"
import {Button, Input, Layout, Menu, Modal, Popover, Space, Spin, Tabs, Typography, Upload, Avatar, Alert} from "antd"
import {
    ContentByRoute,
    DefaultRouteMenuData,
    MenuDataProps,
    NoScrollRoutes,
    Route,
    RouteNameToVerboseName
} from "../routes/routeSpec"
import {CloseOutlined, EditOutlined, EllipsisOutlined, CameraOutlined} from "@ant-design/icons"
import {failed, info, success} from "../utils/notification"
import {showModal} from "../utils/showModal"
// import {YakLogoBanner} from "../utils/logo"
// import {ConfigGlobalReverse, ReversePlatformStatus, YakitVersion, YakVersion} from "../utils/basic"
import {
    CompletionTotal,
    MethodSuggestion,
    setYaklangBuildInMethodCompletion,
    setYaklangCompletions
} from "../utils/monacoSpec/yakCompletionSchema"
import {randomString} from "../utils/randomUtil"
import MDEditor from "@uiw/react-md-editor"
import {genDefaultPagination, QueryYakScriptRequest, QueryYakScriptsResponse} from "./invoker/schema"
import {useHotkeys} from "react-hotkeys-hook"
import {useGetState, useMemoizedFn} from "ahooks"
import ReactDOM from "react-dom"
import debounce from "lodash/debounce"
import {AutoSpin} from "../components/AutoSpin"
import cloneDeep from "lodash/cloneDeep"
// import {RiskStatsTag} from "../utils/RiskStatsTag"
import {ItemSelects} from "../components/baseTemplate/FormItemUtil"
import {BugInfoProps, BugList, CustomBugList} from "./invoker/batch/YakBatchExecutors"
import {coordinate, UserPlatformType} from "./globalVariable"
import {DropdownMenu} from "@/components/baseTemplate/DropdownMenu"
import {MainTabs} from "./MainTabs"
import Login from "./Login"
import SetPassword from "./SetPassword"
// import yakitImg from "../assets/yakit.jpg"
import {UserInfoProps, useStore} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import {UnfinishedBatchTask} from "./invoker/batch/UnfinishedBatchTaskList"
// import {LoadYakitPluginForm} from "./yakitStore/YakitStorePage"
// import {showConfigMenuItems} from "../utils/ConfigMenuItems"
// import {ConfigPrivateDomain} from "@/components/ConfigPrivateDomain/ConfigPrivateDomain"
import "./main.scss"
import "./GlobalClass.scss"
import {loginOut, refreshToken} from "@/utils/login"
import {getRemoteValue, setRemoteValue, setLocalValue} from "@/utils/kv"
// import {showConfigSystemProxyForm} from "@/utils/ConfigSystemProxy"
// import {showConfigEngineProxyForm} from "@/utils/ConfigEngineProxy"
// import {onImportShare} from "./fuzzer/components/ShareImport"
// import {ShareImportIcon} from "@/assets/icons"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
// import {showConfigYaklangEnvironment} from "@/utils/ConfigYaklangEnvironment"
import {EDITION_STATUS, ENTERPRISE_STATUS, getJuageEnvFile} from "@/utils/envfile"
import HeardMenu, {getScriptHoverIcon, getScriptIcon} from "./layout/HeardMenu/HeardMenu"
import {invalidCacheAndUserData} from "@/utils/InvalidCacheAndUserData"
import {LocalGV} from "@/yakitGV"
import {BaseConsole} from "../components/baseConsole/BaseConsole"
import CustomizeMenu from "./customizeMenu/CustomizeMenu"

const IsEnterprise: boolean = ENTERPRISE_STATUS.IS_ENTERPRISE_STATUS === getJuageEnvFile()

const {ipcRenderer} = window.require("electron")
const MenuItem = Menu.Item
const {Content} = Layout

const FuzzerCache = "fuzzer-list-cache"

const singletonRoute: Route[] = [
    Route.HTTPHacker,
    Route.ShellReceiver,
    // Route.ReverseServer,
    Route.PayloadManager,
    Route.ModManager,
    Route.ModManagerLegacy,
    Route.YakScript,

    // database
    Route.DB_Ports,
    Route.DB_HTTPHistory,
    Route.DB_ExecResults,
    Route.DB_Domain,
    Route.DB_Risk,
    Route.DB_Report,
    Route.DB_Projects,

    Route.PoC,
    Route.DNSLog,
    Route.BatchExecutorPage,
    Route.ICMPSizeLog,
    Route.TCPPortLog,

    Route.WebsocketHistory,
    // 插件
    Route.AddYakitScript,
    Route.OnlinePluginRecycleBin,
    // 用户管理
    Route.AccountAdminPage,
    // 角色管理
    Route.RoleAdminPage,
    // License管理
    Route.LicenseAdminPage,
    // 信任用户管理
    Route.TrustListPage,
    // 插件权限
    Route.PlugInAdminPage,
    // 获取引擎输出
    Route.AttachEngineCombinedOutput,
    // 首页
    Route.NewHome
]
/** 不需要首页组件安全边距的页面 */
const noPaddingPage = [
    Route.PayloadGenerater_New,
    Route.DataCompare,
    Route.YakScript,
    Route.HTTPHacker,
    Route.ModManager,
    Route.ICMPSizeLog,
    Route.TCPPortLog,
    Route.DNSLog,
    Route.NewHome
]

export const defaultUserInfo: UserInfoProps = {
    isLogin: false,
    platform: null,
    githubName: null,
    githubHeadImg: null,
    wechatName: null,
    wechatHeadImg: null,
    qqName: null,
    qqHeadImg: null,
    companyName: null,
    companyHeadImg: null,
    role: null,
    user_id: null,
    token: "",
    showStatusSearch: false
}

export interface MainProp {
    tlsGRPC?: boolean
    addr?: string
    onErrorConfirmed?: () => any
    isShowHome?: boolean
    setJudgeLicense?: (v: boolean) => void
}

export interface MenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
    Query?: SimpleQueryYakScriptSchema
    MenuItemId?: number
    GroupSort?: number
    YakScriptName?: string
}

export interface MenuItemGroup {
    Group: string
    Items: MenuItem[]
    MenuSort: number
    Mode: string
}

interface PluginMenuItem {
    Group: string
    YakScriptId: number
    Verbose: string
}

export interface multipleNodeInfo {
    id: string
    verbose: string
    node: ReactNode
    time?: string
}

export interface PageCache {
    verbose: string
    route: Route
    singleNode: ReactNode | any
    multipleNode: multipleNodeInfo[] | any[]
    multipleCurrentKey?: string
    hideAdd?: boolean
}

export interface fuzzerInfoProp {
    time: string

    isHttps?: boolean
    forceFuzz?: boolean
    concurrent?: number
    proxy?: string
    actualHost?: string
    timeout?: number
    request?: string
    /**
     * @param 二级菜单修改了名称后保存的字段，目前仅仅webFuzzer二级支持
     */
    verbose?: string
}

export interface MenuItemType {
    key: string
    label?: ReactNode
    title?: string
    render?: (info: any) => ReactNode
    icon?: ReactNode
    danger?: boolean
    disabled?: boolean
}

export interface SetUserInfoProp {
    userInfo: UserInfoProps
    setStoreUserInfo: (info: any) => void
}

export const judgeAvatar = (userInfo) => {
    const {companyHeadImg, companyName} = userInfo
    return companyHeadImg && !!companyHeadImg.length ? (
        <Avatar size={24} style={{cursor: "pointer"}} src={companyHeadImg} />
    ) : (
        <Avatar size={24} style={{backgroundColor: "rgb(245, 106, 0)", cursor: "pointer"}}>
            {companyName && companyName.slice(0, 1)}
        </Avatar>
    )
}

// 可上传文件类型
const FileType = ["image/png", "image/jpeg", "image/png"]

// 用户信息
export const SetUserInfo: React.FC<SetUserInfoProp> = React.memo((props) => {
    const {userInfo, setStoreUserInfo} = props

    // OSS远程头像删除
    const deleteAvatar = useMemoizedFn((imgName) => {
        NetWorkApi<API.DeleteResource, API.ActionSucceeded>({
            method: "post",
            url: "delete/resource",
            data: {
                file_type: "img",
                file_name: [imgName]
            }
        })
            .then((result) => {
                // if(result.ok){
                //     success("原有头像删除成功")
                // }
            })
            .catch((err) => {
                failed("头像更换失败：" + err)
            })
            .finally(() => {})
    })

    // 修改头像
    const setAvatar = useMemoizedFn(async (file) => {
        await ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                let imgUrl: string = res.data
                NetWorkApi<API.UpUserInfoRequest, API.ActionSucceeded>({
                    method: "post",
                    url: "urm/up/userinfo",
                    data: {
                        head_img: imgUrl
                    }
                })
                    .then((result) => {
                        if (result.ok) {
                            success("头像更换成功")
                            setStoreUserInfo({
                                ...userInfo,
                                companyHeadImg: imgUrl
                            })
                            let imgName = imgUrl.split("/").reverse()[0]
                            deleteAvatar(imgName)
                        }
                    })
                    .catch((err) => {
                        failed("头像更换失败：" + err)
                    })
                    .finally(() => {})
            })
            .catch((err) => {
                failed("头像上传失败")
            })
            .finally(() => {})
    })
    return (
        <div className='dropdown-menu-user-info'>
            <Upload.Dragger
                className='author-upload-dragger'
                accept={FileType.join(",")}
                // accept=".jpg, .jpeg, .png"
                multiple={false}
                maxCount={1}
                showUploadList={false}
                beforeUpload={(f) => {
                    if (!FileType.includes(f.type)) {
                        failed(`${f.name}非png、png、jpeg文件，请上传正确格式文件！`)
                        return false
                    }
                    setAvatar(f)
                    return false
                }}
            >
                <div className='img-box'>
                    <div className='img-box-mask'>{judgeAvatar(userInfo)}</div>
                    <CameraOutlined className='hover-icon' />
                </div>
            </Upload.Dragger>

            <div
                className='content-box'
                style={
                    userInfo.role !== "admin"
                        ? {display: "flex", justifyContent: "center", alignItems: "center", fontSize: 16}
                        : {}
                }
            >
                <div className='user-name'>{userInfo.companyName}</div>
                {userInfo.role === "admin" && <div className='permission-show'>管理员</div>}
            </div>
        </div>
    )
})

const Main: React.FC<MainProp> = React.memo((props) => {
    const {setJudgeLicense} = props
    const [loading, setLoading] = useState(false)

    const [notification, setNotification] = useState("")

    const [pageCache, setPageCache, getPageCache] = useGetState<PageCache[]>([
        {
            verbose: "首页",
            route: Route.NewHome,
            singleNode: ContentByRoute(Route.NewHome),
            multipleNode: []
        }
    ])
    const [currentTabKey, setCurrentTabKey] = useState<Route | string>(Route.NewHome)

    // 修改密码弹框
    const [passwordShow, setPasswordShow] = useState<boolean>(false)

    // 登录框状态
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)

    // 系统类型
    const [system, setSystem] = useState<string>("")

    // 是否展示console
    const [isShowBaseConsole, setIsShowBaseConsole] = useState<boolean>(false)
    // 展示console方向
    const [directionBaseConsole, setDirectionBaseConsole] = useState<"left" | "bottom" | "right">("left")
    // 监听console方向打开
    useEffect(() => {
        ipcRenderer.on("callback-direction-console-log", (e, res: any) => {
            if (res?.direction) {
                setDirectionBaseConsole(res.direction)
                setIsShowBaseConsole(true)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("callback-direction-console-log")
        }
    }, [])
    // 缓存console展示状态 用于状态互斥
    useEffect(() => {
        setLocalValue("SHOW_BASE_CONSOLE", isShowBaseConsole)
    }, [isShowBaseConsole])

    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])

    useEffect(() => {
        ipcRenderer.on("refresh-token", (e, res: any) => {
            refreshToken(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-token")
        }
    }, [])

    // useEffect(()=>{
    //     if(selectItemPage&&setSelectItemPage){
    //         goRouterPage(selectItemPage)
    //         setSelectItemPage(undefined)
    //     }
    // },[selectItemPage])

    // yakit页面关闭是否二次确认提示
    const [winCloseFlag, setWinCloseFlag] = useState<boolean>(true)
    const [winCloseShow, setWinCloseShow] = useState<boolean>(false)
    useEffect(() => {
        ipcRenderer
            .invoke("fetch-local-cache", LocalGV.WindowsCloseFlag)
            .then((flag: any) => setWinCloseFlag(flag === undefined ? true : flag))
    }, [])

    useEffect(() => {
        const firstUseProjectFlag = `FIRST_USE_PROJECT_BETA_SrLYymNzXvhO`
        getRemoteValue(firstUseProjectFlag)
            .then((value) => {
                if (!value) {
                    const m = showModal({
                        title: "重要提示",
                        content: (
                            <Space direction={"vertical"}>
                                <div>{`本系统 >= 1.1.17，引擎 >= 1.1.18 后为了新增 "项目" 功能，项目数据库和用户数据库进行了严格分离`}</div>
                                <div>用户可在 "数据库" - "项目管理" 中查看新的项目管理 （Beta）</div>
                                <div>您的流量数据与扫描结果将会存储新的项目数据库中</div>
                                <Alert
                                    type={"warning"}
                                    description={
                                        "原本的用户数据并不会丢失，用户目录下 SQLite3 数据库 yakit-projects/default-yakit.db 包含所有用户信息"
                                    }
                                />
                                <div>
                                    <Button.Group>
                                        <Button
                                            onClick={() => {
                                                m.destroy()
                                            }}
                                        >
                                            Ok
                                        </Button>
                                        <Button
                                            type={"link"}
                                            onClick={() => {
                                                m.destroy()
                                                setRemoteValue(firstUseProjectFlag, "1").catch((e) => {})
                                            }}
                                        >
                                            知道了，不再提示
                                        </Button>
                                    </Button.Group>
                                </div>
                            </Space>
                        )
                    })
                    return
                }
            })
            .catch((e) => {
                info("无法获取第一次使用项目标签")
            })
    }, [])

    // useEffect(() => {
    //     if (engineStatus === "error") props.onErrorConfirmed && props.onErrorConfirmed()
    // }, [engineStatus])

    // 整合路由对应名称
    const pluginKey = (item: PluginMenuItem) => `plugin:${item.Group}:${item.YakScriptId}`
    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())

    // Tabs Bar Operation Function
    const getCacheIndex = (route: string) => {
        const targets = getPageCache().filter((i) => i.route === route)
        return targets.length > 0 ? getPageCache().indexOf(targets[0]) : -1
    }
    const addTabPage = useMemoizedFn(
        (
            route: Route,
            nodeParams?: {
                time?: string
                node: ReactNode
                isRecord?: boolean
                hideAdd?: boolean
                verbose?: string
            }
        ) => {
            const filterPage = pageCache.filter((i) => i.route === route)
            const filterPageLength = filterPage.length
            // debugger
            if (singletonRoute.includes(route)) {
                if (filterPageLength > 0) {
                    setCurrentTabKey(route)
                } else {
                    const tabName = RouteNameToVerboseName(routeKeyToLabel.current.get(`${route}`) || `${route}`)
                    setPageCache([
                        ...pageCache,
                        {
                            verbose: nodeParams?.verbose || tabName,
                            route: route,
                            singleNode: ContentByRoute(route),
                            multipleNode: []
                        }
                    ])
                    setCurrentTabKey(route)
                }
            } else {
                if (filterPageLength > 0) {
                    const tabName = RouteNameToVerboseName(routeKeyToLabel.current.get(`${route}`) || `${route}`)
                    const tabId = `${route}-[${randomString(49)}]`
                    const time = new Date().getTime().toString()
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: nodeParams?.verbose || `${tabName}-[${filterPage[0].multipleNode.length + 1}]`,
                        node: nodeParams && nodeParams.node ? nodeParams?.node || <></> : ContentByRoute(route),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    const pages = pageCache.map((item) => {
                        if (item.route === route) {
                            item.multipleNode.push(node)
                            item.multipleCurrentKey = tabId
                            return item
                        }
                        return item
                    })
                    setPageCache([...pages])
                    setCurrentTabKey(route)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                } else {
                    const tabName = RouteNameToVerboseName(routeKeyToLabel.current.get(`${route}`) || `${route}`)
                    const tabId = `${route}-[${randomString(49)}]`
                    const time = new Date().getTime().toString()
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: nodeParams?.verbose || `${tabName}-[1]`,
                        node: nodeParams && nodeParams.node ? nodeParams?.node || <></> : ContentByRoute(route),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    setPageCache([
                        ...pageCache,
                        {
                            verbose: tabName,
                            route: route,
                            singleNode: undefined,
                            multipleNode: [node],
                            multipleCurrentKey: tabId,
                            hideAdd: nodeParams?.hideAdd
                        }
                    ])
                    setCurrentTabKey(route)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                }
            }
        }
    )
    const menuAddPage = useMemoizedFn((route: Route) => {
        if (route === "ignore") return

        if (route === Route.HTTPFuzzer) {
            const time = new Date().getTime().toString()
            addTabPage(Route.HTTPFuzzer, {
                time: time,
                node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                    system: system,
                    order: time
                }),
                isRecord: true
            })
        } else addTabPage(route as Route)
    })
    const removePage = (route: string, isClose: boolean = true) => {
        const targetIndex = getCacheIndex(route)
        if (route === Route.AddYakitScript && isClose) {
            ipcRenderer.invoke("tab-isClose")
            return
        }
        if (targetIndex > 0 && getPageCache()[targetIndex - 1]) {
            const targetCache = getPageCache()[targetIndex - 1]
            setCurrentTabKey(targetCache.route)
        }
        if (targetIndex === 0 && getPageCache()[targetIndex + 1]) {
            const targetCache = getPageCache()[targetIndex + 1]
            setCurrentTabKey(targetCache.route)
        }
        if (targetIndex === 0 && getPageCache().length === 1) setCurrentTabKey("" as any)

        setPageCache(getPageCache().filter((i) => i.route !== route))

        if (route === Route.HTTPFuzzer) delFuzzerList(1)
    }
    const updateCacheVerbose = (id: string, verbose: string) => {
        const index = getCacheIndex(id)
        if (index < 0) return
        pageCache[index].verbose = verbose
        setPageCache([...pageCache])
    }
    const setMultipleCurrentKey = useMemoizedFn((key: string, type: Route) => {
        const arr = pageCache.map((item) => {
            if (item.route === type) {
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
    })
    const removeMultipleNodePage = useMemoizedFn((key: string, type: Route) => {
        const removeArr: multipleNodeInfo[] = pageCache.filter((item) => item.route === type)[0]?.multipleNode || []
        if (removeArr.length === 0) return
        const nodes = removeArr.filter((item) => item.id === key)
        const time = nodes[0].time

        let index = 0
        for (let i in removeArr) {
            if (removeArr[i].id === key) {
                index = +i
                break
            }
        }

        if (index === 0 && removeArr.length === 1) {
            removePage(`${type}`)
            return
        }

        let current = ""
        let filterArr: multipleNodeInfo[] = []
        if (index > 0 && removeArr[index - 1]) {
            current = removeArr[index - 1].id
            filterArr = removeArr.filter((item) => item.id !== key)
        }
        if (index === 0 && removeArr[index + 1]) {
            current = removeArr[index + 1].id
            filterArr = removeArr.filter((item) => item.id !== key)
        }

        if (current) {
            const arr = pageCache.map((item) => {
                if (item.route === type) {
                    item.multipleNode = [...filterArr]
                    item.multipleCurrentKey = current
                    return item
                }
                return item
            })
            setPageCache([...arr])
            if (type === Route.HTTPFuzzer) delFuzzerList(2, time)
        }
    })
    const removeOtherMultipleNodePage = useMemoizedFn((key: string, type: Route) => {
        const removeArr: multipleNodeInfo[] = pageCache.filter((item) => item.route === type)[0]?.multipleNode || []
        if (removeArr.length === 0) return
        const nodes = removeArr.filter((item) => item.id === key)
        const time = nodes[0].time

        const arr = pageCache.map((item) => {
            if (item.route === type) {
                item.multipleNode = [...nodes]
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
        if (type === Route.HTTPFuzzer) delFuzzerList(3, time)
    })
    const updateCacheVerboseMultipleNodePage = useMemoizedFn((key: string, tabType: string, verbose: string) => {
        const index = getCacheIndex(tabType)
        if (index < 0) return
        const indexNode = pageCache[index].multipleNode.findIndex((ele) => ele.id === key)
        if (indexNode < 0) return
        pageCache[index].multipleNode[indexNode].verbose = verbose
        // webFuzzer
        if (tabType === "httpFuzzer") {
            const currentTimeKey: string = pageCache[index].multipleNode[indexNode].time
            const newFuzzerItem = {...fuzzerList.current.get(currentTimeKey)}
            updateFuzzerList(currentTimeKey, {...newFuzzerItem, time: currentTimeKey, verbose})
        }
        setPageCache([...pageCache])
    })
    // 全局记录鼠标坐标位置(为右键菜单提供定位)
    const coordinateTimer = useRef<any>(null)
    useEffect(() => {
        document.onmousemove = (e) => {
            const {screenX, screenY, clientX, clientY, pageX, pageY} = e
            if (coordinateTimer.current) {
                clearTimeout(coordinateTimer.current)
                coordinateTimer.current = null
            }
            coordinateTimer.current = setTimeout(() => {
                coordinate.screenX = screenX
                coordinate.screenY = screenY
                coordinate.clientX = clientX
                coordinate.clientY = clientY
                coordinate.pageX = pageX
                coordinate.pageY = pageY
            }, 50)
        }
    }, [])
    // 全局监听登录状态
    const {userInfo, setStoreUserInfo} = useStore()
    useEffect(() => {
        ipcRenderer.on("fetch-signin-token", (e, res: UserInfoProps) => {
            // 刷新用户信息
            setStoreUserInfo(res)
            // 刷新引擎
            IsEnterprise
                ? setRemoteValue("token-online-enterprise", res.token)
                : setRemoteValue("token-online", res.token)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-signin-token")
        }
    }, [])

    useEffect(() => {
        // 企业版初始进入页面（已登录）已获取用户信息 因此刷新
        if (IsEnterprise) {
            ipcRenderer.send("company-refresh-in")
        }
    }, [])

    useEffect(() => {
        ipcRenderer.on("login-out", (e) => {
            setStoreUserInfo(defaultUserInfo)
            if (IsEnterprise) {
                setJudgeLicense && setJudgeLicense(true)
                removePage(Route.AccountAdminPage, false)
                removePage(Route.RoleAdminPage, false)
            } else {
                removePage(Route.LicenseAdminPage, false)
                removePage(Route.TrustListPage, false)
                removePage(Route.PlugInAdminPage, false)
            }
            IsEnterprise ? setRemoteValue("token-online-enterprise", "") : setRemoteValue("token-online", "")
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out")
        }
    }, [])

    const [userMenu, setUserMenu] = useState<MenuItemType[]>([
        {key: "sign-out", title: "退出登录"},
        {key: "account-bind", title: "帐号绑定(监修)", disabled: true}
    ])

    useEffect(() => {
        const SetUserInfoModule = () => <SetUserInfo userInfo={userInfo} setStoreUserInfo={setStoreUserInfo} />
        // 非企业管理员登录
        if (userInfo.role === "admin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 非企业超级管理员登录
        else if (userInfo.role === "superAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "trust-list", title: "用户管理"},
                {key: "license-admin", title: "License管理"},
                {key: "plugIn-admin", title: "插件权限"},
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
        // 非企业license管理员
        else if (userInfo.role === "licenseAdmin" && userInfo.platform !== "company") {
            setUserMenu([
                {key: "license-admin", title: "License管理"},
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
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
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
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
                {key: "account-bind", title: "帐号绑定(监修)", disabled: true},
                {key: "sign-out", title: "退出登录"}
            ])
        }
    }, [userInfo.role, userInfo.companyHeadImg])

    // 全局注册快捷键功能
    const documentKeyDown = useMemoizedFn((e: any) => {
        // ctrl + w 关闭tab页面
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (pageCache.length === 0 || currentTabKey === Route.NewHome) return

            setLoading(true)
            removePage(`${currentTabKey}`)
            setTimeout(() => setLoading(false), 300)
            return
        }
    })
    useEffect(() => {
        document.onkeydown = documentKeyDown
    }, [])

    // fuzzer本地缓存
    const fuzzerList = useRef<Map<string, fuzzerInfoProp>>(new Map<string, fuzzerInfoProp>())
    const saveFuzzerList = debounce(() => {
        const historys: fuzzerInfoProp[] = []
        fuzzerList.current.forEach((value) => historys.push(value))
        // historys.sort((a, b) => +a.time - +b.time)
        const filters = historys.filter(
            (item) => (item.request || "").length < 1000000 && (item.request || "").length > 0
        )
        setRemoteValue(FuzzerCache, JSON.stringify(filters))
    }, 500)
    const fetchFuzzerList = useMemoizedFn(() => {
        setLoading(true)
        fuzzerList.current.clear()

        getRemoteValue(FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res || "[]")
                for (let item of cache) {
                    const time = new Date().getTime().toString()
                    fuzzerList.current.set(time, {...item, time: time})
                    addTabPage(Route.HTTPFuzzer, {
                        time: time,
                        verbose: item.verbose, // webFuzzer 保存的修改后的菜单二级tab名字
                        node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                            isHttps: item.isHttps || false,
                            request: item.request || "",
                            fuzzerParams: item,
                            system: system,
                            order: time
                        })
                    })
                }
            })
            .catch((e) => {
                console.info(e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const addFuzzerList = (key: string, request?: string, isHttps?: boolean, verbose?: string) => {
        fuzzerList.current.set(key, {request, isHttps, time: key, verbose})
    }
    const delFuzzerList = (type: number, key?: string) => {
        if (type === 1) fuzzerList.current.clear()
        if (type === 2 && key) if (fuzzerList.current.has(key)) fuzzerList.current.delete(key)
        if (type === 3 && key) {
            const info = fuzzerList.current.get(key)
            if (info) {
                fuzzerList.current.clear()
                fuzzerList.current.set(key, info)
            }
        }
        saveFuzzerList()
    }
    const updateFuzzerList = (key: string, param: fuzzerInfoProp) => {
        fuzzerList.current.set(key, param)
        saveFuzzerList()
    }
    useEffect(() => {
        setPageCache([
            {
                verbose: "首页",
                route: Route.NewHome,
                singleNode: ContentByRoute(Route.NewHome),
                multipleNode: []
            }
        ])
        ipcRenderer.on("fetch-fuzzer-setting-data", (e, res: any) => {
            try {
                updateFuzzerList(res.key, {...(fuzzerList.current.get(res.key) || {}), ...JSON.parse(res.param)})
            } catch (error) {
                failed("webFuzzer数据缓存失败：" + error)
            }
        })
        // 开发环境不展示fuzzer缓存
        ipcRenderer
            .invoke("is-dev")
            .then((flag) => {})
            .finally(() => {
                fetchFuzzerList()
            })
        return () => {
            ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
        }
    }, [])

    // 加载补全
    useEffect(() => {
        ipcRenderer.invoke("GetYakitCompletionRaw").then((data: {RawJson: Uint8Array}) => {
            try {
                const completionJson = Buffer.from(data.RawJson).toString("utf8")
                const total = JSON.parse(completionJson) as CompletionTotal
                setYaklangCompletions(total)
            } catch (e) {
                console.info(e)
            }

            // success("加载 Yak 语言自动补全成功 / Load Yak IDE Auto Completion Finished")
        })

        //
        ipcRenderer.invoke("GetYakVMBuildInMethodCompletion", {}).then((data: {Suggestions: MethodSuggestion[]}) => {
            try {
                if (!data) {
                    return
                }
                if (data.Suggestions.length <= 0) {
                    return
                }
                setYaklangBuildInMethodCompletion(data.Suggestions)
            } catch (e) {
                console.info(e)
            }
        })
    }, [])

    useHotkeys("Ctrl+Alt+T", () => {
        addWebsocketHistory({})
    })

    useEffect(() => {
        ipcRenderer.invoke("query-latest-notification").then((e: string) => {
            setNotification(e)

            if (e) {
                success(
                    <>
                        <Space direction={"vertical"}>
                            <span>来自于 yaklang.io 的通知</span>
                            <Button
                                type={"link"}
                                onClick={() => {
                                    showModal({
                                        title: "Notification",
                                        content: (
                                            <>
                                                <MDEditor.Markdown source={e} />
                                            </>
                                        )
                                    })
                                }}
                            >
                                点击查看
                            </Button>
                        </Space>
                    </>
                )
            }
        })
    }, [])

    // 新增数据对比页面
    useEffect(() => {
        ipcRenderer.on("main-container-add-compare", (e, params) => {
            const newTabId = `${Route.DataCompare}-[${randomString(49)}]`
            const verboseNameRaw = routeKeyToLabel.current.get(Route.DataCompare) || `${Route.DataCompare}`
            addTabPage(Route.DataCompare, {node: ContentByRoute(Route.DataCompare, undefined, {system: system})})

            // 区分新建对比页面还是别的页面请求对比的情况
            ipcRenderer.invoke("created-data-compare")
        })
        // if(getPageCache().length===0){

        // }
        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
        }
    }, [pageCache])

    // Global Sending Function(全局发送功能|通过发送新增功能页面)
    const addFuzzer = useMemoizedFn((res: any) => {
        const {isHttps, request, list} = res || {}
        const time = new Date().getTime().toString()
        if (request) {
            addTabPage(Route.HTTPFuzzer, {
                time: time,
                node: ContentByRoute(Route.HTTPFuzzer, undefined, {
                    isHttps: isHttps || false,
                    request: request || "",
                    system: system,
                    order: time,
                    shareContent: res.shareContent
                })
            })
            addFuzzerList(time, request || "", isHttps || false)
        }
    })

    // websocket fuzzer 和 Fuzzer 类似
    const addWebsocketFuzzer = useMemoizedFn((res: {tls: boolean; request: Uint8Array}) => {
        addTabPage(Route.WebsocketFuzzer, {
            hideAdd: false,
            isRecord: false,
            node: ContentByRoute(Route.WebsocketFuzzer, undefined, {
                wsRequest: res.request,
                wsTls: res.tls
            }),
            time: ""
        })
    })
    // websocket fuzzer 和 Fuzzer 类似
    const addWebsocketHistory = useMemoizedFn((res: any) => {
        addTabPage(Route.WebsocketHistory, {hideAdd: false, isRecord: false, node: undefined, time: ""})
    })

    const addYakScript = useMemoizedFn((res: any) => {
        const time = new Date().getTime().toString()
        addTabPage(Route.AddYakitScript, {
            time: time,
            node: ContentByRoute(Route.AddYakitScript, undefined)
        })
    })
    const addYakPluginJournalDetails = useMemoizedFn((res: any) => {
        const time = new Date().getTime().toString()
        addTabPage(Route.YakitPluginJournalDetails, {
            time: time,
            node: ContentByRoute(Route.YakitPluginJournalDetails, undefined, {
                YakScriptJournalDetailsId: res.YakScriptJournalDetailsId
            }),
            hideAdd: true
        })
    })
    const addOnlinePluginRecycleBin = useMemoizedFn((res: any) => {
        const time = new Date().getTime().toString()
        addTabPage(Route.OnlinePluginRecycleBin, {
            time: time,
            node: ContentByRoute(Route.OnlinePluginRecycleBin, undefined)
        })
    })
    const addFacadeServer = useMemoizedFn((res: any) => {
        const {facadeParams, classParam, classType} = res || {}
        if (facadeParams && classParam && classType) {
            addTabPage(Route.ReverseServer_New, {
                node: ContentByRoute(Route.ReverseServer_New, undefined, {
                    facadeServerParams: facadeParams,
                    classGeneraterParams: classParam,
                    classType: classType
                })
            })
        }
    })
    const addScanPort = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            addTabPage(Route.Mod_ScanPort, {
                node: ContentByRoute(Route.Mod_ScanPort, undefined, {scanportParams: URL})
            })
        }
    })
    const addBrute = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            addTabPage(Route.Mod_Brute, {
                node: ContentByRoute(Route.Mod_Brute, undefined, {bruteParams: URL})
            })
        }
    })
    // 发送到专项漏洞检测modal-show变量
    const [bugTestShow, setBugTestShow] = useState<boolean>(false)
    const [bugList, setBugList] = useState<BugInfoProps[]>([])
    const [bugTestValue, setBugTestValue] = useState<BugInfoProps[]>([])
    const [bugUrl, setBugUrl] = useState<string>("")
    const addBugTest = useMemoizedFn((type: number, res?: any) => {
        const {URL = ""} = res || {}
        if (type === 1 && URL) {
            setBugUrl(URL)
            ipcRenderer
                .invoke("fetch-local-cache", CustomBugList)
                .then((res: any) => {
                    setBugList(res ? JSON.parse(res) : [])
                    setBugTestShow(true)
                })
                .catch(() => {})
        }
        if (type === 2) {
            const filter = pageCache.filter((item) => item.route === Route.PoC)
            if (filter.length === 0) {
                addTabPage(Route.PoC)
                setTimeout(() => {
                    ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                    setBugTestValue([])
                    setBugUrl("")
                }, 300)
            } else {
                ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                setCurrentTabKey(Route.PoC)
                setBugTestValue([])
                setBugUrl("")
            }
        }
    })
    const addYakRunning = useMemoizedFn((res: any) => {
        const {name = "", code = ""} = res || {}
        const filter = pageCache.filter((item) => item.route === Route.YakScript)

        if (!name || !code) return false

        if ((filter || []).length === 0) {
            addTabPage(Route.YakScript)
            setTimeout(() => {
                ipcRenderer.invoke("send-to-yak-running", {name, code})
            }, 300)
        } else {
            ipcRenderer.invoke("send-to-yak-running", {name, code})
            setCurrentTabKey(Route.YakScript)
        }
    })

    const addBatchExecRecover = useMemoizedFn((task: UnfinishedBatchTask) => {
        addTabPage(Route.BatchExecutorRecover, {
            hideAdd: true,
            node: ContentByRoute(Route.BatchExecutorRecover, undefined, {
                recoverUid: task.Uid,
                recoverBaseProgress: task.Percent
            })
        })
    })

    const addPacketScan = useMemoizedFn(
        (httpFlows: number[], https: boolean, request?: Uint8Array, keyword?: string) => {
            addTabPage(Route.PacketScanPage, {
                hideAdd: true,
                node: ContentByRoute(Route.PacketScanPage, undefined, {
                    packetScan_FlowIds: httpFlows,
                    packetScan_Https: https,
                    packetScan_HttpRequest: request,
                    packetScan_Keyword: keyword
                })
            })
        }
    )

    useEffect(() => {
        // 写成HOC是否好点呢，现在一个页面启动就是一个函数
        ipcRenderer.on("fetch-send-to-tab", (e, res: any) => {
            const {type, data = {}} = res
            if (type === "fuzzer") addFuzzer(data)
            if (type === "websocket-fuzzer") addWebsocketFuzzer(data)
            if (type === "scan-port") addScanPort(data)
            if (type === "brute") addBrute(data)
            if (type === "bug-test") addBugTest(1, data)
            if (type === "plugin-store") addYakRunning(data)
            if (type === "batch-exec-recover") addBatchExecRecover(data as UnfinishedBatchTask)
            if (type === "exec-packet-scan")
                addPacketScan(data["httpFlows"], data["https"], data["httpRequest"], data["keyword"])
            if (type === "add-yakit-script") addYakScript(data)
            if (type === "yakit-plugin-journal-details") addYakPluginJournalDetails(data)
            if (type === "online-plugin-recycle-bin") addOnlinePluginRecycleBin(data)
            if (type === "facade-server") addFacadeServer(data)
            if (type === "add-yak-running") addYakRunning(data)
            console.info("send to tab: ", type)
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-tab")
        }
    }, [])
    useEffect(() => {
        ipcRenderer.on("fetch-close-tab", (e, res: any) => {
            const {router, singleNode} = res
            if (singleNode) {
                removePage(router, false)
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-close-tab")
        }
    }, [])

    // Tabs Bar 组件
    const closeAllCache = useMemoizedFn(() => {
        Modal.confirm({
            title: "确定要关闭所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                delFuzzerList(1)
                setPageCache([
                    {
                        verbose: "首页",
                        route: Route.NewHome,
                        singleNode: ContentByRoute(Route.NewHome),
                        multipleNode: []
                    }
                ])
                setCurrentTabKey(Route.NewHome)
            }
        })
    })
    const closeOtherCache = useMemoizedFn((route: string) => {
        Modal.confirm({
            title: "确定要关闭除此之外所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                const arr = pageCache.filter((i) => i.route === route)
                setPageCache([
                    {
                        verbose: "首页",
                        route: Route.NewHome,
                        singleNode: ContentByRoute(Route.NewHome),
                        multipleNode: []
                    },
                    ...arr
                ])
                if (route === Route.HTTPFuzzer) delFuzzerList(1)
            }
        })
    })
    const goRouterPage = (key: Route) => {
        const flag = pageCache.filter((item) => item.route === key).length === 0
        if (flag) menuAddPage(key)
        else setCurrentTabKey(key)
    }

    useEffect(() => {
        ipcRenderer.on("callback-open-user-manage", (e, type: Route) => {
            goRouterPage(type)
        })
        return () => {
            ipcRenderer.removeAllListeners("callback-open-user-manage")
        }
    }, [])
    const [isShowCustomizeMenu, setIsShowCustomizeMenu] = useState<boolean>(false) //是否显示自定义菜单页面
    useEffect(() => {
        ipcRenderer.on("fetch-open-customize-menu", (e, type: Route) => {
            setIsShowCustomizeMenu(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-open-customize-menu")
        }
    }, [])

    const bars = (props: any, TabBarDefault: any) => {
        return (
            <TabBarDefault
                {...props}
                children={(barNode: React.ReactElement) => {
                    return (
                        <DropdownMenu
                            menu={{
                                data: [
                                    {key: "all", title: "关闭所有Tabs"},
                                    {key: "other", title: "关闭其他Tabs"}
                                ]
                            }}
                            dropdown={{trigger: ["contextMenu"]}}
                            onClick={(key) => {
                                switch (key) {
                                    case "all":
                                        closeAllCache()
                                        break
                                    case "other":
                                        closeOtherCache(`${barNode.key}`)
                                        break
                                    default:
                                        break
                                }
                            }}
                        >
                            {barNode}
                        </DropdownMenu>
                    )
                }}
            />
        )
    }
    const onRouteMenuSelect = useMemoizedFn((key: string) => {
        if (!key || key === "undefined") {
            failed("不存在")
            return
        }
        menuAddPage(key as Route)
    })
    return (
        <Layout className='yakit-main-layout'>
            <AutoSpin spinning={loading}>
                {isShowCustomizeMenu && (
                    <CustomizeMenu visible={isShowCustomizeMenu} onClose={() => setIsShowCustomizeMenu(false)} />
                )}
                <div style={{display: isShowCustomizeMenu ? "none" : "flex", flexDirection: "column", height: "100%"}}>
                    <HeardMenu
                        onRouteMenuSelect={onRouteMenuSelect}
                        setRouteKeyToLabel={(val) => {
                            val.forEach((value, key) => {
                                routeKeyToLabel.current.set(key, value)
                            })
                        }}
                    />
                    <Content
                        style={{
                            margin: 0,
                            backgroundColor: "#fff",
                            overflow: "auto",
                            flex: 1
                            // marginTop: 0
                        }}
                    >
                        <Layout style={{height: "100%", overflow: "hidden"}}>
                            <Content
                                style={{
                                    overflow: "hidden",
                                    backgroundColor: "#fff",
                                    height: "100%",
                                    display: "flex",
                                    flexFlow: "column",
                                    marginLeft: 0
                                }}
                            >
                                <div
                                    style={{
                                        padding: 0,
                                        overflow: "hidden",
                                        flex: "1",
                                        display: "flex",
                                        flexFlow: "column"
                                    }}
                                >
                                    {pageCache.length > 0 ? (
                                        <Tabs
                                            style={{display: "flex", flex: "1"}}
                                            // tabBarStyle={{marginBottom: 8}}
                                            className='main-content-tabs yakit-layout-tabs'
                                            activeKey={currentTabKey}
                                            onChange={setCurrentTabKey}
                                            size={"small"}
                                            type={"editable-card"}
                                            renderTabBar={(props, TabBarDefault) => {
                                                return bars(props, TabBarDefault)
                                            }}
                                            hideAdd={true}
                                            onTabClick={(key, e) => {
                                                const divExisted = document.getElementById("yakit-cursor-menu")
                                                if (divExisted) {
                                                    const div: HTMLDivElement = divExisted as HTMLDivElement
                                                    const unmountResult = ReactDOM.unmountComponentAtNode(div)
                                                    if (unmountResult && div.parentNode) {
                                                        div.parentNode.removeChild(div)
                                                    }
                                                }
                                            }}
                                        >
                                            {pageCache.map((i) => {
                                                return (
                                                    <Tabs.TabPane
                                                        forceRender={true}
                                                        key={i.route}
                                                        tab={i.verbose}
                                                        closeIcon={
                                                            <Space>
                                                                {/* <Popover
                                                                    trigger={"click"}
                                                                    title={"修改名称"}
                                                                    content={
                                                                        <>
                                                                            <Input
                                                                                size={"small"}
                                                                                defaultValue={i.verbose}
                                                                                onBlur={(e) =>
                                                                                    updateCacheVerbose(
                                                                                        `${i.route}`,
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                            />
                                                                        </>
                                                                    }
                                                                >
                                                                    <EditOutlined className='main-container-cion' />
                                                                </Popover> */}
                                                                {i.verbose !== "首页" && (
                                                                    <CloseOutlined
                                                                        className='main-container-cion'
                                                                        onClick={() => removePage(`${i.route}`)}
                                                                    />
                                                                )}
                                                            </Space>
                                                        }
                                                    >
                                                        <div
                                                            style={{
                                                                overflowY: NoScrollRoutes.includes(i.route)
                                                                    ? "hidden"
                                                                    : "auto",
                                                                overflowX: "hidden",
                                                                height: "100%",
                                                                maxHeight: "100%",
                                                                padding:
                                                                    !i.singleNode || noPaddingPage.includes(i.route)
                                                                        ? 0
                                                                        : "8px 16px 13px 16px"
                                                            }}
                                                        >
                                                            {i.singleNode ? (
                                                                <>
                                                                    {i.verbose === "首页" ? (
                                                                        currentTabKey === Route.NewHome ? (
                                                                            i.singleNode
                                                                        ) : (
                                                                            <></>
                                                                        )
                                                                    ) : (
                                                                        i.singleNode
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <MainTabs
                                                                    currentTabKey={currentTabKey}
                                                                    tabType={i.route}
                                                                    pages={i.multipleNode}
                                                                    currentKey={i.multipleCurrentKey || ""}
                                                                    isShowAdd={!i.hideAdd}
                                                                    setCurrentKey={(key, type) => {
                                                                        setMultipleCurrentKey(key, type as Route)
                                                                    }}
                                                                    removePage={(key, type) => {
                                                                        removeMultipleNodePage(key, type as Route)
                                                                    }}
                                                                    removeOtherPage={(key, type) => {
                                                                        removeOtherMultipleNodePage(key, type as Route)
                                                                    }}
                                                                    onAddTab={() => menuAddPage(i.route)}
                                                                    updateCacheVerbose={
                                                                        updateCacheVerboseMultipleNodePage
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </Tabs.TabPane>
                                                )
                                            })}
                                        </Tabs>
                                    ) : (
                                        <></>
                                    )}
                                    {isShowBaseConsole && (
                                        <BaseConsole
                                            setIsShowBaseConsole={setIsShowBaseConsole}
                                            directionBaseConsole={directionBaseConsole}
                                        />
                                    )}
                                </div>
                            </Content>
                        </Layout>
                    </Content>
                </div>
            </AutoSpin>
            <Modal
                visible={bugTestShow}
                onCancel={() => setBugTestShow(false)}
                footer={[
                    <Button key='link' onClick={() => setBugTestShow(false)}>
                        取消
                    </Button>,
                    <Button
                        key='back'
                        type='primary'
                        onClick={() => {
                            if ((bugTestValue || []).length === 0) return failed("请选择类型后再次提交")
                            addBugTest(2)
                            setBugTestShow(false)
                        }}
                    >
                        确定
                    </Button>
                ]}
            >
                <ItemSelects
                    item={{
                        label: "专项漏洞类型",
                        style: {marginTop: 20}
                    }}
                    select={{
                        allowClear: true,
                        data: BugList.concat(bugList) || [],
                        optText: "title",
                        optValue: "key",
                        value: (bugTestValue || [])[0]?.key,
                        onChange: (value, option: any) => {
                            const {record} = option
                            setBugTestValue(
                                value
                                    ? [
                                          {
                                              filter: record?.filter,
                                              key: record?.key,
                                              title: record?.title
                                          }
                                      ]
                                    : []
                            )
                        }
                    }}
                />
            </Modal>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
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
        </Layout>
    )
})

export default Main
