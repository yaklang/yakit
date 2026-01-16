import {useRef, useEffect, Suspense, lazy} from "react"
// by types
import {failed, warn, yakitFailed} from "./utils/notification"
import {getRemoteValue, setRemoteValue} from "./utils/kv"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "./services/fetch"
import {API} from "./services/swagger/resposeType"
import {useGoogleChromePluginPath, useStore, yakitDynamicStatus} from "./store"
import {refreshToken} from "./utils/login"
import UILayout from "./components/layout/UILayout"
import {getReleaseEditionName, getRemoteHttpSettingGV, isCommunityEdition, isIRify, isMemfit} from "@/utils/envfile"
import {RemoteGV} from "./yakitGV"
import {coordinate, setChartsColorList} from "./pages/globalVariable"
import {remoteOperation} from "./pages/dynamicControl/DynamicControl"
import {useTemporaryProjectStore} from "./store/temporaryProject"
import {useRunNodeStore} from "./store/runNode"
import {handleFetchSystemInfo} from "./constants/hardware"
import {closeWebSocket, startWebSocket} from "./utils/webSocket/webSocket"
import {startShortcutKeyMonitor, stopShortcutKeyMonitor} from "./utils/globalShortcutKey/utils"
import {getStorageGlobalShortcutKeyEvents} from "./utils/globalShortcutKey/events/global"
import {useUploadInfoByEnpriTrace} from "./components/layout/utils"
import emiter from "./utils/eventBus/eventBus"
import { JSONParseLog } from "./utils/tool"

/** 部分页面懒加载 */
const Main = lazy(() => import("./pages/MainOperator"))
const {ipcRenderer} = window.require("electron")

interface OnlineProfileProps {
    BaseUrl: string
    Password?: string
    IsCompany?: boolean
}

