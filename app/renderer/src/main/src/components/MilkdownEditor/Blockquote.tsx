import {useNodeViewContext} from "@prosemirror-adapter/react"

export const Blockquote = () => {
    const {contentRef} = useNodeViewContext()

    return (
        <blockquote
            style={{
                borderLeft: "3px solid var(--Colors-Use-Neutral-Border)",
                paddingLeft: 16,
                color: "var(--Colors-Use-Neutral-Text-1-Title)"
            }}
            ref={contentRef}
        />
    )
}
