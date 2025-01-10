import {BlockProvider} from "@milkdown/kit/plugin/block"
import {useInstance} from "@milkdown/react"
import {useCallback, useEffect, useRef, useState} from "react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {
    blockquoteSchema,
    bulletListSchema,
    codeBlockSchema,
    headingSchema,
    hrSchema,
    listItemSchema,
    orderedListSchema,
    paragraphSchema
} from "@milkdown/kit/preset/commonmark"
import {TextSelection} from "@milkdown/kit/prose/state"
import styles from "./Block.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import {useMemoizedFn} from "ahooks"
import {Ctx} from "@milkdown/kit/ctx"
import {alterCustomSchema} from "../utils/alertPlugin"
import {clearContentAndAddBlockType, clearContentAndSetBlockType, clearContentAndWrapInBlockType} from "../utils/utils"
import {fileCommand} from "../utils/uploadPlugin"
import {callCommand} from "@milkdown/kit/utils"
import {insertImageBlockCommand} from "../utils/imageBlock"
import {Tooltip} from "antd"
import {defaultBlockList} from "../constants"
import {cloneDeep} from "lodash"
import {BlockListProps} from "../MilkdownEditorType"
import {HttpUploadImgBaseRequest, httpUploadImgPath} from "@/apiUtils/http"
import {yakitNotify} from "@/utils/notification"
import {getLocalFileLinkInfo} from "../CustomFile/utils"
import {ImgMaxSize} from "@/pages/pluginEditor/pluginImageTextarea/PluginImageTextarea"
import {useStore} from "@/store"

const {ipcRenderer} = window.require("electron")

const imgTypes = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg"]

const FileMaxSize = 1024 * 1024 * 1024

interface BlockViewProps {
    type: HttpUploadImgBaseRequest["type"]
    notepadHash?: string
}
export const BlockView: React.FC<BlockViewProps> = (props) => {
    const {notepadHash, type} = props

    const userInfo = useStore((s) => s.userInfo)

    const ref = useRef<HTMLDivElement>(null)
    const blockProvider = useRef<BlockProvider>()

    const [visibleAdd, setVisibleAdd] = useState(false)
    const [blockList, setBlockList] = useState<BlockListProps[]>(cloneDeep(defaultBlockList)) // 后期选中某个类型的组件可能不会显示一些操作

    const {view, prevState} = usePluginViewContext()

    const [loading, get] = useInstance()
    const action = useCallback(
        (fn: (ctx: Ctx) => void) => {
            if (loading) return
            get().action(fn)
        },
        [loading]
    )

    useEffect(() => {
        const div = ref.current
        if (loading || !div) {
            return
        }

        const editor = get()
        if (!editor) {
            return
        }
        blockProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
        })
        blockProvider.current?.update()
    }, [loading])

    useEffect(() => {
        return () => {
            // 单独的Effect中卸载，避免在开发过程中热加载的时候报错
            blockProvider.current?.destroy()
        }
    }, [])

    const onAddContent = useMemoizedFn(({label}) => {
        const {dispatch, state} = view
        switch (label) {
            case "一级标题":
                action((ctx) => {
                    const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 1})
                    command(state, dispatch)
                })
                break
            case "二级标题":
                action((ctx) => {
                    const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 2})
                    command(state, dispatch)
                })
                break

            case "三级标题":
                action((ctx) => {
                    const command = clearContentAndSetBlockType(headingSchema.type(ctx), {level: 3})
                    command(state, dispatch)
                })
                break

            case "有序列表":
                action((ctx) => {
                    const command = clearContentAndWrapInBlockType(orderedListSchema.type(ctx))
                    command(state, dispatch)
                })
                break

            case "无序列表":
                action((ctx) => {
                    const command = clearContentAndWrapInBlockType(bulletListSchema.type(ctx))
                    command(state, dispatch)
                })
                break
            case "任务":
                action((ctx) => {
                    const command = clearContentAndWrapInBlockType(listItemSchema.type(ctx), {checked: false})
                    command(state, dispatch)
                })
                break
            case "代码块":
                action((ctx) => {
                    const command = clearContentAndAddBlockType(codeBlockSchema.type(ctx))
                    command(state, dispatch)
                })
                break
            case "引用":
                action((ctx) => {
                    const command = clearContentAndWrapInBlockType(blockquoteSchema.type(ctx))
                    command(state, dispatch)
                })
                break
            case "高亮":
                action((ctx) => {
                    const command = clearContentAndWrapInBlockType(alterCustomSchema.type(ctx))
                    command(state, dispatch)
                })
                break
            case "上传文件":
                ipcRenderer
                    .invoke("openDialog", {
                        title: "请选择文件",
                        properties: ["openFile"]
                    })
                    .then((data: {filePaths: string[]}) => {
                        const filesLength = data.filePaths.length
                        if (filesLength) {
                            const path = data.filePaths[0].replace(/\\/g, "\\")
                            getLocalFileLinkInfo(path).then((res) => {
                                if (res.size > FileMaxSize) {
                                    yakitNotify("error", "文件大小不能超过1G")
                                    return
                                }
                                const index = path.lastIndexOf(".")
                                const fileType = path.substring(index, path.length)
                                if (imgTypes.includes(fileType)) {
                                    if (res.size > ImgMaxSize) {
                                        yakitNotify("error", "图片大小不能超过1M")
                                        return
                                    }
                                    httpUploadImgPath({path, type, filedHash: notepadHash})
                                        .then((src) => {
                                            action(
                                                callCommand(insertImageBlockCommand.key, {
                                                    src,
                                                    alt: path,
                                                    title: ""
                                                })
                                            )
                                        })
                                        .catch((e) => {
                                            yakitNotify("error", `上传图片失败:${e}`)
                                        })
                                } else {
                                    action(
                                        callCommand(fileCommand.key, {
                                            fileId: "0",
                                            path,
                                            notepadHash,
                                            uploadUserId: userInfo.user_id
                                        })
                                    )
                                }
                            })
                        }
                    })

                break
            case "分割线":
                action((ctx) => {
                    const command = clearContentAndAddBlockType(hrSchema.type(ctx))
                    command(state, dispatch)
                })
                break

            default:
                break
        }
        view.focus()
        setVisibleAdd(false)
        blockProvider.current?.hide()
    })
    const onAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const editor = get()
        if (!editor) return
        if (!view.hasFocus()) view.focus()
        const {state, dispatch} = view
        const active = blockProvider.current?.active
        if (!active) return
        const $pos = active.$pos
        const pos = $pos.pos + active.node.nodeSize
        let tr = state.tr.insert(pos, paragraphSchema.type(editor.ctx).create())
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
        dispatch(tr.scrollIntoView())
        blockProvider.current?.hide()
    }
    return (
        <div className={styles["block-wrapper"]} ref={ref}>
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                content={
                    <div className={styles["tooltip-popover-content"]}>
                        {blockList.map((ele) => (
                            <Tooltip key={ele.id} title={ele.description}>
                                <YakitButton
                                    key={ele.id}
                                    size='large'
                                    type='text2'
                                    icon={ele.icon}
                                    onClick={() => onAddContent(ele)}
                                />
                            </Tooltip>
                        ))}
                    </div>
                }
                visible={visibleAdd}
                onVisibleChange={setVisibleAdd}
            >
                <div className={styles["tooltip-popover-btn"]} onMouseDown={onAdd}>
                    <OutlinePlusIcon />
                </div>
            </YakitPopover>
        </div>
    )
}
