import React from "react"
import {MilkdownEditor} from "@/components/MilkdownEditor/MilkdownEditor"

interface NotepadManageProps {
    pageId: string
}
const ModifyNotepad: React.FC<NotepadManageProps> = React.memo((props) => {
    const onChange = () => {}
    return <MilkdownEditor />
})

export default ModifyNotepad
