import React, {useRef, useEffect} from "react"
import {Divider} from "antd"
import "./style.css"

export interface VariabelLengthViewProp {
    isVertical?: Boolean
    leftNode: React.ReactNode
    rightNode: React.ReactNode
}

export const VariabelLengthView: React.FC<VariabelLengthViewProp> = (props) => {
    const contentRef = useRef(null)
    const leftNodeRef = useRef(null)
    const rightNodeRef = useRef(null)
    const resizeNodeRef = useRef(null)

    const drag = () => {
        if (!contentRef || !contentRef?.current) return

        if (!leftNodeRef || !leftNodeRef?.current) return

        if (!rightNodeRef || !rightNodeRef?.current) return

        if (!resizeNodeRef || !resizeNodeRef?.current) return

        const content = contentRef.current as unknown as HTMLDivElement
        const left = leftNodeRef.current as unknown as HTMLDivElement
        const right = rightNodeRef.current as unknown as HTMLDivElement
        const resize = resizeNodeRef.current as unknown as HTMLDivElement

        // 点击鼠标时的监听事件
        resize.onmousedown = (e) => {
            const firstX = e.clientX
            const firstY = e.clientY
            const width = right.offsetWidth
            const height = right.offsetHeight
            const contentHeight = content.offsetHeight

            document.onmousemove = (event) => {
                if (!!props.isVertical) {
                    left.style.height = `${
                        contentHeight - height + (event.clientY - firstY) - 10
                    }px`
                    right.style.height = `${height - (event.clientY - firstY)}px`
                } else {
                    left.style.width = `${
                        content.offsetWidth - width + (event.clientX - firstX) - 10
                    }px`
                    right.style.width = `${width - (event.clientX - firstX)}px`
                }
            }
            // 松开鼠标时解除监听事件
            content.onmouseup = () => {
                document.onmousemove = null
            }
            return false
        }
    }

    useEffect(() => {
        setTimeout(() => {
            drag()
        }, 300)
    }, [props.isVertical])

    return !!props.isVertical ? (
        <div className='vertical-content' ref={contentRef} style={{marginLeft: 0, marginRight: 0}}>
            <div className='left' ref={leftNodeRef}>
                {props.leftNode}
            </div>
            <div className='resize' ref={resizeNodeRef}>
                <Divider style={{height: "100%", margin: 0}} type='horizontal'/>
            </div>
            <div className='right' ref={rightNodeRef}>
                {props.rightNode}
            </div>
        </div>
    ) : (
        <div className='horizontal-content' ref={contentRef} style={{marginLeft: 0, marginRight: 0}}>
            <div className='left' ref={leftNodeRef}>
                {props.leftNode}
            </div>
            <div className='resize' ref={resizeNodeRef}>
                <Divider style={{height: "100%", margin: 0}} type='vertical'/>
            </div>
            <div className='right' ref={rightNodeRef}>
                {props.rightNode}
            </div>
        </div>
    )
}
