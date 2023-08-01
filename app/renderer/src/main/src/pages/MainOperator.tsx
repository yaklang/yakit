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
    SingletonPageRoute,
    YakitRoute,
    YakitRouteToPageInfo
} from "@/routes/newRoute"
import {keyToRouteInfo, routeConvertKey} from "./layout/publicMenu/utils"
import {YakChatCS} from "@/components/yakChat/chatCS"
import yakitCattle from "../assets/yakitCattle.png"

import "./main.scss"
import "./GlobalClass.scss"
import {
    MainOperatorContent,
    getInitActiveTabKey,
    getInitPageCache
} from "./layout/mainOperatorContent/MainOperatorContent"
import {MultipleNodeInfo} from "./layout/mainOperatorContent/MainOperatorContentType"

const {ipcRenderer} = window.require("electron")
const {Content} = Layout

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
    // isGmTLS?: boolean
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

const Main: React.FC<MainProp> = React.memo((props) => {
    const [loading, setLoading] = useState(false)

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

    /** @name 路由对应的菜单展示名称 */
    const routeKeyToLabel = useRef<Map<string, string>>(new Map<string, string>())

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

    /** 通知软件打开页面 */
    const openMenu = (info: RouteToPageProps) => {
        ipcRenderer.invoke("open-route-page", info)
    }
    return (
        <>
            <Layout className='yakit-main-layout main-content-tabs yakit-layout-tabs' style={controlShow ? {display: "none"} : {}}>
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
                                onMenuSelect={openMenu}
                                setRouteToLabel={(val) => {
                                    val.forEach((value, key) => {
                                        routeKeyToLabel.current.set(key, value)
                                    })
                                }}
                            />
                        ) : (
                            <HeardMenu
                                onRouteMenuSelect={openMenu}
                                setRouteToLabel={(val) => {
                                    val.forEach((value, key) => {
                                        routeKeyToLabel.current.set(key, value)
                                    })
                                }}
                            />
                        )}
                        <MainOperatorContent routeKeyToLabel={routeKeyToLabel.current} />
                        {/* <Content
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
                            </Layout>
                        </Content> */}
                    </div>
                </AutoSpin>

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
                {isCommunityEdition() && <YakChatCS visible={chatShow} setVisible={setChatShow} />}
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
