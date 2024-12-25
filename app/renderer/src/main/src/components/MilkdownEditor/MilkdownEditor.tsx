import {defaultValueCtx, Editor, editorViewOptionsCtx, rootCtx} from "@milkdown/kit/core"
import React, {useEffect, useRef, useState} from "react"

import {Milkdown, MilkdownProvider, useEditor} from "@milkdown/react"
import {blockquoteSchema, codeBlockSchema, commonmark, hrSchema, listItemSchema} from "@milkdown/kit/preset/commonmark"
import {gfm} from "@milkdown/kit/preset/gfm"
import {history} from "@milkdown/kit/plugin/history"
import {clipboard} from "@milkdown/kit/plugin/clipboard"

import {ProsemirrorAdapterProvider, useNodeViewFactory, usePluginViewFactory} from "@prosemirror-adapter/react"
import {tooltip, TooltipView} from "./Tooltip/Tooltip"
import {BlockView} from "./Block/Block"
import {block, blockConfig} from "@milkdown/plugin-block" // 引入block插件
import {cursor} from "@milkdown/kit/plugin/cursor"
import {imageBlockComponent, imageBlockConfig} from "@milkdown/kit/component/image-block"

import {linkTooltipPlugin, linkTooltipConfig} from "@milkdown/kit/component/link-tooltip"
import {listener, listenerCtx} from "@milkdown/kit/plugin/listener"

import "./css/index.scss"
import {yakitInfo, yakitNotify} from "@/utils/notification"
import {placeholderConfig, placeholderPlugin} from "./Placeholder"
import {$view, getMarkdown} from "@milkdown/kit/utils"
import {CustomCodeComponent} from "./CodeBlock/CodeBlock"
import {Blockquote} from "./Blockquote"
import {
    CollabStatus,
    CustomMilkdownProps,
    DeleteOSSFileItem,
    MilkdownCollabProps,
    MilkdownEditorProps
} from "./MilkdownEditorType"
import {alterCustomPlugin} from "./utils/alertPlugin"
import {commentCustomPlugin} from "./utils/commentPlugin"

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
import {underlineCustomPlugin} from "./utils/underline"
import {ListItem} from "./ListItem/ListItem"
import {Ctx, MilkdownPlugin} from "@milkdown/kit/ctx"
import {trailing} from "@milkdown/kit/plugin/trailing"

import {upload, uploadConfig} from "@milkdown/kit/plugin/upload"
import type {Node} from "@milkdown/kit/prose/model"
import {imageInlineComponent, inlineImageConfig} from "@milkdown/kit/component/image-inline"

import {html} from "atomico"
import {fileCustomSchema, uploadCustomPlugin} from "./utils/uploadPlugin"
import {CustomFile} from "./CustomFile/CustomFile"
import {insertImageBlockCommand} from "./utils/imageBlock"

import {listCustomPlugin} from "./utils/listPlugin"
import {headingCustomPlugin} from "./utils/headingPlugin"
import {codeCustomPlugin} from "./utils/codePlugin"
import {MilkdownHr} from "./MilkdownHr/MilkdownHr"

import {tableBlock} from "@milkdown/kit/component/table-block"
import {ImgMaxSize} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {httpDeleteOSSResource, httpUploadImgBase64} from "@/apiUtils/http"
import {deletedFileUrlsCtx, trackDeletePlugin} from "./utils/trackDeletePlugin"
import moment from "moment"
import {useStore} from "@/store"
import {CollabManager, CollabUserInfo} from "./CollabManager"
import emiter from "@/utils/eventBus/eventBus"

