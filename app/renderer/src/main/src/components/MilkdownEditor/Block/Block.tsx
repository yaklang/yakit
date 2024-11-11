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
import {OutlineLightbulbIcon, OutlinePaperclipIcon, OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {
    IconHeading1,
    IconHeading2,
    IconHeading3,
    IconListOrdered,
    IconList,
    IconCheckSquare,
    IconCurlyBraces,
    IconQuote,
    IconFlipVertical
} from "../icon/icon"
import {useMemoizedFn} from "ahooks"
import {Ctx} from "@milkdown/kit/ctx"
import {alterCustomSchema} from "../utils/alertPlugin"
import {clearContentAndAddBlockType, clearContentAndSetBlockType, clearContentAndWrapInBlockType} from "../utils/utils"
import {fileCommand} from "../utils/uploadPlugin"
import {callCommand} from "@milkdown/kit/utils"
import {insertImageBlockCommand} from "../utils/imageBlock"
import {Tooltip} from "antd"

const {ipcRenderer} = window.require("electron")

const imgTypes = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg"]

const addList = [
    {
        id: 1,
        icon: <IconHeading1 />,
        label: "一级标题",
        description: "一级标题: #空格"
    },
    {
        id: 2,
        icon: <IconHeading2 />,
        label: "二级标题",
        description: "二级标题: ##空格"
    },
    {
        id: 3,
        icon: <IconHeading3 />,
        label: "三级标题",
        description: "二级标题: ###空格"
    },
    {
        id: 4,
        icon: <IconListOrdered />,
        label: "有序列表",
        description: "有序列表: 1.空格"
    },
    {
        id: 5,
        icon: <IconList />,
        label: "无序列表",
        description: "无序列表: -空格或*空格"
    },
    {
        id: 6,
        icon: <IconCheckSquare />,
        label: "任务",
        description: "任务"
    },
    {
        id: 7,
        icon: <IconCurlyBraces />,
        label: "代码块",
        description: "代码块:```空格"
    },
    {
        id: 8,
        icon: <IconQuote />,
        label: "引用",
        description: "引用: >空格"
    },
    {
        id: 9,
        icon: <OutlineLightbulbIcon />,
        label: "高亮",
        description: "高亮: :::success空格"
    },
    {
        id: 10,
        icon: <OutlinePaperclipIcon />,
        label: "上传文件",
        description: "上传文件"
    },
    {
        id: 11,
        icon: <IconFlipVertical />,
        label: "分割线",
        description: "引用: ***"
    }
]

export const BlockView = (block) => {
    const ref = useRef<HTMLDivElement>(null)
    const tooltipProvider = useRef<BlockProvider>()

    const [visibleAdd, setVisibleAdd] = useState(false)

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

        tooltipProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
        })
        tooltipProvider.current?.update()

        return () => {
            tooltipProvider.current?.destroy()
        }
    }, [loading, get, ref.current])

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
                            const index = path.lastIndexOf(".")
                            const fileType = path.substring(index, path.length)
                            if (imgTypes.includes(fileType)) {
                                action(
                                    callCommand(insertImageBlockCommand.key, {
                                        src: `atom://${path}`,
                                        alt: path,
                                        title: ""
                                    })
                                )
                            } else {
                                action(callCommand(fileCommand.key, {id: "0", path}))
                            }
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
        tooltipProvider.current?.hide()
    })
    const onAdd = (e) => {
        e.preventDefault()
        e.stopPropagation()
        const editor = get()
        if (!editor) return
        if (!view.hasFocus()) view.focus()
        const {state, dispatch} = view
        const active = tooltipProvider.current?.active
        if (!active) return
        const $pos = active.$pos
        const pos = $pos.pos + active.node.nodeSize
        let tr = state.tr.insert(pos, paragraphSchema.type(editor.ctx).create())
        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(pos)))
        dispatch(tr.scrollIntoView())
        tooltipProvider.current?.hide()
    }
    return (
        <div
            className={styles["block-wrapper"]}
            ref={ref}
            onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
            }}
        >
            <YakitPopover
                overlayClassName={styles["tooltip-popover"]}
                placement='bottomLeft'
                content={
                    <div className={styles["tooltip-popover-content"]}>
                        {addList.map((ele) => (
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
