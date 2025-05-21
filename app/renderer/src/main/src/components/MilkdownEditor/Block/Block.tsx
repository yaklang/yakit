import {BlockProvider} from "@milkdown/kit/plugin/block"
import {useInstance} from "@milkdown/react"
import {useCallback, useEffect, useRef, useState} from "react"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {paragraphSchema} from "@milkdown/kit/preset/commonmark"
import {TextSelection} from "@milkdown/kit/prose/state"
import styles from "./Block.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

import {useMemoizedFn} from "ahooks"
import {Ctx} from "@milkdown/kit/ctx"
import {
    createBlankHeading1,
    createBlankHeading2,
    createBlankHeading3,
    createBlankOrderedList,
    createBlankUnorderedList,
    createBlankTask,
    createBlankCodeBlock,
    createBlankQuote,
    createBlankHighLight,
    uploadFileInMilkdown,
    createDivider
} from "../utils/utils"
import {Tooltip} from "antd"
import {defaultBlockList} from "../constants"
import {cloneDeep} from "lodash"
import {BlockListProps} from "../MilkdownEditorType"
import {HttpUploadImgBaseRequest} from "@/apiUtils/http"
import {useStore} from "@/store"
import {InitEditorHooksLocalProps} from "../utils/initEditor"

const {ipcRenderer} = window.require("electron")

interface BlockViewProps {
    type: HttpUploadImgBaseRequest["type"]
    notepadHash?: string
    localProps?: InitEditorHooksLocalProps
}
export const BlockView: React.FC<BlockViewProps> = (props) => {
    const {notepadHash, type, localProps} = props

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
        if (localProps?.local) {
            setBlockList(defaultBlockList.filter((ele) => ele.label !== "上传文件"))
        }
    }, [localProps])

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
        switch (label) {
            case "一级标题":
                createBlankHeading1(action, view)
                break
            case "二级标题":
                createBlankHeading2(action, view)
                break

            case "三级标题":
                createBlankHeading3(action, view)
                break

            case "有序列表":
                createBlankOrderedList(action, view)
                break

            case "无序列表":
                createBlankUnorderedList(action, view)
                break
            case "任务":
                createBlankTask(action, view)
                break
            case "代码块":
                createBlankCodeBlock(action, view)
                break
            case "引用":
                createBlankQuote(action, view)
                break
            case "高亮":
                createBlankHighLight(action, view)
                break
            case "上传文件":
                uploadFileInMilkdown(action, {
                    type,
                    notepadHash: notepadHash || "",
                    userId: userInfo.user_id || 0
                })

                break
            case "分割线":
                createDivider(action, view)
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
