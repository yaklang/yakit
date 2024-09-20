import React from "react"
import {MilkdownEditor} from "./MilkdownEditor/MilkdownEditor"
import {MilkdownProvider} from "@milkdown/react"
import {ProsemirrorAdapterProvider} from "@prosemirror-adapter/react"

import "@milkdown/theme-nord/style.css"

interface NotepadManageProps {
    pageId: string
}
const ModifyNotepad: React.FC<NotepadManageProps> = React.memo((props) => {
    const onChange = () => {}
    return (
        <MilkdownProvider>
            <ProsemirrorAdapterProvider>
                <MilkdownEditor />
            </ProsemirrorAdapterProvider>
        </MilkdownProvider>
    )
})

export default ModifyNotepad