function NewApp() {
    const {userInfo} = useStore()
    const {setGoogleChromePluginPath} = useGoogleChromePluginPath()

    // 快捷键注册+获取全局快捷键事件集合缓存
    useEffect(() => {
        getStorageGlobalShortcutKeyEvents()
        startShortcutKeyMonitor()
        return () => {
            stopShortcutKeyMonitor()
        }
    }, [])

    // 软件初始化配置
    useEffect(() => {
        // 设置echarts颜色(替换原始颜色)
        setChartsColorList()
        // 解压命令执行引擎脚本压缩包
        ipcRenderer.invoke("generate-start-engine")
        // 解压Google 插件压缩包
        ipcRenderer
            .invoke("generate-chrome-plugin")
            .then((res) => {
                setGoogleChromePluginPath(res)
            })
            .catch((e) => {})
        // 获取系统信息
        handleFetchSystemInfo()
        // 告诉主进程软件的版本(CE|EE)
        ipcRenderer.invoke("is-enpritrace-to-domain", !isCommunityEdition())
    }, [])

    // 全局记录鼠标坐标位置(为右键菜单提供定位)
    const handleMouseMove = useDebounceFn(
        useMemoizedFn((e: MouseEvent) => {
            const {screenX, screenY, clientX, clientY, pageX, pageY} = e

            coordinate.screenX = screenX
            coordinate.screenY = screenY
            coordinate.clientX = clientX
            coordinate.clientY = clientY
            coordinate.pageX = pageX
            coordinate.pageY = pageY
        }),
        {wait: 50}
    ).run
    useEffect(() => {
        document.addEventListener("mousemove", handleMouseMove)
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
        }
    }, [])

    // 全局监听change事件 input & textrea 都去掉浏览器自带的拼写校验
    useEffect(() => {
        const handleInputEvent = (event) => {
            const {target} = event
            const isInput = target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
            if (isInput) {
                const spellCheck = target.getAttribute("spellCheck")
                if (spellCheck || spellCheck === null) {
                    target.setAttribute("spellCheck", "false")
                }
            }
        }
        document.addEventListener("change", handleInputEvent)
        return () => {
            document.removeEventListener("change", handleInputEvent)
        }
    }, [])

    // 全局监听登录状态
    const setStoreUserInfo = useStore((state) => state.setStoreUserInfo)

    /** yaklang引擎 连接成功后的配置事件 */
    const linkSuccess = () => {
        testYak()
    }

    /** 定时器 */
    const timeRef = useRef<NodeJS.Timeout>()
    const testYak = () => {
        getRemoteValue(getRemoteHttpSettingGV()).then((setting) => {
            if (!setting) {
                ipcRenderer
                    .invoke("GetOnlineProfile", {})
                    .then((data: OnlineProfileProps) => {
                        ipcRenderer.sendSync("sync-edit-baseUrl", {baseUrl: data.BaseUrl}) // 同步
                        setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify({BaseUrl: data.BaseUrl}))
                        refreshLogin()
                        timeRef.current = setTimeout(() => {
                            if (timeRef.current) clearTimeout(timeRef.current)
                        }, 200)
                    })
                    .catch((e) => {
                        failed(`获取失败:${e}`)
                    })
            } else {
                const values = JSONParseLog(setting, {page: "NewApp", fun: "testYak"})
                ipcRenderer
                    .invoke("SetOnlineProfile", {
                        ...values,
                        IsCompany: true
                    } as OnlineProfileProps)
                    .then(() => {
                        ipcRenderer.sendSync("sync-edit-baseUrl", {baseUrl: values.BaseUrl}) // 同步
                        setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify(values))
                        refreshLogin()
                        timeRef.current = setTimeout(() => {
                            if (timeRef.current) clearTimeout(timeRef.current)
                        }, 200)
                    })
                    .catch((e: any) => failed("设置私有域失败:" + e))
            }
        })
    }

    const refreshLogin = useMemoizedFn(() => {
        // 获取引擎中的token(区分企业版与社区版)
        const TokenSource = isCommunityEdition() ? RemoteGV.TokenOnline : RemoteGV.TokenOnlineEnterprise
        // 企业版暂时不需要自动登录功能
        if (!isCommunityEdition()) return
        getRemoteValue(TokenSource)
            .then((resToken) => {
                if (!resToken) {
                    return
                }
                // 通过token获取用户信息
                NetWorkApi<API.UserInfoByToken, API.UserData>({
                    method: "post",
                    url: "auth/user",
                    data: {
                        token: resToken
                    }
                })
                    .then((res) => {
                        setRemoteValue(TokenSource, resToken)
                        const user = {
                            isLogin: true,
                            platform: res.from_platform,
                            githubName: res.from_platform === "github" ? res.name : null,
                            githubHeadImg: res.from_platform === "github" ? res.head_img : null,
                            wechatName: res.from_platform === "wechat" ? res.name : null,
                            wechatHeadImg: res.from_platform === "wechat" ? res.head_img : null,
                            qqName: res.from_platform === "qq" ? res.name : null,
                            qqHeadImg: res.from_platform === "qq" ? res.head_img : null,
                            companyName: res.from_platform === "company" ? res.name : null,
                            companyHeadImg: res.from_platform === "company" ? res.head_img : null,
                            role: res.role,
                            user_id: res.user_id,
                            token: resToken
                        }
                        ipcRenderer.sendSync("sync-update-user", user)
                        setStoreUserInfo(user)
                        refreshToken(user)
                    })
                    .catch((e) => setRemoteValue(TokenSource, ""))
            })
            .catch(() => setRemoteValue(TokenSource, ""))
    })

    const {temporaryProjectId, delTemporaryProject} = useTemporaryProjectStore()
    const temporaryProjectIdRef = useRef<string>("")
    useEffect(() => {
        temporaryProjectIdRef.current = temporaryProjectId
    }, [temporaryProjectId])

    const {runNodeList, clearRunNodeList} = useRunNodeStore()
    const handleKillAllRunNode = async () => {
        let promises: (() => Promise<any>)[] = []
        Array.from(runNodeList).forEach(([key, pid]) => {
            promises.push(() => ipcRenderer.invoke("kill-run-node", {pid}))
        })
        try {
            await Promise.allSettled(promises.map((promiseFunc) => promiseFunc()))
            clearRunNodeList()
        } catch (error) {
            yakitFailed(error + "")
        }
    }

    // 退出时 确保渲染进程各类事项已经处理完毕
    const {dynamicStatus} = yakitDynamicStatus()
    const [uploadProjectEvent] = useUploadInfoByEnpriTrace()
    useEffect(() => {
        ipcRenderer.on("close-windows-renderer", async (e, res: any) => {
            // 如果关闭按钮有其他的弹窗 则不显示 showMessageBox
            const showCloseMessageBox = !(Array.from(runNodeList).length || temporaryProjectIdRef.current)
            // 关闭前的所有接口调用都放到allSettled里面
            try {
                await Promise.allSettled([handleKillAllRunNode(), delTemporaryProject()])
            } catch (error) {}
            // 通知应用退出
            if (dynamicStatus.isDynamicStatus) {
                warn("远程控制关闭中...")
                await remoteOperation(false, dynamicStatus)
                ipcRenderer.invoke("app-exit", {showCloseMessageBox, isIRify: isIRify(), isMemfit: isMemfit()})
            } else {
                ipcRenderer.invoke("app-exit", {showCloseMessageBox, isIRify: isIRify(), isMemfit: isMemfit()})
            }
        })
        ipcRenderer.on("minimize-windows-renderer", async (e, res: any) => {
            const {token} = userInfo
            if (token && token.length > 0) {
                uploadProjectEvent.startUpload({
                    isAutoUploadProject: true,
                    isUploadSyncData: true
                })
            }
        })
        return () => {
            ipcRenderer.removeAllListeners("close-windows-renderer")
            ipcRenderer.removeAllListeners("minimize-windows-renderer")
        }
    }, [dynamicStatus.isDynamicStatus, userInfo])

    useEffect(() => {
        // 登录账号时 连接 WebSocket 服务器
        if (userInfo.isLogin) {
            ipcRenderer.invoke("socket-start")
        }
        // 退出账号时 关闭 WebSocket 服务器
        else {
            ipcRenderer.invoke("socket-close")
        }
    }, [userInfo.isLogin])

    // 在页面打开时，执行一次，用于初始化WebSocket推送（DuplexConnection）
    useEffect(() => {
        startWebSocket()
        return () => {
            // 当组件销毁的时候，关闭WebSocket
            closeWebSocket()
        }
    }, [])

    useEffect(() => {
        const titleElement = document.getElementById("app-html-title")
        if (titleElement) {
            titleElement.textContent = getReleaseEditionName()
        }
    }, [])

    const destroyMainWinAntdUi = useMemoizedFn(() => {
        const selectors = [".ant-notification-notice", ".ant-modal-root", ".ant-drawer", ".ant-drawer-mask"]
        selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => el.remove())
        })
    })
    useEffect(() => {
        emiter.on("destroyMainWinAntdUiEvent", destroyMainWinAntdUi)
        return () => {
            emiter.off("destroyMainWinAntdUiEvent", destroyMainWinAntdUi)
        }
    }, [])

    return (
        <UILayout linkSuccess={linkSuccess}>
            <Suspense fallback={<div>Loading Main</div>}>
                <Main onErrorConfirmed={() => {}} />
            </Suspense>
        </UILayout>
    )
}

export default NewApp
