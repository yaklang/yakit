import {useNodeViewContext} from "@prosemirror-adapter/react"

export const Blockquote = () => {
    const {contentRef} = useNodeViewContext()

    return <blockquote className='bg-amber-50 p-0.5 rounded !border !border-slate-200' ref={contentRef} />
}
