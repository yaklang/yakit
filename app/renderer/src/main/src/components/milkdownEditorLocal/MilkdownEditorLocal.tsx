import React, {useEffect} from "react"
import {Milkdown, MilkdownProvider} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"
import useInitEditorHooks, {InitEditorHooksLocalProps} from "@/components/MilkdownEditor/utils/initEditor"
import {LocalMilkdownProps, MilkdownEditorLocalProps} from "./MilkdownEditorLocalType"
import {getMarkdown} from "@milkdown/kit/utils"
import {useCreation} from "ahooks"

const LocalMilkdown: React.FC<LocalMilkdownProps> = React.memo((props, ref) => {
    const {setEditor, onSaveContentBeforeDestroy, line} = props
    //#region 编辑器初始
    const localParams: InitEditorHooksLocalProps = useCreation(() => {
        return {
            local: true,
            upload: (path) => {}
        }
    }, [])
    const {get, loading, jumpToFifthLine} = useInitEditorHooks({
        ...props,
        localProps: localParams
    })
    /**更新最新的editor */
    useEffect(() => {
        if (loading) return
        const editor = get()
        if (editor) {
            if (setEditor) setEditor(editor)
        }
    }, [loading, get])
    useEffect(() => {
        return () => {
            const value = get()?.action(getMarkdown()) || ""
            onSaveContentBeforeDestroy && onSaveContentBeforeDestroy(value)
        }
    }, [])
    //#endregion
    useEffect(() => {
        if (line) jumpToFifthLine(line)
    }, [line])
    return (
        <div>
            <Milkdown />
        </div>
    )
})
export const MilkdownEditorLocal: React.FC<MilkdownEditorLocalProps> = React.memo(
    React.forwardRef((props, ref) => {
        return (
            <MilkdownProvider>
                <ProsemirrorAdapterProvider>
                    <LocalMilkdown {...props} />
                </ProsemirrorAdapterProvider>
            </MilkdownProvider>
        )
    })
)
