import {useNodeViewContext} from "@prosemirror-adapter/react"

export const Blockquote = () => {
    const {contentRef} = useNodeViewContext()

    return (
        <blockquote
            style={{borderLeft: "3px solid var(--yakit-border-color)", paddingLeft: 16, color: "var(--yakit-body-text-color)"}}
            ref={contentRef}
        />
    )
}
