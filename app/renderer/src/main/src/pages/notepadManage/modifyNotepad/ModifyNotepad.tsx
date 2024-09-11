import React from "react"
import {NotepadManageProps} from "./ModifyNotepadType"
// import {Editor, rootCtx} from "@milkdown/kit/core"
// import {nord} from "@milkdown/theme-nord"
// import {Milkdown, MilkdownProvider, useEditor} from "@milkdown/react"
// import {commonmark} from "@milkdown/kit/preset/commonmark"
// import styles from "./ModifyNotepad.module.scss"

const ModifyNotepad: React.FC<NotepadManageProps> = React.memo((props) => {
    return (
        <>
            {/* <MilkdownProvider>
                <MilkdownEditor />
            </MilkdownProvider> */}
        </>
    )
})

export default ModifyNotepad

// const MilkdownEditor: React.FC = () => {
//     const {get} = useEditor((root) =>
//         Editor.make()
//             .config(nord)
//             .config((ctx) => {
//                 ctx.set(rootCtx, root)
//             })
//             .use(commonmark)
//     )

//     return <Milkdown />
// }
