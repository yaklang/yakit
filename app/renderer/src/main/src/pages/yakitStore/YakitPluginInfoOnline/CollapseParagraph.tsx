import React, {ReactNode, useState} from "react"
import {Typography} from "antd"
import {ParagraphProps} from "antd/lib/typography/Paragraph"

import "./CollapseParagraph.scss"

const {Paragraph} = Typography

export interface CollapseParagraphProps {
    value: ReactNode
    rows?: number
    isLine?: boolean
    valueConfig?: ParagraphProps
    children?: React.ReactNode
}

export const CollapseParagraph: React.FC<CollapseParagraphProps> = (props) => {
    const {value, rows = 1, isLine, valueConfig, children} = props
    const [key, setKey] = useState(0)
    const [fold, setFold] = useState(true)

    const onExpand = () => setFold(false)

    const onCollapse = () => {
        setFold(true)
        setKey(key + 1)
    }
    return (
        <div key={key}>
            <Paragraph
                ellipsis={{
                    rows: !!isLine ? rows + 2 : rows,
                    expandable: true,
                    onExpand: onExpand,
                    symbol: !!isLine ? <div className='collapse-paragraph-expand-btn'>展开</div> : "展开"
                }}
                {...valueConfig}
                className="paragraph"
            >
                {children}
                {value}
                {!!isLine && !fold && (
                    <div className='collapse-paragraph-collapse-btn' onClick={onCollapse}>
                        收起
                    </div>
                )}
                {!isLine && !fold && (
                    <span className='collapse-paragraph-collapse-btn' onClick={onCollapse}>
                        收起
                    </span>
                )}
            </Paragraph>
        </div>
    )
}
