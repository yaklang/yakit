import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import React, {useState, useEffect} from "react"

interface CustomCodeComponentProps {
    node: any
}
export const CustomCodeComponent: React.FC<any> = React.memo(() => {
    const {node, view} = useNodeViewContext()
    // 编辑器实例
    const [editor, setEditor] = useState<IMonacoEditor>()
    useEffect(() => {
        if (!editor) return
    }, [editor])
    return (
        <div style={{height: 200}}>
            <YakitEditor type='yak' value={node.textContent} editorDidMount={setEditor} />
        </div>
    )
})
