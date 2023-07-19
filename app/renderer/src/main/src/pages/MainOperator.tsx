import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Alert, Avatar, Button, Form, Layout, Modal, Space, Tabs, Upload} from "antd"
import {CameraOutlined, CloseOutlined, ExclamationCircleOutlined} from "@ant-design/icons"
import {failed, info, success, yakitNotify} from "../utils/notification"
import {showModal} from "../utils/showModal"
import {
    CompletionTotal,
    MethodSuggestion,
    setYaklangBuildInMethodCompletion,
    setYaklangCompletions
} from "../utils/monacoSpec/yakCompletionSchema"
import {randomString} from "../utils/randomUtil"
import MDEditor from "@uiw/react-md-editor"
import {QueryYakScriptsResponse} from "./invoker/schema"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import ReactDOM from "react-dom"
import debounce from "lodash/debounce"
import {AutoSpin} from "../components/AutoSpin"
import {BugInfoProps, BugList, CustomBugList} from "./invoker/batch/YakBatchExecutors"
import {DropdownMenu} from "@/components/baseTemplate/DropdownMenu"
import {addToTab, MainTabs} from "./MainTabs"
import Login from "./Login"
import SetPassword from "./SetPassword"
import {UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import {UnfinishedBatchTask, UnfinishedSimpleDetectBatchTask} from "./invoker/batch/UnfinishedBatchTaskList"
import {refreshToken} from "@/utils/login"
import {
    getLocalValue,
    getRemoteProjectValue,
    getRemoteValue,
    setLocalValue,
    setRemoteProjectValue,
    setRemoteValue
} from "@/utils/kv"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {
    globalUserLogin,
    isBreachTrace,
    isCommunityEdition,
    isEnpriTraceAgent,
    shouldVerifyEnpriTraceLogin
} from "@/utils/envfile"
import HeardMenu from "./layout/HeardMenu/HeardMenu"
import {RemoteGV} from "@/yakitGV"
import {EnterpriseLoginInfoIcon} from "@/assets/icons"
import {BaseConsole} from "../components/baseConsole/BaseConsole"
import CustomizeMenu from "./customizeMenu/CustomizeMenu"
import {ControlOperation} from "@/pages/dynamicControl/DynamicControl"
import {YakitHintModal} from "@/components/yakitUI/YakitHint/YakitHintModal"
import {DownloadAllPlugin} from "@/pages/simpleDetect/SimpleDetect"
import {useSubscribeClose, YakitSecondaryConfirmProps} from "@/store/tabSubscribe"
import {YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {RemoveIcon} from "@/assets/newIcon"
import {useScreenRecorder} from "@/store/screenRecorder"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import PublicMenu, {RouteToPageProps} from "./layout/publicMenu/PublicMenu"
import {
    NoPaddingRoute,
    NoScrollRoutes,
    RouteToPage,
    SinglePageRoute,
    YakitRoute,
    YakitRouteToPageInfo
} from "@/routes/newRoute"
import {keyToRouteInfo, routeConvertKey} from "./layout/publicMenu/utils"
import {YakChatCS} from "@/components/yakChat/chatCS"
import yakitCattle from "../assets/yakitCattle.png"

import "./main.scss"
import "./GlobalClass.scss"

const {ipcRenderer} = window.require("electron")
const {Content} = Layout

/** web-fuzzer缓存数据对应键 */
const FuzzerCache = "fuzzer-list-cache"

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

export interface MenuItemType {
    key: string
    label?: ReactNode
    title?: string
    render?: (info: any) => ReactNode
    icon?: ReactNode
    danger?: boolean
    disabled?: boolean
}

export const judgeAvatar = (userInfo, size: number, avatarColor: string) => {
    const {companyHeadImg, companyName} = userInfo

    return companyHeadImg && !!companyHeadImg.length ? (
        <Avatar size={size} style={{cursor: "pointer"}} src={companyHeadImg} />
    ) : (
        <Avatar size={size} style={{backgroundColor: avatarColor, cursor: "pointer"}}>
            {companyName && companyName.slice(0, 1)}
        </Avatar>
    )
}

export interface SetUserInfoProp {
    userInfo: UserInfoProps
    setStoreUserInfo: (info: any) => void
    avatarColor: string
}

// 可上传文件类型
const FileType = ["image/png", "image/jpeg", "image/png"]

// 用户信息
export const SetUserInfo: React.FC<SetUserInfoProp> = React.memo((props) => {
    const {userInfo, setStoreUserInfo, avatarColor} = props

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
                    <div className='img-box-mask'>{judgeAvatar(userInfo, 40, avatarColor)}</div>
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
                {userInfo.role === "admin" && (
                    <>
                        <div className='permission-show'>管理员</div>
                        <span className='user-admin-icon'>
                            <EnterpriseLoginInfoIcon />
                        </span>
                    </>
                )}
            </div>
        </div>
    )
})
// web-fuzzer页面缓存数据属性
export interface fuzzerInfoProp {
    time: string

    isHttps?: boolean
    isGmTLS?: boolean
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

/**
 * @name 已打开页面数据
 * @property verbose-页面展示名称
 * @property menuName-页面菜单名称
 * @property route-页面的yakitRoute
 * @property singleNode-单开页面Node
 * @property multipleNode-多开页面的Node合集
 * @property multipleCurrentKey-多开页面当前页面的key
 * @property multipleLength-多开页面已打开过多少个
 * @property hideAdd-二级页面是否隐藏添加按钮
 */
export interface PageCache {
    verbose: string
    menuName: string
    route: YakitRoute
    pluginId?: number
    pluginName?: string
    singleNode: ReactNode | any
    multipleNode: multipleNodeInfo[] | any[]
    multipleCurrentKey?: string
    multipleLength?: number
    hideAdd?: boolean
}
// 页面的唯一标识属性
interface OnlyPageCache {
    menuName: string
    route: YakitRoute
    pluginId?: number
    pluginName?: string
}
// 已打开页面的二级页面数据
export interface multipleNodeInfo {
    id: string
    verbose: string
    node: ReactNode
    time?: string
}
// 软件初始化时的默认打开页面数据
const getInitPageCache: () => PageCache[] = () => {
    if (isEnpriTraceAgent()) {
        return []
    }

    if (isBreachTrace()) {
        return [
            {
                verbose: "入侵模拟",
                menuName: YakitRouteToPageInfo[YakitRoute.DB_ChaosMaker].label,
                route: YakitRoute.DB_ChaosMaker,
                singleNode: RouteToPage(YakitRoute.DB_ChaosMaker),
                multipleNode: []
            }
        ]
    }

    return [
        {
            verbose: "首页",
            menuName: YakitRouteToPageInfo[YakitRoute.NewHome].label,
            route: YakitRoute.NewHome,
            singleNode: RouteToPage(YakitRoute.NewHome),
            multipleNode: []
        }
    ]
}
// 软件初始化时的默认当前打开页面的key
const getInitActiveTabKey = () => {
    if (isEnpriTraceAgent()) {
        return ""
    }
    if (isBreachTrace()) {
        return YakitRoute.DB_ChaosMaker
    }

    return YakitRoute.NewHome
}

const Main: React.FC<MainProp> = React.memo((props) => {
    const [loading, setLoading] = useState(false)

    const [pageCache, setPageCache, getPageCache] = useGetState<PageCache[]>(getInitPageCache())
    const [currentTabKey, setCurrentTabKey] = useState<YakitRoute | string>(getInitActiveTabKey())

    // 修改密码弹框
    const [passwordShow, setPasswordShow] = useState<boolean>(false)

    // 登录框状态
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)

    /** ---------- 操作系统 start ---------- */
    // 系统类型
    const [system, setSystem] = useState<string>("")
    useEffect(() => {
        ipcRenderer.invoke("fetch-system-name").then((res) => setSystem(res))
    }, [])
    /** ---------- 操作系统 end ---------- */
    /** ---------- 远程控制 start ---------- */
    // 远程控制浮层
    const [controlShow, setControlShow] = useState<boolean>(false)
    const [controlName, setControlName] = useState<string>("")
    const {dynamicStatus, setDynamicStatus} = yakitDynamicStatus()
    // 定时器监听是否连接/断开
    useEffect(() => {
        const id = setInterval(() => {
            // 当服务启动时 请求接口
            ipcRenderer.invoke("alive-dynamic-control-status").then((is: boolean) => {
                if (is) {
                    getRemoteValue("REMOTE_OPERATION_ID").then((tunnel) => {
                        if (!!tunnel) {
                            NetWorkApi<any, API.RemoteStatusResponse>({
                                method: "get",
                                url: "remote/status",
                                params: {
                                    tunnel
                                }
                            }).then((res) => {
                                if (res.status) {
                                    setDynamicStatus({...dynamicStatus, isDynamicSelfStatus: true})
                                    setControlShow(true)
                                    setControlName(res.user_name || "")
                                } else {
                                    setDynamicStatus({...dynamicStatus, isDynamicSelfStatus: false})
                                    setControlShow(false)
                                }
                            })
                        }
                    })
                } else {
                    setControlShow(false)
                }
            })
        }, 15000)
        // 退出远程控制中页面
        ipcRenderer.on("lougin-out-dynamic-control-page-callback", async () => {
            setControlShow(false)
        })

        return () => {
            clearInterval(id)
            ipcRenderer.removeAllListeners("lougin-out-dynamic-control-page-callback")
        }
    }, [])
    /** ---------- 远程控制 end ---------- */
    /** ---------- 引擎控制台 start ---------- */
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
        setLocalValue(RemoteGV.ShowBaseConsole, isShowBaseConsole)
    }, [isShowBaseConsole])
    /** ---------- 引擎控制台 end ---------- */
    /** ---------- 登录状态变化的逻辑 start ---------- */
    const {userInfo, setStoreUserInfo} = useStore()
    const IsEnpriTrace = shouldVerifyEnpriTraceLogin()

    useEffect(() => {
        ipcRenderer.on("fetch-signin-token", (e, res: UserInfoProps) => {
            // 刷新用户信息
            setStoreUserInfo(res)
            // 刷新引擎
            globalUserLogin(res.token)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-signin-token")
        }
    }, [])

    useEffect(() => {
        // 企业版初始进入页面（已登录）已获取用户信息 因此刷新
        if (shouldVerifyEnpriTraceLogin()) {
            ipcRenderer.send("company-refresh-in")
        }
    }, [])

    useEffect(() => {
        ipcRenderer.on("login-out", (e) => {
            setStoreUserInfo(defaultUserInfo)
            if (IsEnpriTrace) {
                ipcRenderer.invoke("update-judge-license", true)
                // 只要路由不是Plugin_OP,可以把menuName设置为空字符
                removeMenuPage({route: YakitRoute.AccountAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.RoleAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.HoleCollectPage, menuName: ""})
                removeMenuPage({route: YakitRoute.ControlAdminPage, menuName: ""})
            } else {
                // 只要路由不是Plugin_OP,可以把menuName设置为空字符
                removeMenuPage({route: YakitRoute.LicenseAdminPage, menuName: ""})
                removeMenuPage({route: YakitRoute.TrustListPage, menuName: ""})
                removeMenuPage({route: YakitRoute.PlugInAdminPage, menuName: ""})
            }
            IsEnpriTrace ? setRemoteValue("token-online-enterprise", "") : setRemoteValue("token-online", "")
        })
        return () => {
            ipcRenderer.removeAllListeners("login-out")
        }
    }, [])
    /** ---------- 登录状态变化的逻辑 end ---------- */
    /** ---------- 其余逻辑 start ---------- */
    // 线上最新消息提示
    // useEffect(() => {
    //     ipcRenderer.invoke("query-latest-notification").then((e: string) => {
    //         if (e) {
    //             success(
    //                 <>
    //                     <Space direction={"vertical"}>
    //                         <span>来自于 yaklang.io 的通知</span>
    //                         <Button
    //                             type={"link"}
    //                             onClick={() => {
    //                                 showModal({
    //                                     title: "Notification",
    //                                     content: (
    //                                         <>
    //                                             <MDEditor.Markdown source={e} />
    //                                         </>
    //                                     )
    //                                 })
    //                             }}
    //                         >
    //                             点击查看
    //                         </Button>
    //                     </Space>
    //                 </>
    //             )
    //         }
    //     })
    // }, [])
    // 刷新登录状态的token
    useEffect(() => {
        ipcRenderer.on("refresh-token", (e, res: any) => {
            refreshToken(userInfo)
        })
        return () => {
            ipcRenderer.removeAllListeners("refresh-token")
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
    /** ---------- 其余逻辑 end ---------- */
    /** ---------- 一级页面的逻辑 start ---------- */
    /** @name 路由对应的菜单展示名称 */
    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())
    /** @name 打开一个菜单项页面(只负责打开，如果判断页面是否打开，应在执行该方法前判断) */
    const openMenuPage = useMemoizedFn(
        (
            routeInfo: RouteToPageProps,
            nodeParams?: {
                time?: string
                node: ReactNode
                isRecord?: boolean
                hideAdd?: boolean
                verbose?: string
            }
        ) => {
            const {route, pluginId = 0, pluginName = ""} = routeInfo
            // 菜单在代码内的名字
            const menuName = route === YakitRoute.Plugin_OP ? pluginName : YakitRouteToPageInfo[route]?.label || ""
            if (!menuName) return

            const filterPage = pageCache.filter((item) => item.route === route && item.menuName === menuName)
            // 单开页面
            if (SinglePageRoute.includes(route)) {
                const key = routeConvertKey(route, pluginName)
                // 如果存在，设置为当前页面
                if (filterPage.length > 0) {
                    setCurrentTabKey(key)
                    return
                }
                const tabName = routeKeyToLabel.current.get(key) || menuName
                setPageCache([
                    ...pageCache,
                    {
                        verbose: tabName,
                        menuName: menuName,
                        route: route,
                        singleNode: RouteToPage(route),
                        multipleNode: []
                    }
                ])
                setCurrentTabKey(key)
            } else {
                // 多开页面
                const key = routeConvertKey(route, pluginName)
                const tabName = routeKeyToLabel.current.get(key) || menuName
                const tabId = `${key}-[${randomString(6)}]`
                const time = new Date().getTime().toString()

                if (filterPage.length > 0) {
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: nodeParams?.verbose || `${tabName}-[${(filterPage[0].multipleLength || 1) + 1}]`,
                        node:
                            nodeParams && nodeParams.node
                                ? nodeParams?.node || <></>
                                : RouteToPage(route, +pluginId || 0),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    const pages = pageCache.map((item) => {
                        if (item.route === route && item.menuName === menuName) {
                            item.pluginId = pluginId
                            item.multipleNode.push(node)
                            item.multipleCurrentKey = tabId
                            item.multipleLength = (item.multipleLength || 1) + 1
                            return item
                        }
                        return item
                    })
                    setPageCache([...pages])
                    setCurrentTabKey(key)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                } else {
                    const node: multipleNodeInfo = {
                        id: tabId,
                        verbose: nodeParams?.verbose || `${tabName}-[1]`,
                        node:
                            nodeParams && nodeParams.node
                                ? nodeParams?.node || <></>
                                : RouteToPage(route, +pluginId || 0),
                        time: nodeParams && nodeParams.node ? nodeParams?.time || time : time
                    }
                    setPageCache([
                        ...pageCache,
                        {
                            verbose: tabName,
                            menuName: menuName,
                            route: route,
                            pluginId: pluginId,
                            pluginName: route === YakitRoute.Plugin_OP ? pluginName || "" : undefined,
                            singleNode: undefined,
                            multipleNode: [node],
                            multipleCurrentKey: tabId,
                            multipleLength: 1,
                            hideAdd: nodeParams?.hideAdd
                        }
                    ])
                    setCurrentTabKey(key)
                    if (nodeParams && !!nodeParams.isRecord) addFuzzerList(nodeParams?.time || time)
                }
            }
        }
    )
    /** @name 多开页面的额外处理逻辑(针对web-fuzzer页面) */
    const openMultipleMenuPage = useMemoizedFn((route: RouteToPageProps) => {
        if (route.route === YakitRoute.HTTPFuzzer) {
            const time = new Date().getTime().toString()
            openMenuPage(route, {
                time: time,
                node: RouteToPage(YakitRoute.HTTPFuzzer, undefined, {
                    system: system,
                    order: time
                }),
                isRecord: true
            })
        } else openMenuPage(route)
    })
    /** @name 判断页面是否打开，打开则定位该页面，未打开则打开页面 */
    const extraOpenMenuPage = useMemoizedFn((routeInfo: RouteToPageProps) => {
        if (SinglePageRoute.includes(routeInfo.route)) {
            const flag =
                pageCache.filter(
                    (item) => item.route === routeInfo.route && (item.pluginName || "") === (routeInfo.pluginName || "")
                ).length === 0
            if (flag) openMenuPage(routeInfo)
            else
                setCurrentTabKey(
                    routeInfo.route === YakitRoute.Plugin_OP
                        ? routeConvertKey(routeInfo.route, routeInfo.pluginName || "")
                        : routeInfo.route
                )
        } else {
            openMultipleMenuPage(routeInfo)
        }
    })
    const {getSubscribeClose, removeSubscribeClose} = useSubscribeClose()
    // 多开页面的一级页面关闭事件
    const onBeforeRemovePage = useMemoizedFn((data: OnlyPageCache) => {
        switch (data.route) {
            case YakitRoute.AddYakitScript:
            case YakitRoute.HTTPFuzzer:
                const modalProps = getSubscribeClose(data.route)
                onModalSecondaryConfirm(modalProps)
                break

            default:
                removeMenuPage(data)
                break
        }
    })
    /** @name 移除一级页面 */
    const removeMenuPage = useMemoizedFn((data: OnlyPageCache) => {
        const index = pageCache.findIndex((item) => {
            if (data.route === YakitRoute.Plugin_OP) {
                return item.route === data.route && item.menuName === data.menuName
            } else {
                return item.route === data.route
            }
        })
        if (index === -1) return

        let newIndex = 0
        if (index > 0 && getPageCache()[index - 1]) newIndex = index - 1
        if (index === 0 && getPageCache()[index + 1]) newIndex = index + 1
        const {route, pluginId = 0, pluginName = ""} = getPageCache()[newIndex]
        const key = routeConvertKey(route, pluginName)
        if (currentTabKey === routeConvertKey(data.route, data.pluginName)) setCurrentTabKey(key)

        if (index === 0 && getPageCache().length === 1) setCurrentTabKey("" as any)

        setPageCache(
            getPageCache().filter((i) => {
                if (data.route === YakitRoute.Plugin_OP) {
                    return !(i.route === data.route && i.menuName === data.menuName)
                } else {
                    return !(i.route === data.route)
                }
            })
        )
        if (data.route === YakitRoute.AddYakitScript) {
            setCurrentTabKey(YakitRoute.Plugin_Local)
        }
        if (data.route === YakitRoute.HTTPFuzzer) {
            delFuzzerList(1)
            removeSubscribeClose(YakitRoute.HTTPFuzzer)
        }
    })
    // 关闭所有页面(包括一级和二级页面)
    const closeAllCache = useMemoizedFn(() => {
        Modal.confirm({
            title: "确定要关闭所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                delFuzzerList(1)
                setPageCache(getInitPageCache())
                setCurrentTabKey(getInitActiveTabKey())
            }
        })
    })
    // 关闭除选中页面外的所有页面(包括一级和二级页面)
    const closeOtherCache = useMemoizedFn((activeKey: string) => {
        const info = keyToRouteInfo(activeKey)
        if (!info) return
        const {route, pluginName = ""} = info

        Modal.confirm({
            title: "确定要关闭除此之外所有 Tabs？",
            content: "这样将会关闭所有进行中的进程",
            onOk: () => {
                const arr = pageCache.filter((i) => {
                    if (route !== YakitRoute.Plugin_OP) return i.route === route
                    else return i.route === route && i.pluginName === pluginName
                })
                if (!isEnpriTraceAgent()) {
                    arr.unshift({
                        verbose: "首页",
                        menuName: YakitRouteToPageInfo[YakitRoute.NewHome].label,
                        route: YakitRoute.NewHome,
                        singleNode: RouteToPage(YakitRoute.NewHome),
                        multipleNode: []
                    })
                }
                setPageCache(arr)
                if (route === YakitRoute.HTTPFuzzer) delFuzzerList(1)
            }
        })
    })
    /** ---------- 一级页面的逻辑 end ---------- */
    /** ---------- 多开页面的逻辑 start ---------- */
    /** 更改多开页面的当前页面key值 */
    const setMultipleCurrentKey = useMemoizedFn((key: string, data: OnlyPageCache) => {
        const arr = pageCache.map((item) => {
            if (item.route === data.route && item.menuName === data.menuName) {
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
    })
    /** 移除多开页面合集里的指定页面 */
    const removeMultipleNodePage = useMemoizedFn((key: string, data: OnlyPageCache) => {
        const removeArr: multipleNodeInfo[] =
            pageCache.filter((item) => item.route === data.route && item.menuName === data.menuName)[0]?.multipleNode ||
            []
        if (removeArr.length === 0) return

        const currentIndex = removeArr.findIndex((item) => item.id === key)
        if (currentIndex === -1) return
        const currentTime = removeArr[currentIndex]?.time
        // 多开页面合集只有一个页面，删除一级页面
        if (currentIndex > -1 && removeArr.length === 1) {
            removeMenuPage(data)
            return
        }
        // 设置相邻页面为当前页面
        let active = ""
        if (currentIndex > 0 && !!removeArr[currentIndex - 1]) active = removeArr[currentIndex - 1].id
        if (currentIndex === 0 && !!removeArr[currentIndex + 1]) active = removeArr[currentIndex + 1].id

        if (active) {
            const arr = pageCache.map((item) => {
                if (item.route === data.route && item.menuName === data.menuName) {
                    item.multipleNode = [...removeArr.filter((item) => item.id !== key)]
                    item.multipleCurrentKey = item.multipleCurrentKey === key ? active : item.multipleCurrentKey
                    return item
                }
                return item
            })
            setPageCache([...arr])
            if (data.route === YakitRoute.HTTPFuzzer) delFuzzerList(2, currentTime)
        }
    })
    /** 移除多开页面合集里除指定外的所有页面 */
    const removeOtherMultipleNodePage = useMemoizedFn((key: string, data: OnlyPageCache) => {
        const removeArr: multipleNodeInfo[] =
            pageCache.filter((item) => item.route === data.route && item.menuName === data.menuName)[0]?.multipleNode ||
            []
        if (removeArr.length === 0) return
        const nodes = removeArr.filter((item) => item.id === key)
        const time = nodes[0].time

        const arr = pageCache.map((item) => {
            if (item.route === data.route && item.menuName === data.menuName) {
                item.multipleNode = [...nodes]
                item.multipleCurrentKey = key
                return item
            }
            return item
        })
        setPageCache([...arr])
        if (data.route === YakitRoute.HTTPFuzzer) delFuzzerList(3, time)
    })
    const updateCacheVerboseMultipleNodePage = useMemoizedFn((key: string, data: OnlyPageCache, verbose: string) => {
        const index = getPageCache().findIndex((item) => item.route === data.route && item.menuName === data.menuName)
        if (index < 0) return
        const indexNode = pageCache[index].multipleNode.findIndex((ele) => ele.id === key)
        if (indexNode < 0) return
        pageCache[index].multipleNode[indexNode].verbose = verbose
        // 更新web-fuzzer页面缓存数据
        if (data.route === YakitRoute.HTTPFuzzer) {
            const currentTimeKey: string = pageCache[index].multipleNode[indexNode].time
            const newFuzzerItem = {...fuzzerList.current.get(currentTimeKey)}
            updateFuzzerList(currentTimeKey, {...newFuzzerItem, time: currentTimeKey, verbose})
        }
        setPageCache([...pageCache])
    })
    /** ---------- 多开页面的逻辑 end ---------- */
    /** ---------- web-fuzzer 缓存逻辑 start ---------- */
    // web-fuzzer多开页面缓存数据
    const fuzzerList = useRef<Map<string, fuzzerInfoProp>>(new Map<string, fuzzerInfoProp>())
    // 定时向数据库保存web-fuzzer缓存数据
    const saveFuzzerList = debounce(() => {
        const historys: fuzzerInfoProp[] = []
        fuzzerList.current.forEach((value) => historys.push(value))
        const filters = historys.filter(
            (item) => (item.request || "").length < 1000000 && (item.request || "").length > 0
        )
        setRemoteProjectValue(FuzzerCache, JSON.stringify(filters))
    }, 500)
    // 获取数据库中缓存的web-fuzzer页面信息(qs: 有可以优化的点)
    const fetchFuzzerList = useMemoizedFn(() => {
        setLoading(true)
        fuzzerList.current.clear()

        getRemoteProjectValue(FuzzerCache)
            .then((res: any) => {
                const cache = JSON.parse(res || "[]")
                // 这里看看需要对其数量进行限制不
                for (let item of cache) {
                    const time = new Date().getTime().toString()
                    fuzzerList.current.set(time, {...item, time: time})
                    openMenuPage(
                        {route: YakitRoute.HTTPFuzzer},
                        {
                            time: time,
                            verbose: item.verbose, // webFuzzer 保存的修改后的菜单二级tab名字
                            node: RouteToPage(YakitRoute.HTTPFuzzer, undefined, {
                                isHttps: item.isHttps || false,
                                request: item.request || "",
                                fuzzerParams: item,
                                system: system,
                                order: time
                            })
                        }
                    )
                }
            })
            .catch((e) => {
                console.info(e)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    // 新增缓存数据
    const addFuzzerList = (key: string, request?: string, isHttps?: boolean, isGmTLS?: boolean, verbose?: string) => {
        fuzzerList.current.set(key, {request, isHttps, time: key, verbose})
    }
    /**
     * 删除web-fuzzer页面缓存数据
     * @description 1-删除全部缓存数据
     * @description 2-删除指定缓存数据
     * @description 3-删除除指定外的所有缓存数据
     */
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
    // 更新缓存数据内容
    const updateFuzzerList = (key: string, param: fuzzerInfoProp) => {
        fuzzerList.current.set(key, param)
        saveFuzzerList()
    }
    useEffect(() => {
        // web-fuzzer页面更新缓存数据
        ipcRenderer.on("fetch-fuzzer-setting-data", (e, res: any) => {
            try {
                updateFuzzerList(res.key, {...(fuzzerList.current.get(res.key) || {}), ...JSON.parse(res.param)})
            } catch (error) {
                failed("webFuzzer数据缓存失败：" + error)
            }
        })
        // 触发获取web-fuzzer的缓存
        fetchFuzzerList()

        return () => {
            ipcRenderer.removeAllListeners("fetch-fuzzer-setting-data")
        }
    }, [])
    /** ---------- web-fuzzer 缓存逻辑 end ---------- */

    useEffect(() => {
        if (isEnpriTraceAgent()) {
            // 简易企业版页面控制
            extraOpenMenuPage({route: YakitRoute.SimpleDetect})
            // 简易企业版判断本地插件数-导入弹窗
            const newParams = {
                Type: "yak,mitm,codec,packet-hack,port-scan",
                Keyword: "",
                Pagination: {Limit: 20, Order: "desc", Page: 1, OrderBy: "updated_at"},
                UserId: 0
            }
            ipcRenderer.invoke("QueryYakScript", newParams).then((item: QueryYakScriptsResponse) => {
                if (item.Data.length === 0) {
                    const m = showModal({
                        title: "导入插件",
                        content: <DownloadAllPlugin type='modal' onClose={() => m.destroy()} />
                    })
                    return m
                }
            })
        }

        if (isBreachTrace()) {
            extraOpenMenuPage({route: YakitRoute.DB_ChaosMaker})
        }
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

    // 新增数据对比页面
    useEffect(() => {
        ipcRenderer.on("main-container-add-compare", (e, params) => {
            openMenuPage(
                {route: YakitRoute.DataCompare},
                {node: RouteToPage(YakitRoute.DataCompare, undefined, {system: system})}
            )

            // 区分新建对比页面还是别的页面请求对比的情况
            ipcRenderer.invoke("created-data-compare")
        })
        return () => {
            ipcRenderer.removeAllListeners("main-container-add-compare")
        }
    }, [pageCache])

    // Global Sending Function(全局发送功能|通过发送新增功能页面)
    const addFuzzer = useMemoizedFn((res: any) => {
        const {isHttps, isGmTLS, request, list} = res || {}
        const time = new Date().getTime().toString()
        if (request) {
            openMenuPage(
                {route: YakitRoute.HTTPFuzzer},
                {
                    time: time,
                    node: RouteToPage(YakitRoute.HTTPFuzzer, undefined, {
                        isHttps: isHttps || false,
                        isGmTLS: isGmTLS || false,
                        request: request || "",
                        system: system,
                        order: time,
                        shareContent: res.shareContent
                    })
                }
            )
            addFuzzerList(time, request || "", isHttps || false, isGmTLS || false)
        }
    })

    // websocket fuzzer 和 Fuzzer 类似
    const addWebsocketFuzzer = useMemoizedFn((res: {tls: boolean; request: Uint8Array}) => {
        openMenuPage(
            {route: YakitRoute.WebsocketFuzzer},
            {
                hideAdd: false,
                isRecord: false,
                node: RouteToPage(YakitRoute.WebsocketFuzzer, undefined, {
                    wsRequest: res.request,
                    wsTls: res.tls
                }),
                time: ""
            }
        )
    })
    // 新建插件
    const addYakScript = useMemoizedFn((res: any) => {
        openMenuPage({route: YakitRoute.AddYakitScript})
    })
    // 插件修改历史详情
    const addYakPluginJournalDetails = useMemoizedFn((res: any) => {
        const time = new Date().getTime().toString()
        openMenuPage(
            {route: YakitRoute.YakitPluginJournalDetails},
            {
                time: time,
                node: RouteToPage(YakitRoute.YakitPluginJournalDetails, undefined, {
                    YakScriptJournalDetailsId: res.YakScriptJournalDetailsId
                }),
                hideAdd: true
            }
        )
    })
    // 插件回收站
    const addOnlinePluginRecycleBin = useMemoizedFn((res: any) => {
        openMenuPage({route: YakitRoute.OnlinePluginRecycleBin})
    })
    const addFacadeServer = useMemoizedFn((res: any) => {
        const {facadeParams, classParam, classType} = res || {}
        if (facadeParams && classParam && classType) {
            openMenuPage(
                {route: YakitRoute.ReverseServer_New},
                {
                    node: RouteToPage(YakitRoute.ReverseServer_New, undefined, {
                        facadeServerParams: facadeParams,
                        classGeneraterParams: classParam,
                        classType: classType
                    })
                }
            )
        }
    })
    const addScanPort = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            openMenuPage(
                {route: YakitRoute.Mod_ScanPort},
                {
                    node: RouteToPage(YakitRoute.Mod_ScanPort, undefined, {scanportParams: URL})
                }
            )
        }
    })
    const addBrute = useMemoizedFn((res: any) => {
        const {URL = ""} = res || {}
        if (URL) {
            openMenuPage(
                {route: YakitRoute.Mod_Brute},
                {
                    node: RouteToPage(YakitRoute.Mod_Brute, undefined, {bruteParams: URL})
                }
            )
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
            getLocalValue(CustomBugList)
                .then((res: any) => {
                    setBugList(res ? JSON.parse(res) : [])
                    setBugTestShow(true)
                })
                .catch(() => {})
        }
        if (type === 2) {
            const filter = pageCache.filter((item) => item.route === YakitRoute.PoC)
            if (filter.length === 0) {
                openMenuPage({route: YakitRoute.PoC})
                setTimeout(() => {
                    ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                    setBugTestValue([])
                    setBugUrl("")
                }, 300)
            } else {
                ipcRenderer.invoke("send-to-bug-test", {type: bugTestValue, data: bugUrl})
                setCurrentTabKey(YakitRoute.PoC)
                setBugTestValue([])
                setBugUrl("")
            }
        }
    })
    const addYakRunning = useMemoizedFn((res: any) => {
        const {name = "", code = ""} = res || {}
        const filter = pageCache.filter((item) => item.route === YakitRoute.YakScript)

        if (!name || !code) return false

        if ((filter || []).length === 0) {
            openMenuPage({route: YakitRoute.YakScript})
            setTimeout(() => {
                ipcRenderer.invoke("send-to-yak-running", {name, code})
            }, 300)
        } else {
            ipcRenderer.invoke("send-to-yak-running", {name, code})
            setCurrentTabKey(YakitRoute.YakScript)
        }
    })

    const addBatchExecRecover = useMemoizedFn((task: UnfinishedBatchTask) => {
        openMenuPage(
            {route: YakitRoute.BatchExecutorRecover},
            {
                hideAdd: true,
                node: RouteToPage(YakitRoute.BatchExecutorRecover, undefined, {
                    recoverUid: task.Uid,
                    recoverBaseProgress: task.Percent
                })
            }
        )
    })

    const addSimpleBatchExecRecover = useMemoizedFn((task: UnfinishedSimpleDetectBatchTask) => {
        openMenuPage(
            {route: YakitRoute.SimpleDetect},
            {
                hideAdd: true,
                node: RouteToPage(YakitRoute.SimpleDetect, undefined, {
                    recoverUid: task.Uid,
                    recoverBaseProgress: task.Percent,
                    recoverOnlineGroup: task.YakScriptOnlineGroup,
                    recoverTaskName: task.TaskName
                })
            }
        )
    })

    const addPacketScan = useMemoizedFn(
        (httpFlows: number[], https: boolean, request?: Uint8Array, keyword?: string) => {
            openMenuPage(
                {route: YakitRoute.PacketScanPage},
                {
                    hideAdd: true,
                    node: RouteToPage(YakitRoute.PacketScanPage, undefined, {
                        packetScan_FlowIds: httpFlows,
                        packetScan_Https: https,
                        packetScan_HttpRequest: request,
                        packetScan_Keyword: keyword
                    })
                }
            )
        }
    )
    const {screenRecorderInfo} = useScreenRecorder()
    useUpdateEffect(() => {
        if (!screenRecorderInfo.isRecording) {
            addToTab("**screen-recorder")
        }
    }, [screenRecorderInfo.isRecording])

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
            if (type === "simple-batch-exec-recover") addSimpleBatchExecRecover(data as UnfinishedSimpleDetectBatchTask)
            if (type === "exec-packet-scan")
                addPacketScan(data["httpFlows"], data["https"], data["httpRequest"], data["keyword"])
            if (type === "add-yakit-script") addYakScript(data)
            if (type === "yakit-plugin-journal-details") addYakPluginJournalDetails(data)
            if (type === "online-plugin-recycle-bin") addOnlinePluginRecycleBin(data)
            if (type === "facade-server") addFacadeServer(data)
            if (type === "add-yak-running") addYakRunning(data)
            if (type === "**screen-recorder") openMenuPage({route: YakitRoute.ScreenRecorderPage})
            if (type === "**chaos-maker") openMenuPage({route: YakitRoute.DB_ChaosMaker})
            if (type === "**matcher-extractor") openMenuPage({route: YakitRoute.Beta_MatcherExtractorPage})
            if (type === "**debug-plugin") openMenuPage({route: YakitRoute.Beta_DebugPlugin})
            if (type === "**debug-monaco-editor") openMenuPage({route: YakitRoute.Beta_DebugMonacoEditor})
            if (type === "**vulinbox-manager") openMenuPage({route: YakitRoute.Beta_VulinboxManager})
            if (type === "open-plugin-store") {
                const flag = getPageCache().filter((item) => item.route === YakitRoute.Plugin_Store).length
                if (flag === 0) {
                    openMenuPage({route: YakitRoute.Plugin_Store})
                } else {
                    // 该方法在能保证route不是YakitRoute.Plugin_OP时,menuName可以传空字符
                    removeMenuPage({route: YakitRoute.AddYakitScript, menuName: ""})
                    setTimeout(() => ipcRenderer.invoke("send-local-script-list"), 50)
                }
            }
            if (type === YakitRoute.HTTPHacker) {
                openMenuPage({route: YakitRoute.HTTPHacker})
            }
            if (type === YakitRoute.DB_Risk) {
                openMenuPage({route: YakitRoute.DB_Risk})
            }
            if (type === YakitRoute.DNSLog) {
                openMenuPage({route: YakitRoute.DNSLog})
            }
            console.info("send to tab: ", type)
        })

        return () => {
            ipcRenderer.removeAllListeners("fetch-send-to-tab")
        }
    }, [])
    // 没看过逻辑
    useEffect(() => {
        ipcRenderer.on("fetch-close-tab", (e, res: any) => {
            const {router, name} = res
            removeMenuPage({route: router, menuName: name || ""})
        })
        ipcRenderer.on("fetch-close-all-tab", () => {
            delFuzzerList(1)
            setPageCache(getInitPageCache())
            setCurrentTabKey(getInitActiveTabKey())
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-close-tab")
            ipcRenderer.removeAllListeners("fetch-close-all-tab")
        }
    }, [])

    /** 编辑菜单功能相关逻辑 */
    const [isShowCustomizeMenu, setIsShowCustomizeMenu] = useState<boolean>(false) //是否显示自定义菜单页面
    useEffect(() => {
        ipcRenderer.on("fetch-open-customize-menu", (e, type: YakitRoute) => {
            setIsShowCustomizeMenu(true)
        })
        return () => {
            ipcRenderer.removeAllListeners("fetch-open-customize-menu")
        }
    }, [])

    /**
     * @name 全局功能快捷键
     */
    const documentKeyDown = useMemoizedFn((e: any) => {
        // ctrl/command + w 关闭当前页面
        if (e.code === "KeyW" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (pageCache.length === 0 || currentTabKey === YakitRoute.NewHome) return

            setLoading(true)
            // 有点问题
            const data = keyToRouteInfo(currentTabKey)
            if (data) {
                const info: OnlyPageCache = {
                    route: data.route,
                    menuName:
                        data.route === YakitRoute.Plugin_OP
                            ? data.pluginName || ""
                            : YakitRouteToPageInfo[data.route]?.label || "",
                    pluginId: data.pluginId,
                    pluginName: data.pluginName
                }
                removeMenuPage(info)
            }
            setTimeout(() => setLoading(false), 300)
            return
        }
    })
    useEffect(() => {
        document.onkeydown = documentKeyDown
    }, [])

    /**
     * @name 远程通信打开一个页面(新逻辑)
     */
    useEffect(() => {
        ipcRenderer.on("open-route-page-callback", (e, info: RouteToPageProps) => {
            extraOpenMenuPage(info)
        })
        return () => {
            ipcRenderer.removeAllListeners("open-route-page-callback")
        }
    }, [])

    /** yak-chat 相关逻辑 */
    const [chatShow, setChatShow] = useState<boolean>(false)
    useEffect(() => {
        if (!userInfo.isLogin) setChatShow(false)
    }, [userInfo])
    const onChatCS = useMemoizedFn(() => {
        if (!userInfo.isLogin) {
            yakitNotify("warning", "请登录后使用")
            return
        }
        setChatShow(true)
    })

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

    return (
        <>
            <Layout className='yakit-main-layout' style={controlShow ? {display: "none"} : {}}>
                <AutoSpin spinning={loading}>
                    {isShowCustomizeMenu && (
                        <CustomizeMenu visible={isShowCustomizeMenu} onClose={() => setIsShowCustomizeMenu(false)} />
                    )}
                    <div
                        style={{
                            display: isShowCustomizeMenu ? "none" : "flex",
                            flexDirection: "column",
                            height: "100%"
                        }}
                    >
                        {isCommunityEdition() ? (
                            <PublicMenu
                                onMenuSelect={extraOpenMenuPage}
                                setRouteToLabel={(val) => {
                                    val.forEach((value, key) => {
                                        routeKeyToLabel.current.set(key, value)
                                    })
                                }}
                            />
                        ) : (
                            <HeardMenu
                                onRouteMenuSelect={extraOpenMenuPage}
                                setRouteToLabel={(val) => {
                                    val.forEach((value, key) => {
                                        routeKeyToLabel.current.set(key, value)
                                    })
                                }}
                            />
                        )}
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
                                                    const key = routeConvertKey(i.route, i.pluginName)
                                                    const onlyPage: OnlyPageCache = {
                                                        route: i.route,
                                                        menuName: i.menuName,
                                                        pluginId: i.pluginId,
                                                        pluginName: i.pluginName
                                                    }

                                                    return (
                                                        <Tabs.TabPane
                                                            forceRender={true}
                                                            key={key}
                                                            tab={i.verbose}
                                                            closeIcon={
                                                                <Space>
                                                                    {i.verbose !== "首页" && (
                                                                        <CloseOutlined
                                                                            className='main-container-cion'
                                                                            onClick={() => onBeforeRemovePage(onlyPage)}
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
                                                                        !i.singleNode ||
                                                                        NoPaddingRoute.includes(i.route)
                                                                            ? 0
                                                                            : "8px 16px 13px 16px"
                                                                }}
                                                                className={`main-operator-first-menu-page-content-${i.route}`}
                                                            >
                                                                {i.singleNode ? (
                                                                    i.singleNode
                                                                ) : (
                                                                    <MainTabs
                                                                        currentTabKey={currentTabKey}
                                                                        tabType={i.route}
                                                                        pages={i.multipleNode}
                                                                        currentKey={i.multipleCurrentKey || ""}
                                                                        isShowAdd={!i.hideAdd}
                                                                        setCurrentKey={(key) => {
                                                                            setMultipleCurrentKey(key, onlyPage)
                                                                        }}
                                                                        removePage={(key) => {
                                                                            removeMultipleNodePage(key, onlyPage)
                                                                        }}
                                                                        removeOtherPage={(key) => {
                                                                            removeOtherMultipleNodePage(key, onlyPage)
                                                                        }}
                                                                        onAddTab={() =>
                                                                            openMultipleMenuPage({
                                                                                route: i.route,
                                                                                pluginId: i.pluginId,
                                                                                pluginName: i.pluginName
                                                                            })
                                                                        }
                                                                        updateCacheVerbose={(id, value) =>
                                                                            updateCacheVerboseMultipleNodePage(
                                                                                id,
                                                                                onlyPage,
                                                                                value
                                                                            )
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

                                {isCommunityEdition() && <YakChatCS visible={chatShow} setVisible={setChatShow} />}
                            </Layout>
                        </Content>
                    </div>
                </AutoSpin>
                <YakitModal
                    visible={bugTestShow}
                    onCancel={() => setBugTestShow(false)}
                    onOk={() => {
                        if ((bugTestValue || []).length === 0) return yakitNotify("error", "请选择类型后再次提交")
                        addBugTest(2)
                        setBugTestShow(false)
                    }}
                    type='white'
                    title={<></>}
                    closable={true}
                >
                    <div style={{padding: "0 24px"}}>
                        <Form.Item label='专项漏洞类型'>
                            <YakitSelect
                                allowClear={true}
                                onChange={(value, option: any) => {
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
                                }}
                                value={(bugTestValue || [])[0]?.key}
                            >
                                {(BugList.concat(bugList) || []).map((item) => (
                                    <YakitSelect.Option key={item.key} value={item.key} record={item}>
                                        {item.title}
                                    </YakitSelect.Option>
                                ))}
                            </YakitSelect>
                        </Form.Item>
                    </div>
                </YakitModal>
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

                {isCommunityEdition() && !chatShow && (
                    <div className='chat-icon-wrapper' onClick={onChatCS}>
                        <img src={yakitCattle} />
                    </div>
                )}
            </Layout>
            {controlShow && <ControlOperation controlName={controlName} />}
            <YakitHintModal
                visible={false}
                title='收到远程连接请求'
                content={
                    <div>
                        用户 <span style={{color: "#F28B44"}}>Alex-null</span>{" "}
                        正在向你发起远程连接请求，是否同意对方连接？
                    </div>
                }
                cancelButtonText='拒绝'
                okButtonText='同意'
                onOk={() => {}}
                onCancel={() => {}}
            />
        </>
    )
})

export default Main

// 多开页面的一级页面关闭的确认弹窗
export const onModalSecondaryConfirm = (props?: YakitSecondaryConfirmProps) => {
    let m = YakitModalConfirm({
        width: 420,
        type: "white",
        onCancelText: "不保存",
        onOkText: "保存",
        icon: <ExclamationCircleOutlined />,
        ...(props || {}),
        onOk: () => {
            if (props?.onOk) {
                props.onOk(m)
            } else {
                m.destroy()
            }
        },
        closeIcon: (
            <div
                onClick={(e) => {
                    e.stopPropagation()
                    m.destroy()
                }}
                className='modal-remove-icon'
            >
                <RemoveIcon />
            </div>
        ),
        content: <div style={{paddingTop: 8}}>{props?.content}</div>
    })
    return m
}
