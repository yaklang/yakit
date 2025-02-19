import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {IMonacoEditor} from "@/utils/editors"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import React, {useState, useEffect, useRef} from "react"
import {TextSelection} from "@milkdown/kit/prose/state"

interface CustomImageBlock {}
export const CustomImageBlock: React.FC<CustomImageBlock> = () => {
    const {node, view, getPos, contentRef} = useNodeViewContext()

    useEffect(() => {
        console.log("CustomImageBlock-node", node)
    }, [node])

    return <img style={{padding: 4, borderRadius: 4}} {...node.attrs} ref={contentRef} />
}
