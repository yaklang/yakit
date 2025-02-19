import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useEffect} from "react"

export const Blockquote = () => {
    const {node, contentRef} = useNodeViewContext()
    useEffect(() => {
        console.log("Blockquote-node", node)
    }, [node])
    return (
        <blockquote
            style={{
                borderLeft: "3px solid var(--yakit-border-color)",
                paddingLeft: 16,
                color: "var(--yakit-body-text-color)"
            }}
            ref={contentRef}
        />
    )
}
