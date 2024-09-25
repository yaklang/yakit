import {BlockProvider} from "@milkdown/kit/plugin/block"
import {useInstance} from "@milkdown/react"
import {useEffect, useRef} from "react"
import {editorViewCtx} from "@milkdown/kit/core"
import {usePluginViewContext} from "@prosemirror-adapter/react"
import {paragraphSchema} from "@milkdown/kit/preset/commonmark"
import {TextSelection} from "@milkdown/kit/prose/state"
import {$ctx} from "@milkdown/kit/utils"

export interface MenuAPI {
    show: (pos: number) => void
    hide: () => void
}

export const menuAPI = $ctx(
    {
        show: () => {},
        hide: () => {}
    } as MenuAPI,
    "menuAPICtx"
)

export const BlockView = () => {
    const ref = useRef<HTMLDivElement>(null)
    const tooltipProvider = useRef<BlockProvider>()

    const {view, prevState} = usePluginViewContext()

    const [loading, get] = useInstance()

    useEffect(() => {
        const div = ref.current
        if (loading || !div) return

        const editor = get()
        if (!editor) return

        tooltipProvider.current = new BlockProvider({
            ctx: editor.ctx,
            content: div
        })
        tooltipProvider.current?.update()

        return () => {
            tooltipProvider.current?.destroy()
        }
    }, [loading])
    const onAdd = () => {
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
        editor.ctx?.get(menuAPI.key).show(tr.selection.from)
    }
    return (
        <div
            ref={ref}
            style={{position: "absolute", width: 60, cursor: "grab"}}
        >
            <div onClick={() => onAdd()}>+添加</div>
            <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={1.5}
                stroke='currentColor'
                style={{width: 24, height: 24}}
            >
                <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z'
                />
            </svg>
        </div>
    )
}