import {collab, collabServiceCtx} from "@milkdown/plugin-collab"
import {showYakitModal} from "../yakitUI/YakitModal/YakitModalConfirm"
import {tokenOverdue} from "@/services/fetch"
import {isBoolean} from "lodash"
import {notepadSaveStatus} from "./WebsocketProvider/constants"
import {toAddNotepad, toEditNotepad} from "@/pages/notepadManage/notepadManage/NotepadManage"
import {API} from "@/services/swagger/resposeType"
import {apiSaveNotepadList} from "@/pages/notepadManage/notepadManage/utils"

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
const randomUserColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`

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
    const {type, readonly, defaultValue, collabProps, setEditor, customPlugin, onMarkdownUpdated} = props

    const milkdownRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(milkdownRef)

    const nodeViewFactory = useNodeViewFactory()
    const pluginViewFactory = usePluginViewFactory()

    const userInfo = useStore((s) => s.userInfo)

    //#region 编辑器引用的相关插件 start
    const blockPlugins: MilkdownPlugin[] = useCreation(() => {
        return [
            block,
            (ctx: Ctx) => () => {
                ctx.set(block.key, {
                    view: pluginViewFactory({
                        component: () => <BlockView type={type} notepadHash={collabProps?.milkdownHash} />
                    })
                })
            },
            (ctx: Ctx) => () => {
                ctx.update(blockConfig.key, () => ({
                    filterNodes: (pos, node) => {
                        if (node.type.name === "paragraph" && !node.content.size) {
                            return true
                        }
                        return false
                    }
                }))
            }
        ].flat()
    }, [pluginViewFactory, type, collabProps?.milkdownHash])

    const placeholder = useCreation(() => {
        return [placeholderConfig, placeholderPlugin].flat()
    }, [])

    const uploadPlugins = useCreation(() => {
        return [
            ...uploadCustomPlugin(),
            upload,
            $view(fileCustomSchema.node, () =>
                nodeViewFactory({
                    component: CustomFile
                })
            ),
            (ctx: Ctx) => () => {
                ctx.update(uploadConfig.key, (prev) => ({
                    ...prev,
                    uploader: async (files, schema) => {
                        const images: File[] = []
                        for (let i = 0; i < files.length; i++) {
                            const file = files.item(i)
                            if (!file) {
                                continue
                            }

                            // You can handle whatever the file type you want, we handle image here.
                            if (!file.type.includes("image")) {
                                continue
                            }
                            if (file.size > ImgMaxSize) {
                                yakitNotify("error", "图片大小不能超过1M")
                                continue
                            }
                            images.push(file)
                        }
                        const nodes: Node[] = await Promise.all(
                            images.map(async (image) => {
                                const alt = image.name
                                try {
                                    console.log("uploadConfig-image", image)
                                    const src = await uploadImg(image)
                                    return schema.nodes["image-block"].createAndFill({
                                        src,
                                        alt
                                    }) as Node
                                } catch (error) {
                                    return schema.nodes.image.createAndFill({
                                        src: "",
                                        alt
                                    }) as Node
                                }
                            })
                        )
                        return nodes
                    }
                }))
            }
        ].flat()
    }, [nodeViewFactory])

    const imagePlugin = useCreation(() => {
        return [
            imageBlockComponent,
            imageInlineComponent,
            insertImageBlockCommand,
            (ctx: Ctx) => () => {
                ctx.update(imageBlockConfig.key, (value) => ({
                    ...value,
                    captionIcon: () => html`
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M7 8H17M7 12H11M12 20L8 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H16L12 20Z"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    `,
                    onUpload: async (image: File) => {
                        console.log("imageBlockConfig-image", image)
                        const url = uploadImg(image)
                        return url
                    }
                }))
            },
            (ctx: Ctx) => () => {
                ctx.update(inlineImageConfig.key, (value) => ({
                    ...value,
                    imageIcon: () =>
                        html`<svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M4 16L8.58579 11.4142C9.36683 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z"
                                stroke="currentColor"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <circle cx="14" cy="8" r="1" fill="currentColor" />
                        </svg> `,
                    onUpload: async (image: File) => {
                        console.log("inlineImageConfig-image", image)
                        const url = uploadImg(image)
                        return url
                    }
                }))
            }
        ].flat()
    }, [nodeViewFactory])

    const linkTooltip = useCreation(() => {
        return [
            linkTooltipPlugin,
            (ctx: Ctx) => () => {
                ctx.update(linkTooltipConfig.key, (defaultConfig) => ({
                    ...defaultConfig,
                    linkIcon: () => "🔗",
                    editButton: () => "✎",
                    removeButton: () => "❌",
                    confirmButton: () => "✔️",
                    onCopyLink: (link: string) => {
                        yakitInfo("Link copied")
                    }
                }))
            }
        ].flat()
    }, [])

    const listPlugin = useCreation(() => {
        return [
            ...listCustomPlugin(),
            $view(listItemSchema.node, () =>
                nodeViewFactory({
                    component: ListItem
                })
            )
        ].flat()
    }, [])

    const headingPlugin = useCreation(() => {
        return [...headingCustomPlugin()].flat()
    }, [])

    const codePlugin = useCreation(() => {
        return [
            ...codeCustomPlugin(),
            $view(codeBlockSchema.node, () => {
                return nodeViewFactory({
                    component: CustomCodeComponent,
                    stopEvent: (e) => true
                })
            })
        ].flat()
    }, [])

    const blockquotePlugin = useCreation(() => {
        return [
            $view(blockquoteSchema.node, () =>
                nodeViewFactory({
                    component: Blockquote
                })
            )
        ].flat()
    }, [])

    const alterPlugin = useCreation(() => {
        return [...alterCustomPlugin()].flat()
    }, [])

    const underlinePlugin = useCreation(() => {
        return [...underlineCustomPlugin()].flat()
    }, [])

    const commentPlugin = useCreation(() => {
        return [...commentCustomPlugin()].flat()
    }, [])

    const hrPlugin = useCreation(() => {
        return [
            $view(hrSchema.node, () =>
                nodeViewFactory({
                    component: MilkdownHr
                })
            )
        ].flat()
    }, [])

    const uploadImg = useMemoizedFn(async (image) => {
        if (image.size > ImgMaxSize) {
            yakitNotify("error", "图片大小不能超过1M")
            return ""
        }
        try {
            const base64 = await getBase64(image)
            const src = await httpUploadImgBase64({
                base64,
                imgInfo: {
                    filename: image.name || "image.png",
                    contentType: image.type || "image/png"
                },
                type: collabParams.enableCollab ? "notepad" : "img",
                filedHash: collabParams.milkdownHash
            })
            return src
        } catch (error) {
            return ""
        }
    })
    //#endregion

    const collabParams: MilkdownCollabProps = useCreation(() => {
        if (!collabProps) {
            const def: MilkdownCollabProps = {
                title: "",
                enableCollab: false,
                milkdownHash: "",
                routeInfo: {
                    pageId: "",
                    route: null
                },
                onChangeWSLinkStatus: () => {},
                onChangeOnlineUser: () => {},
                onSetTitle: () => {}
            }
            return def
        }
        return collabProps
    }, [collabProps])

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
    const {get, loading} = useEditor(
        (root) => {
            return (
                Editor.make()
                    .config((ctx) => {
                        ctx.set(rootCtx, root)
                        ctx.set(tooltip.key, {
                            view: pluginViewFactory({
                                component: TooltipView
                            })
                        })
                        // 配置为只读
                        ctx.set(editorViewOptionsCtx, {
                            editable: () => !readonly
                        })
                        ctx.set(defaultValueCtx, defaultValue || "")
                        onCollab(ctx)
                        const listener = ctx.get(listenerCtx)
                        listener.markdownUpdated((ctx, nextMarkdown, prevMarkdown) => {
                            const isSave = nextMarkdown !== prevMarkdown
                            if (collabParams.enableCollab && isSave) {
                                onSaveHistory(nextMarkdown)
                            }
                            onMarkdownUpdated && onMarkdownUpdated(nextMarkdown, prevMarkdown)
                        })
                    })
                    .use(commonmark)
                    .use(gfm)
                    .use(cursor)
                    .use(tooltip)
                    .use(history)
                    .use(clipboard)
                    // trailing
                    .use(trailing)
                    // collab
                    .use(collab)
                    // listener
                    .use(listener)
                    // blockquote
                    .use(blockquotePlugin)
                    // block
                    .use(blockPlugins)
                    // upload
                    .use(uploadPlugins)
                    // image
                    .use(imagePlugin)
                    // listItem
                    .use(listPlugin)
                    .use(headingPlugin)
                    // code
                    .use(codePlugin)
                    // linkTooltip
                    .use(linkTooltip)
                    // placeholder
                    .use(placeholder)
                    // table
                    .use(tableBlock)
                    // alterCustomPlugin
                    .use(alterPlugin)
                    // underlinePlugin
                    .use(underlinePlugin)
                    // commentPlugin
                    .use(commentPlugin)
                    // hrPlugin
                    .use(hrPlugin)
                    // trackDeletePlugin
                    .use(trackDeletePlugin())
                    .use(customPlugin || [])
            )
        },
        [readonly, defaultValue, type, collabParams.enableCollab, collabProps?.milkdownHash]
    )
    /**更新最新的editor */
    useEffect(() => {
        if (loading) return
        const editor = get()
        if (editor && setEditor) {
            setEditor(editor)
            // DeletedFiles
            editor?.action(onSetDeletedFiles)
        }
    }, [loading, get])
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
            console.log("onDeleteFiles", urls)
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
        console.log("onDeleteFiles-deletedFiles", deletedFiles)
        if (fileName.length > 0) {
            setInterval(undefined)
            console.log("onDeleteFiles-fileName", fileName)
            httpDeleteOSSResource({file_name: fileName}, true).finally(() => {
                // 暂不考虑删除失败的情况
                get()?.action((ctx) => ctx.update(deletedFileUrlsCtx, () => [...newDeletedFiles]))
            })
        }
    })
    //#endregion 删除资源 end

    //#region 协作文档
    const collabManagerRef = useRef<CollabManager>()
    const wsStatusRef = useRef<CollabStatus>({
        status: "disconnected",
        isSynced: false,
        saveStatus: notepadSaveStatus.saveProgress
    }) // 记录当前链接状态
    useUpdateEffect(() => {
        if (collabManagerRef.current) {
            collabManagerRef.current.setTitle(collabParams.title)
        }
    }, [collabParams.title])
    useEffect(() => {
        if (inViewport) {
            onCollabConnect()
            return () => {
                onCollabDisconnect()
            }
        }
    }, [inViewport])
    const onCollab = useMemoizedFn((ctx) => {
        const {milkdownHash, title} = collabParams
        if (!collabParams.enableCollab) {
            onCollabDisconnect()
            return
        }
        if (!milkdownHash) {
            yakitNotify("error", "enableCollab true,启用协作文档时,hash值必须存在")
            return
        }
        if (collabManagerRef.current) return
        const user = {
            userId: userInfo.user_id || 0,
            name: userInfo.companyName || "",
            color: `${randomUserColor()}`,
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
            closable: false,
            onOkText: "保存当前文档",
            cancelText: "不保存",
            onOk: () => {
                const markdownContent = get()?.action(getMarkdown()) || ""
                // 有内容才保存，没有内容新建
                if (markdownContent) {
                    const params: API.PostNotepadRequest = {
                        title: title,
                        content: markdownContent
                    }
                    apiSaveNotepadList(params).then((hash) => {
                        toEditNotepad({notepadHash: hash})
                    })
                } else {
                    toAddNotepad()
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
    const onCollabConnect = useMemoizedFn(() => {
        collabManagerRef.current?.connect()
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
        <>
            <div ref={milkdownRef} />
            <Milkdown />
        </>
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
