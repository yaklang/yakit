import {defaultValueCtx} from "@milkdown/kit/core"
import React, {useEffect, useRef, useState} from "react"

import {Milkdown, MilkdownProvider} from "@milkdown/react"

import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"

import "./css/index.scss"
import {yakitNotify} from "@/utils/notification"
import {getMarkdown} from "@milkdown/kit/utils"
import {CollabStatus, CustomMilkdownProps, DeleteOSSFileItem, MilkdownEditorProps} from "./MilkdownEditorType"

import {diffLines} from "diff"
import {
    useCreation,
    useDebounceFn,
    useInViewport,
    useMemoizedFn,
    useRafInterval,
    useThrottleFn,
    useUpdateEffect
} from "ahooks"

import {httpDeleteOSSResource} from "@/apiUtils/http"
import {deletedFileUrlsCtx} from "./utils/trackDeletePlugin"
import moment from "moment"
import {useStore} from "@/store"
import {CollabManager, CollabUserInfo} from "./CollabManager"
import emiter from "@/utils/eventBus/eventBus"

import {collabServiceCtx} from "@milkdown/plugin-collab"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {tokenOverdue} from "@/services/fetch"
import {isBoolean} from "lodash"
import {notepadSaveStatus} from "./WebsocketProvider/constants"
import {toAddNotepad, toEditNotepad} from "@/pages/notepadManage/notepadManage/NotepadManage"
import {API} from "@/services/swagger/resposeType"
import {apiSaveNotepad} from "@/pages/notepadManage/notepadManage/utils"
import useInitEditorHooks, {InitEditorHooksCollabProps} from "./utils/initEditor"
const markdown1 = `

1. 5565
2. 665fdsf

#ggg

![1.00](

Maybe more? ![]()

[Mirone](https://github.com/Saul-Mirone)

`
const markdown2 = `#ggg
fsdfsdf
`
export const randomMilkdownUserColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`

const saveHistoryIntervalTime = 1000 * 60

/**选择的图片转为Base64 */
export const getBase64 = (file): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (error) => reject(error)
    })
export const isDifferenceGreaterThan30Seconds = (timestamp1, timestamp2) => {
    // 计算绝对时间差
    const difference = Math.abs(timestamp1 - timestamp2)

    // 判断是否大于30秒（10秒 = 10000毫秒）
    return difference > 1000 * 30
}
const CustomMilkdown: React.FC<CustomMilkdownProps> = React.memo((props) => {
    const userInfo = useStore((s) => s.userInfo)

    const {defaultValue, collabProps, setEditor, onSaveContentBeforeDestroy} = props

    const milkdownRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(milkdownRef)
    const collabManagerRef = useRef<CollabManager>() // 协作管理器
    useEffect(() => {
        return () => {
            // 统一
            collabManagerRef.current?.destroy()
            collabManagerRef.current = undefined
            clearRemove()
            onDeleteAllFiles()
        }
    }, [])

    //#region 编辑器初始
    const collabParams: InitEditorHooksCollabProps = useCreation(() => {
        if (!collabProps) {
            const def: InitEditorHooksCollabProps = {
                title: "",
                enableCollab: false,
                milkdownHash: "",
                routeInfo: {
                    pageId: "",
                    route: null
                },
                onChangeWSLinkStatus: () => {},
                onChangeOnlineUser: () => {},
                onSetTitle: () => {},
                onCollab: () => {},
                onSaveHistory: () => {}
            }
            return def
        }
        return {
            ...collabProps,
            onCollab: (ctx) => onCollab(ctx),
            onSaveHistory: (newValue) => onSaveHistory(newValue)
        }
    }, [collabProps])
    const {get, loading} = useInitEditorHooks({
        ...props,
        collabProps: collabParams
    })
    /**更新最新的editor */
    useEffect(() => {
        if (loading) return
        const editor = get()
        if (editor) {
            if (setEditor) setEditor(editor)
            // DeletedFiles
            editor.action(onSetDeletedFiles)
        }
    }, [loading, get])
    useEffect(() => {
        return () => {
            const value = get()?.action(getMarkdown()) || ""
            onSaveContentBeforeDestroy && onSaveContentBeforeDestroy(value)
        }
    }, [])
    //#endregion

    //#region 删除资源
    const [deletedFiles, setDeletedFiles] = useState<DeleteOSSFileItem[]>([])
    const [interval, setInterval] = useState<number | undefined>(undefined) // 文件删除间隔
    const clearRemove = useRafInterval(() => {
        onDeleteFiles()
    }, interval)
    /** 设置当前文档中被删除的文件名称 */
    const onSetDeletedFiles = useDebounceFn(
        useMemoizedFn((ctx) => {
            // 获取 trackDeletePlugin 插件共享的值
            const urls = ctx.get(deletedFileUrlsCtx)
            if (urls.length > 0) {
                setInterval(1000)
            } else {
                setInterval(undefined)
            }
            setDeletedFiles(urls)
        }),
        {wait: 200}
    ).run

    /**删除文档中被删除的所有文件 */
    const onDeleteAllFiles = useMemoizedFn(() => {
        if (deletedFiles.length > 0) {
            httpDeleteOSSResource({file_name: deletedFiles.map((ele) => ele.fileName)}, true)
        }
    })
    /**删除在文档中被删除30s的文件 */
    const onDeleteFiles = useMemoizedFn(() => {
        const fileName: string[] = []
        const newDeletedFiles: DeleteOSSFileItem[] = []
        const length = deletedFiles.length
        for (let index = 0; index < length; index++) {
            const element = deletedFiles[index]
            if (isDifferenceGreaterThan30Seconds(element.time, moment().valueOf())) {
                fileName.push(element.fileName)
            } else {
                newDeletedFiles.push(element)
            }
        }
        if (fileName.length > 0) {
            setInterval(undefined)
            httpDeleteOSSResource({file_name: fileName}, true).finally(() => {
                // 暂不考虑删除失败的情况
                get()?.action((ctx) => ctx.update(deletedFileUrlsCtx, () => [...newDeletedFiles]))
            })
        }
    })
    //#endregion 删除资源 end

    //#region 协作文档
    const wsStatusRef = useRef<CollabStatus>({
        status: "disconnected",
        isSynced: false,
        saveStatus: notepadSaveStatus.saveProgress
    }) // 记录当前链接状态
    // TODO - 共享标题
    useUpdateEffect(() => {
        if (collabManagerRef.current) {
            collabManagerRef.current.setTitle(collabParams.title)
        }
    }, [collabParams.title])

    useUpdateEffect(() => {
        if (inViewport) {
            // 直接连接会collabService有意外报错情况
            // 第二次flush,之前的collabService只是断开连接没有销毁,所以值有保留,传入defaultValue编辑器内部会自己做对比显示最新的内容
            collabManagerRef.current?.flush(defaultValue || "")
        } else {
            onCollabDisconnect()
        }
    }, [inViewport])

    const onCollab = useMemoizedFn((ctx) => {
        const {milkdownHash, title} = collabParams
        if (!collabParams.enableCollab) {
            onCollabDisconnect()
            return
        }
        if (!milkdownHash) {
            // yakitNotify("error", "enableCollab true,启用协作文档时,hash值必须存在")
            return
        }
        if (collabManagerRef.current) return
        const user = {
            userId: userInfo.user_id || 0,
            name: userInfo.companyName || "",
            color: `${randomMilkdownUserColor()}`,
            heardImg: userInfo.companyHeadImg || ""
        }
        const collabService = ctx.get(collabServiceCtx)
        collabManagerRef.current = new CollabManager(collabService, user, {
            token: userInfo.token,
            notepadHash: milkdownHash,
            title
        })
        collabManagerRef.current.flush(defaultValue || "")
        collabManagerRef.current.on("offline-after", onLinkError)
        collabManagerRef.current.on("online-users", onSetOnlineUsers)
        collabManagerRef.current.on("link-status-onchange", onLineStatus)
        collabManagerRef.current.on("sync-title", onSetTitle)
    })

    /**同步标题 */
    const onSetTitle = useDebounceFn(
        useMemoizedFn((value: string) => {
            collabParams?.onSetTitle(value)
        }),
        {wait: 200, leading: true}
    ).run

    /**在线链接状态 */
    const onLineStatus = useDebounceFn(
        useMemoizedFn((value: CollabStatus) => {
            wsStatusRef.current = value
            collabParams?.onChangeWSLinkStatus(value)
        }),
        {wait: 200, leading: true}
    ).run

    /**获取到所有的在线用户，然后设置在线用户数据 */
    const onSetOnlineUsers = useDebounceFn(
        useMemoizedFn((userList: CollabUserInfo[]) => {
            collabParams?.onChangeOnlineUser(userList)
        }),
        {wait: 200, leading: true}
    ).run

    /**处理ws链接出错 */
    const onLinkError = useDebounceFn(
        useMemoizedFn((event: CloseEvent) => {
            const {routeInfo} = collabParams
            if (!routeInfo) {
                yakitNotify("error", "当enableCollab为true,routeInfo必传")
                return
            }
            switch (event.code) {
                case 200: // 正常关闭
                    break
                case 401: // 401是指没有传token或者token过期
                    loginOut(event)
                    break

                case 404: // 文档不存在/已经被删除
                    onShowSave(event)
                    break
                case 403: //没有编辑或者阅读的权限
                case 209: // 209 这种可以能处理出错，例如没传messageType
                case 500: // 就可能是后端从http升级websocket失败啊，这种服务相关的
                    onShowErrorModal(event)
                    break
                default:
                    break
            }
        }),
        {wait: 200, leading: true}
    ).run
    const loginOut = useMemoizedFn((event: CloseEvent) => {
        const {routeInfo} = collabParams
        if (!routeInfo) return
        // 退出登录
        tokenOverdue({
            code: 401,
            message: event.reason,
            userInfo
        })
        // 关闭笔记本编辑一级菜单
        setTimeout(() => {
            emiter.emit(
                "onCloseFirstMenu",
                JSON.stringify({
                    route: routeInfo.route
                })
            )
        }, 1000)
    })
    const onShowSave = useMemoizedFn((event: CloseEvent) => {
        const {title} = collabParams
        // 弹出框，显示网络异常，关闭/保存按钮
        const s = showYakitModal({
            title: "文档不存在/已经被删除",
            content: <span>错误原因:{event.reason}</span>,
            maskClosable: false,
            closable: false,
            showConfirmLoading: true,
            onOkText: "保存当前文档",
            onCancelText: "不保存",
            onOk: () => {
                const markdownContent = get()?.action(getMarkdown()) || ""
                // 有内容才保存，没有内容新建
                if (markdownContent) {
                    const params: API.PostNotepadRequest = {
                        title,
                        content: markdownContent
                    }
                    apiSaveNotepad(params).then((hash) => {
                        toEditNotepad({pageInfo: {notepadHash: hash, title}})
                        onCloseCurrentPage()
                        s.destroy()
                    })
                } else {
                    toAddNotepad()
                    onCloseCurrentPage()
                    s.destroy()
                }
            },
            onCancel: () => {
                onCloseCurrentPage()
                s.destroy()
            },
            bodyStyle: {padding: 24}
        })
    })
    const onShowErrorModal = useMemoizedFn((event: CloseEvent) => {
        // 弹出框，显示网络异常，关闭/保存按钮
        const m = showYakitModal({
            title: "网络异常",
            content: (
                <span>
                    错误原因:{event.code}:{event.reason}
                </span>
            ),
            maskClosable: false,
            closable: false,
            onOkText: "关闭页面",
            cancelButtonProps: {style: {display: "none"}},
            onOk: () => {
                onCloseCurrentPage()
                m.destroy()
            },
            bodyStyle: {padding: 24}
        })
        yakitNotify("error", event.reason)
    })
    const onCloseCurrentPage = useMemoizedFn(() => {
        const {routeInfo} = collabParams
        if (!routeInfo) return
        emiter.emit("onCloseCurrentPage", routeInfo.pageId)
    })
    const onCollabDisconnect = useMemoizedFn(() => {
        collabManagerRef.current?.disconnect()
    })
    //#endregion

    //#region 保存历史
    //是否保存历史,开启协作文档后,才有保存历史
    const isSaveHistory = useCreation(() => {
        if (!collabParams.enableCollab) {
            return false
        }
        if (isBoolean(collabParams.enableSaveHistory)) {
            return collabParams.enableSaveHistory
        }
        return !!collabParams.enableSaveHistory?.enable
    }, [collabParams.enableCollab, collabParams.enableSaveHistory])
    // 保存历史的间隔时间 默认每隔1min
    const historyIntervalTime = useCreation(() => {
        if (isBoolean(collabParams.enableSaveHistory)) {
            return saveHistoryIntervalTime
        }
        return collabParams.enableSaveHistory?.interval || saveHistoryIntervalTime
    }, [collabParams.enableSaveHistory])
    /**默认每隔1min 保存历史 */
    const onSaveHistory = useThrottleFn(
        useMemoizedFn((value: string) => {
            if (isSaveHistory) collabManagerRef.current?.sendContent({content: value, title: collabParams.title})
        }),
        {wait: historyIntervalTime}
    ).run
    //#endregion

    /*TODO - 历史文档差异对比 */
    const onDifferences = useMemoizedFn((ctx) => {
        // 获取两个文档的差异
        const differences = diffLines(markdown1, markdown2)

        let content = ""

        differences.forEach((part) => {
            if (part.removed) {
                content += `~~${part.value}~~\n` // 用删除线标记删除内容
            } else if (part.added) {
                content += "`" + `${part.value}` + "`" + "\n" // 用高亮标记新增内容
            } else {
                content += part.value // 未改变的内容保持原样
            }
        })

        ctx.set(defaultValueCtx, content)
    })
    return (
        <div ref={milkdownRef}>
            <Milkdown />
        </div>
    )
})

export const MilkdownEditor: React.FC<MilkdownEditorProps> = React.memo((props) => {
    return (
        <MilkdownProvider>
            <ProsemirrorAdapterProvider>
                <CustomMilkdown {...props} />
            </ProsemirrorAdapterProvider>
        </MilkdownProvider>
    )
})
