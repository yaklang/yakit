import React, {ReactNode, useEffect, useRef, useState} from "react"
import {Avatar, Layout, Modal, Upload} from "antd"
import {CameraOutlined} from "@ant-design/icons"
import {failed, success} from "../utils/notification"
import {
    CompletionTotal,
    MethodSuggestion,
    setYaklangBuildInMethodCompletion,
    setYaklangCompletions
} from "../utils/monacoSpec/yakCompletionSchema"
import {setUpYaklangMonaco} from "../utils/monacoSpec/yakEditor"
import {useGetState, useMemoizedFn, useUpdateEffect} from "ahooks"
import {AutoSpin} from "../components/AutoSpin"
import {addToTab} from "./MainTabs"
import Login from "./Login"
import SetPassword from "./SetPassword"
import {useEeSystemConfig, UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import {refreshToken} from "@/utils/login"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {
    globalUserLogin,
    isCommunityEdition,
    isCommunityIRify,
    isEnpriTrace,
    isEnpriTraceAgent,
    isEnterpriseOrSimpleEdition,
    isIRify,
    isMemfit
} from "@/utils/envfile"
import HeardMenu from "./layout/HeardMenu/HeardMenu"
import {CodeGV} from "@/yakitGV"
import {EnterpriseLoginInfoIcon} from "@/assets/icons"
import CustomizeMenu from "./customizeMenu/CustomizeMenu"
import {ControlOperation} from "@/pages/dynamicControl/DynamicControl"
import {YakitHintModal} from "@/components/yakitUI/YakitHint/YakitHintModal"
import {useScreenRecorder} from "@/store/screenRecorder"
import PublicMenu, {RouteToPageProps} from "./layout/publicMenu/PublicMenu"
import {YakitRoute} from "@/enums/yakitRoute"
import {YakChatCS} from "@/components/yakChat/chatCS"
import yakitCattle from "../assets/yakitCattle.png"
import {MainOperatorContent} from "./layout/mainOperatorContent/MainOperatorContent"
import {MultipleNodeInfo} from "./layout/mainOperatorContent/MainOperatorContentType"
import {WaterMark} from "@ant-design/pro-layout"
import emiter from "@/utils/eventBus/eventBus"
import {httpDeleteOSSResource} from "@/apiUtils/http"
import {setUpSyntaxFlowMonaco} from "@/utils/monacoSpec/syntaxflowEditor"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {MessageCenterModal} from "@/components/MessageCenter/MessageCenter"
import {LocalGVS} from "@/enums/localGlobal"
import {YakitHint} from "@/components/yakitUI/YakitHint/YakitHint"
import {grpcOpenRenderLogFolder} from "@/utils/logCollection"
import {randomString} from "@/utils/randomUtil"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {onGetRemoteValuesBase} from "@/components/yakitUI/utils"
import {grpcSetGlobalProxyRulesConfig} from "@/apiUtils/grpc"
import {MITMConsts} from "./mitm/MITMConsts"
import {checkProxyVersion} from "@/utils/proxyConfigUtil"

import "./main.scss"
import "./GlobalClass.scss"
import {genDefaultPagination} from "./invoker/schema"
import {apiQuerySSAPrograms} from "./yakRunnerScanHistory/utils"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import { IRifyUpdateProjectManagerModal } from "./YakRunnerProjectManager/YakRunnerProjectManager"
import {parseUrl} from "@/hook/useProxy"

const {ipcRenderer} = window.require("electron")

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
    token: ""
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
        httpDeleteOSSResource({file_name: [imgName]}, true)
            .then(() => {})
            .catch((err) => {
                failed("头像更换失败：" + err)
            })
    })

    // 修改头像
    const setAvatar = useMemoizedFn(async (file) => {
        await ipcRenderer
            .invoke("http-upload-img-path", {path: file.path, type: "headImg"})
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
    // forceFuzz?: boolean
    // concurrent?: number
    // proxy?: string
    actualHost?: string
    // timeout?: number
    request?: string
    /**
     * @param 二级菜单修改了名称后保存的字段，目前仅仅webFuzzer二级支持
     */
    verbose?: string
    /**@param 组信息  */
    groupChildren?: MultipleNodeInfo[]
    id?: string
}
/**菜单展开收起默认值 */
const getDefaultExpand = () => {
    if (isMemfit()) {
        return false
    }
    return true
}
const Main: React.FC<MainProp> = React.memo((props) => {
    const [showRenderCrash, setShowRenderCrash] = useState(false)
    const [showProxyModal, setShowProxyModal] = useState(false)
    const [ProxyModalLoading, setProxyModalLoading] = useState(false)
    const ProxyHistoryName = MITMConsts.MITMDefaultDownstreamProxyHistory
    const ProxyWebFuzzerName = "web_fuzzer_proxy_list"
    const {t, i18n} = useI18nNamespaces(["mitm"])

    const remoteProxyHistory = useMemoizedFn(() => {
        const cacheData = {
            options: [],
            defaultValue: ""
        }
        // 清空两个来源的缓存数据
        Promise.all([
            setRemoteValue(ProxyHistoryName, JSON.stringify(cacheData)),
            setRemoteValue(ProxyWebFuzzerName, JSON.stringify(cacheData))
        ]).then(() => setShowProxyModal(false))
    })

    const checkAndShowDataMigration = useMemoizedFn(async () => {
        try {
            const {options: options1} = await onGetRemoteValuesBase(ProxyHistoryName)
            const {options: options2} = await onGetRemoteValuesBase(ProxyWebFuzzerName)

            // 如果任意一个有数据，就显示迁移弹窗
            if (options1?.length || options2?.length) {
                setShowProxyModal(true)
            }
        } catch (error) {
            console.error(error)
        }
    })

    // 首页加载时初始化
    useEffect(() => {
        checkAndShowDataMigration()
    }, [])

    useEffect(() => {
        getLocalValue(LocalGVS.RenderCrashScreen)
            .then((value) => {
                setShowRenderCrash(!!value)
            })
            .catch(() => {})
    }, [])
    const handleShowRenderCrashCallback = useMemoizedFn((result: boolean) => {
        if (result) {
            grpcOpenRenderLogFolder()
        }
        setLocalValue(LocalGVS.RenderCrashScreen, false)
        setShowRenderCrash(false)
    })

    const [loading, setLoading] = useState(false)

    // 修改密码弹框
    const [passwordShow, setPasswordShow] = useState<boolean>(false)

    // 登录框状态
    const [loginshow, setLoginShow, getLoginShow] = useGetState<boolean>(false)

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
    /** ---------- 登录状态变化的逻辑 start ---------- */
    const {userInfo, setStoreUserInfo} = useStore()

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
        if (isEnterpriseOrSimpleEdition()) {
            ipcRenderer.send("company-refresh-in")
        }
    }, [])

    /** ---------- 登录状态变化的逻辑 end ---------- */
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
                setUpYaklangMonaco()
                setUpSyntaxFlowMonaco()
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

    /** @name 路由对应的菜单展示名称 */
    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())

    const {screenRecorderInfo} = useScreenRecorder()
    useUpdateEffect(() => {
        if (!screenRecorderInfo.isRecording) {
            addToTab("**screen-recorder")
        }
    }, [screenRecorderInfo.isRecording])

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

    /** yak-chat 相关逻辑 */
    const [chatShow, setChatShow] = useState<boolean>(false)

    const onChatCS = useMemoizedFn(() => {
        setMessageCenterShow(false)
        setChatShow(true)
    })

    /** 消息中心 相关逻辑 */
    const [messageCenterShow, setMessageCenterShow] = useState<boolean>(false)
    const openAllMessageNotificationFun = useMemoizedFn(() => {
        setChatShow(false)
        setMessageCenterShow(true)
    })
    useEffect(() => {
        emiter.on("openAllMessageNotification", openAllMessageNotificationFun)
        return () => {
            emiter.off("openAllMessageNotification", openAllMessageNotificationFun)
        }
    }, [])

    /** 通知软件打开页面 */
    const openMenu = (info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    }

    const {eeSystemConfig} = useEeSystemConfig()

    const getEnpriTraceWaterMark = (defaltWater: string) => {
        let openWatermark = false
        let eeWatermarkStr = defaltWater
        eeSystemConfig.forEach((item) => {
            if (item.configName === "openWatermark") {
                openWatermark = item.isOpen
                if (item.content) {
                    eeWatermarkStr = item.content
                }
            }
        })
        return openWatermark ? eeWatermarkStr : " "
    }
    const waterMarkStr = () => {
        // Yakit社区版无水印
        if (isCommunityEdition() && !isCommunityIRify()) {
            return ""
        }
        // IRify社区版有水印
        else if (isCommunityIRify()) {
            return "IRify技术浏览版仅供技术交流使用"
        } else if (userInfo.isLogin) {
            if (isEnpriTrace()) {
                return getEnpriTraceWaterMark(userInfo.companyName || " ")
            }
            return userInfo.companyName || ""
        } else if (isEnpriTrace()) {
            return getEnpriTraceWaterMark(isIRify() ? "IRify技术浏览版仅供技术交流使用" : "EnpriTrace-试用版")
        } else if (isEnpriTraceAgent()) {
            return "EnpriTraceAgent-试用版"
        }
        return ""
    }

    const [defaultExpand, setDefaultExpand] = useState<boolean>(getDefaultExpand())

    useEffect(() => {
        /** Memfit版本没有展开收起*/
        if (isMemfit()) return
        getRemoteValue(CodeGV.MenuExpand).then((result: string) => {
            if (!result) setDefaultExpand(true)
            try {
                const expandResult: boolean = JSON.parse(result)
                setDefaultExpand(expandResult)
            } catch (e) {
                setDefaultExpand(true)
            }
        })
    }, [])

    // // 拖动chartCS
    const chartCSDragAreaRef = useRef<any>(null)
    // const chartCSDragItemRef = useRef<any>(null)
    // const [chartCSDragAreaHeight, setChartCSDragAreaHeight] = useState<number>(0)
    // const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    //     entries.forEach((entry) => {
    //         const h = entry.target.getBoundingClientRect().height
    //         setChartCSDragAreaHeight(h)
    //     })
    // })
    // // 从底部缩短软件高度时 拖拽元素始终保持在边界处可见
    // useUpdateEffect(() => {
    //     if (chartCSDragItemRef.current) {
    //         const top = parseInt(getComputedStyle(chartCSDragItemRef.current).getPropertyValue("top"))
    //         const flag = top >= chartCSDragAreaHeight - 43 - 10 // 判读拖拽元素是否离最底部还有10px的距离
    //         const currentTop = flag ? chartCSDragAreaHeight - 43 - 10 : top
    //         chartCSDragItemRef.current.style.top = currentTop + "px"
    //     }
    // }, [chartCSDragAreaHeight, chartCSDragItemRef])

    // useEffect(() => {
    //     if (chartCSDragAreaRef.current && chartCSDragItemRef.current) {
    //         const chartCSDragItemDom = chartCSDragItemRef.current
    //         const dragAreaDom = chartCSDragAreaRef.current

    //         resizeObserver.observe(dragAreaDom)
    //         dragAreaDom.addEventListener("dragover", function (e: {preventDefault: () => void}) {
    //             e.preventDefault()
    //         })
    //         dragAreaDom.addEventListener(
    //             "drop",
    //             function (e: {
    //                 dataTransfer: any
    //                 preventDefault: () => void
    //                 target: {getBoundingClientRect: () => any}
    //                 clientY: number
    //             }) {
    //                 e.preventDefault()
    //                 if (e.dataTransfer.getData("dragItem") === "chartCSDragItem") {
    //                     const rect = dragAreaDom.getBoundingClientRect()
    //                     const y = e.clientY - rect.top
    //                     const currentTop = y >= rect.height - 43 - 10 ? rect.height - 43 - 10 : y
    //                     chartCSDragItemDom.style.top = currentTop <= 0 ? 0 : currentTop + "px"
    //                 }
    //             }
    //         )
    //         chartCSDragItemDom.addEventListener("dragstart", function (e) {
    //             e.dataTransfer.setData("dragItem", "chartCSDragItem")
    //         })
    //     }
    // }, [chartCSDragItemRef, chartCSDragAreaRef])

    /** -------------------- 更新前瞻 Start -------------------- */
    // useEffect(() => {
    //     if (isCommunityEdition()) {
    //         ipcRenderer.invoke("fetch-system-name").then((type: YakitSystem) => {
    //             if (type === "Windows_NT") {
    //                 getLocalValue(LocalGV.UpdateForwardAnnouncement).then((val: string) => {
    //                     if (val !== LocalGV.JudgeUpdateForwardAnnouncement) setUpdateShow(true)
    //                 })
    //             }
    //         })
    //     }
    // }, [])
    // const [updateShow, setUpdateShow] = useState<boolean>(false)
    // const onUpdateCancenl = useMemoizedFn(() => {
    //     if (updateShow) setUpdateShow(false)
    // })
    // const onUpdateIgnore = useMemoizedFn(() => {
    //     setLocalValue(LocalGV.UpdateForwardAnnouncement, LocalGV.JudgeUpdateForwardAnnouncement)
    //     onUpdateCancenl()
    // })
    /** -------------------- 更新前瞻 End -------------------- */

    /** ---------- IRify start ---------- */
    const [isAllowIRifyUpdate, setIsAllowIRifyUpdate] = useState<boolean>(false)
    const [isShowIRifyHint, setIsShowIRifyHint] = useState<boolean>(false)
    useEffect(() => {
        // 检测是IRify中是否存在老数据，存在老数据则同步
        if (isIRify()) {
            apiQuerySSAPrograms({
                Filter: {
                    ProjectIds: [0]
                },
                Pagination: {...genDefaultPagination()}
            }).then((res) => {
                if (res.Data && res.Data.length > 0) {
                    // 老数据同步
                    setIsShowIRifyHint(true)
                }
            })
        }
    }, [])
    /** ---------- IRify end ---------- */
    return (
        <>
            <WaterMark
                content={waterMarkStr()}
                style={controlShow ? {display: "none"} : {overflow: "hidden", height: "100%"}}
            >
                <Layout
                    className='yakit-main-layout main-content-tabs yakit-layout-tabs'
                    style={controlShow ? {display: "none"} : {}}
                    ref={chartCSDragAreaRef}
                >
                    <AutoSpin spinning={loading}>
                        {isShowCustomizeMenu && (
                            <CustomizeMenu
                                visible={isShowCustomizeMenu}
                                onClose={() => setIsShowCustomizeMenu(false)}
                            />
                        )}

                        <div
                            style={{
                                display: isShowCustomizeMenu ? "none" : "flex",
                                flexDirection: "column",
                                height: "100%"
                            }}
                        >
                            {isCommunityEdition() ? (
                                <>
                                    <PublicMenu
                                        defaultExpand={defaultExpand}
                                        onMenuSelect={openMenu}
                                        setRouteToLabel={(val) => {
                                            val.forEach((value, key) => {
                                                routeKeyToLabel.current.set(key, value)
                                            })
                                        }}
                                    />
                                </>
                            ) : (
                                <HeardMenu
                                    defaultExpand={defaultExpand}
                                    onRouteMenuSelect={openMenu}
                                    setRouteToLabel={(val) => {
                                        val.forEach((value, key) => {
                                            routeKeyToLabel.current.set(key, value)
                                        })
                                    }}
                                />
                            )}
                            <MainOperatorContent routeKeyToLabel={routeKeyToLabel.current} />
                        </div>
                    </AutoSpin>

                    {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
                    <YakitModal
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
                    </YakitModal>
                    {(isCommunityEdition() || isEnpriTrace()) && (
                        <YakChatCS visible={chatShow} setVisible={setChatShow} />
                    )}
                    {/* {(isCommunityEdition() || isEnpriTrace()) && !chatShow && (
                        <div className='chat-icon-wrapper' onClick={onChatCS} draggable={true} ref={chartCSDragItemRef}>
                            <img src={yakitCattle} />
                        </div>
                    )} */}

                    {messageCenterShow && (
                        <MessageCenterModal visible={messageCenterShow} setVisible={setMessageCenterShow} />
                    )}

                    <YakitHint
                        getContainer={chartCSDragAreaRef.current || undefined}
                        visible={showRenderCrash}
                        title='渲染端崩溃提示'
                        content='检测到渲染端有崩溃情况，点击查看日志即可查看崩溃日志，忽略后可在系统设置中进行查看'
                        okButtonText='查看日志'
                        onOk={() => handleShowRenderCrashCallback(true)}
                        cancelButtonText='忽略'
                        onCancel={() => handleShowRenderCrashCallback(false)}
                    />
                </Layout>
            </WaterMark>
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

            {/* irify-start */}
            <YakitHint
                visible={isShowIRifyHint}
                title='迁移数据'
                content='由于IRify功能进行重构，为不影响使用，需要点击确定将旧数据进行迁移，迁移数据不会造成任何数据丢失。'
                footer={
                    <div style={{marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end"}}>
                        <YakitButton size='max' type='outline2' onClick={() => setIsShowIRifyHint(false)}>
                            取消
                        </YakitButton>
                        <YakitButton size='max' onClick={() => {
                            setIsShowIRifyHint(false)
                            setIsAllowIRifyUpdate(true)}}>
                            确定
                        </YakitButton>
                    </div>
                }
            />
            <IRifyUpdateProjectManagerModal visible={isAllowIRifyUpdate} onClose={() => setIsAllowIRifyUpdate(false)} />
            {/* irify-end */}

            {/* <UpdateForward
                visible={updateShow}
                onCancel={onUpdateCancenl}
                onOk={onUpdateCancenl}
                onIgnore={onUpdateIgnore}
            /> */}

            <YakitHintModal
                visible={showProxyModal}
                title={t("ProxyConfig.data_migration")}
                content={t("ProxyConfig.migration_title")}
                cancelButtonText={t("ProxyConfig.not_migration")}
                okButtonText={t("ProxyConfig.migration")}
                okButtonProps={{
                    loading: ProxyModalLoading
                }}
                onOk={async () => {
                    try {
                        const versionValid = await checkProxyVersion()
                        if (!versionValid) {
                            setShowProxyModal(false)
                            return
                        }
                        const {options: options1} = await onGetRemoteValuesBase(ProxyHistoryName)
                        const {options: options2} = await onGetRemoteValuesBase(ProxyWebFuzzerName)

                        const allOptions = [...(options1 || []), ...(options2 || [])]

                        const uniqueOptions = Array.from(new Map(allOptions.map((item) => [item.value, item])).values())

                        if (!uniqueOptions?.length) {
                            setShowProxyModal(false)
                            return
                        }
                        setProxyModalLoading(true)
                        const generateEndpointId = () => `ep-${randomString(8)}`
                        const config = {
                            Routes: [],
                            Endpoints: uniqueOptions.map(({value}) => {
                                const {Url, UserName, Password} = parseUrl(value)
                                return {
                                    Id: generateEndpointId(),
                                    Name: Url,
                                    Url,
                                    UserName,
                                    Password
                                }
                            })
                        }
                        grpcSetGlobalProxyRulesConfig(config)
                            .then(() => remoteProxyHistory())
                            .finally(() => setProxyModalLoading(false))
                    } catch (error) {
                        console.error("error:", error)
                        setProxyModalLoading(false)
                    }
                }}
                onCancel={() => remoteProxyHistory()} //不迁移则丢弃数据
            />
        </>
    )
})

export default Main
