import React, {ReactNode, memo, useEffect, useRef, useState} from "react"
import {Alert, Avatar, Button, Layout, Modal, Space, Upload} from "antd"
import {CameraOutlined} from "@ant-design/icons"
import {failed, info, success, yakitNotify} from "../utils/notification"
import {showModal} from "../utils/showModal"
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
import {UserInfoProps, useStore, yakitDynamicStatus} from "@/store"
import {SimpleQueryYakScriptSchema} from "./invoker/batch/QueryYakScriptParam"
import {refreshToken} from "@/utils/login"
import {getLocalValue, getRemoteValue, setLocalValue, setRemoteValue} from "@/utils/kv"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {
    globalUserLogin,
    isCommunityEdition,
    isEnpriTrace,
    isEnpriTraceAgent,
    shouldVerifyEnpriTraceLogin
} from "@/utils/envfile"
import HeardMenu from "./layout/HeardMenu/HeardMenu"
import {CodeGV, LocalGV, RemoteGV} from "@/yakitGV"
import {EnterpriseLoginInfoIcon} from "@/assets/icons"
import {BaseConsole} from "../components/baseConsole/BaseConsole"
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
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import "./main.scss"
import "./GlobalClass.scss"
import {YakitSystem} from "@/yakitGVDefine"

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
    token: "",
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
        setChatShow(true)
    })

    /** 通知软件打开页面 */
    const openMenu = (info: RouteToPageProps) => {
        emiter.emit("menuOpenPage", JSON.stringify(info))
    }

    const waterMarkStr = (): string => {
        // 社区版无水印
        if (isCommunityEdition()) {
            return ""
        } else if (userInfo.isLogin) {
            return userInfo.companyName || ""
        } else if (isEnpriTrace()) {
            return "EnpriTrace-试用版"
        } else if (isEnpriTraceAgent()) {
            return "EnpriTraceAgent-试用版"
        }
        return ""
    }

    const [defaultExpand, setDefaultExpand] = useState<boolean>(true)
    useEffect(() => {
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

    // 拖动chartCS
    const chartCSDragAreaRef = useRef<any>(null)
    const chartCSDragItemRef = useRef<any>(null)
    const [chartCSDragAreaHeight, setChartCSDragAreaHeight] = useState<number>(0)
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
        entries.forEach((entry) => {
            const h = entry.target.getBoundingClientRect().height
            setChartCSDragAreaHeight(h)
        })
    })
    // 从底部缩短软件高度时 拖拽元素始终保持在边界处可见
    useUpdateEffect(() => {
        if (chartCSDragItemRef.current) {
            const top = parseInt(getComputedStyle(chartCSDragItemRef.current).getPropertyValue("top"))
            const flag = top >= chartCSDragAreaHeight - 43 - 10 // 判读拖拽元素是否离最底部还有10px的距离
            const currentTop = flag ? chartCSDragAreaHeight - 43 - 10 : top
            chartCSDragItemRef.current.style.top = currentTop + "px"
        }
    }, [chartCSDragAreaHeight, chartCSDragItemRef])

    useEffect(() => {
        if (chartCSDragAreaRef.current && chartCSDragItemRef.current) {
            const chartCSDragItemDom = chartCSDragItemRef.current
            const dragAreaDom = chartCSDragAreaRef.current

            resizeObserver.observe(dragAreaDom)
            dragAreaDom.addEventListener("dragover", function (e: {preventDefault: () => void}) {
                e.preventDefault()
            })
            dragAreaDom.addEventListener(
                "drop",
                function (e: {
                    dataTransfer: any
                    preventDefault: () => void
                    target: {getBoundingClientRect: () => any}
                    clientY: number
                }) {
                    e.preventDefault()
                    if (e.dataTransfer.getData("dragItem") === "chartCSDragItem") {
                        const rect = dragAreaDom.getBoundingClientRect()
                        const y = e.clientY - rect.top
                        const currentTop = y >= rect.height - 43 - 10 ? rect.height - 43 - 10 : y
                        chartCSDragItemDom.style.top = currentTop <= 0 ? 0 : currentTop + "px"
                    }
                }
            )
            chartCSDragItemDom.addEventListener("dragstart", function (e) {
                e.dataTransfer.setData("dragItem", "chartCSDragItem")
            })
        }
    }, [chartCSDragItemRef, chartCSDragAreaRef])

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

    return (
        <>
            <WaterMark content={waterMarkStr()} style={controlShow ? {display: "none"} : {overflow: "hidden", height: "100%"}}>
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
                            {isShowBaseConsole && (
                                <BaseConsole
                                    setIsShowBaseConsole={setIsShowBaseConsole}
                                    directionBaseConsole={directionBaseConsole}
                                />
                            )}
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
                        <div className='chat-icon-wrapper' onClick={onChatCS} draggable={true} ref={chartCSDragItemRef}>
                            <img src={yakitCattle} />
                        </div>
                    )}
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

            {/* <UpdateForward
                visible={updateShow}
                onCancel={onUpdateCancenl}
                onOk={onUpdateCancenl}
                onIgnore={onUpdateIgnore}
            /> */}
        </>
    )
})

export default Main

// interface UpdateForwardProsp {
//     visible: boolean
//     onCancel: () => any
//     onOk: () => any
//     onIgnore: () => any
// }
// const UpdateForward: React.FC<UpdateForwardProsp> = memo((props) => {
//     const {visible, onCancel, onOk, onIgnore} = props

//     return (
//         <YakitModal
//             type='white'
//             maskClosable={false}
//             keyboard={false}
//             centered={true}
//             closable={false}
//             visible={visible}
//             title='重要更新内容前瞻'
//             okText='已知道!'
//             cancelText='关闭'
//             cancelButtonProps={{style: {display: "none"}}}
//             onCancel={onCancel}
//             onOk={onOk}
//             footerExtra={
//                 <YakitButton type='text' onClick={onIgnore}>
//                     不再提示
//                 </YakitButton>
//             }
//         >
//             <div className='update-forward-wrapper'>
//                 <div className='title-style'>Windows自定义安装上线预告!!!</div>
//                 <div className='content-style'>
//                     下一个版本即将上线自定义安装，安装涉及到旧数据迁移，为避免出现意外情况，建议安装前将yakit-project文件夹进行备份。
//                 </div>

//                 <div className='content-style'>
//                     <span className='highlight-style'>注意事项!!</span>
//                     <div>1、安装前需先将引擎进行更新</div>
//                     <div>
//                         2、迁移会将用户文件夹下的yakit-project文件复制到安装路径，并删除。如安装后打开发现没有引擎或数据，可能是用户文件夹下的yakit-project由于被占用无法删除，导致读取的还是用户文件下的内容。如已经迁移完可直接将用户文件夹下的yakit-project删除即可正常读取
//                     </div>
//                 </div>
//             </div>
//         </YakitModal>
//     )
// })
