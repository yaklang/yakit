import React from "react"
import {Milkdown, MilkdownProvider} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"
import useInitEditorHooks from "@/components/MilkdownEditor/utils/initEditor"
import {LocalMilkdownProps, MilkdownEditorLocalProps} from "./MilkdownEditorLocalType"

const LocalMilkdown: React.FC<LocalMilkdownProps> = React.memo((props, ref) => {
    const {get, loading} = useInitEditorHooks({
        ...props,
        localProps: {
            local: true,
            upload: (path) => {}
        }
    })

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
