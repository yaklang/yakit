import React, {useMemo, useEffect, useRef, useState} from "react"
import {Tag, TagProps, Tooltip} from "antd"
import {useGetState} from "ahooks"

import "./BaseTags.scss"
import classNames from "classnames"
import styles from "./BaswButton.module.scss"
export interface TagsListProps extends TagProps {
    data: string[]
    ellipsis?: boolean
    className?: string
    size?: "big" | "small"
}

// Tags展示组件
export const TagsList: React.FC<TagsListProps> = React.memo((props) => {
    const {data, ellipsis, className, size, ...otherProps} = props
    const tagListRef = useRef<any>(null)
    const tagEllipsis = useRef<any>(null)
    // 展示数据源
    const [dataSource, setDataSource] = useState<string[]>([])
    // 省略后隐藏项
    const [ellipsisTags, setEllipsisTags, getEllipsisTags] = useGetState<string[]>([])
    useEffect(() => {
        // 省略模式 动态计算
        if (ellipsis) {
            const {current} = tagListRef
            const boxWidth = current.offsetWidth
            const ellipsisWidth = tagEllipsis.current.offsetWidth
            let countWidth = 0 //计算当前宽度
            const lastItem = current.children.length - 1 // 最后一项Index
            const itemMargin = 8 //每一项的magin
            // ps: for循环不计入最后...扩展项
            let showTagsArr: string[] = []
            let ellipsisTagsArr: string[] = []
            for (let i = 0; i <= lastItem; i++) {
                // 当前项完整宽度(包含margin)
                let nowItemWidth = current.children[i].offsetWidth + itemMargin
                // 计算当前项后宽度
                let nowWidth = countWidth + nowItemWidth
                // 如不是最后一项,则添加...宽度计算
                if (i < lastItem && nowWidth + ellipsisWidth < boxWidth) {
                    countWidth += nowItemWidth
                    showTagsArr = [...showTagsArr, data[i]]
                } else if (i === lastItem && nowWidth < boxWidth) {
                    countWidth += nowItemWidth
                    showTagsArr = [...showTagsArr, data[i]]
                } else {
                    ellipsisTagsArr = [...ellipsisTagsArr, data[i]]
                }
            }
            setDataSource(showTagsArr)
            setEllipsisTags(ellipsisTagsArr)
        } else {
            setDataSource(data)
        }
    }, [data])

    const sizeClass = useMemo(() => {
        if (!size) return "base-tags-size"
        if (size === "big") return "base-tags-big-size"
        if (size === "small") return "base-tags-small-size"
        return "base-tags-size"
    }, [size])

    const tooltipStr = ellipsis && ellipsisTags.join("，")
    return (
        <div className={styles["base-tags-list"]}>
            {/* 隐藏DOM元素 用于实时计算 */}
            <div style={{overflow: "hidden", height: 0}} ref={tagListRef}>
                {data.map((item) => (
                    <Tag
                        className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                            [styles[className || ""]]: !!className
                        })}
                        key={item}
                        {...otherProps}
                    >
                        {item}
                    </Tag>
                ))}
            </div>
            <div
                style={{overflow: "hidden", display: "inline-block", position: "absolute", height: 0}}
                ref={tagEllipsis}
            >
                <Tag
                    className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                        [styles[className || ""]]: !!className
                    })}
                    {...otherProps}
                >
                    ...
                </Tag>
            </div>
            {dataSource.map((item) => (
                <Tag
                    className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                        [styles[className || ""]]: !!className
                    })}
                    key={item}
                    {...otherProps}
                >
                    {item}
                </Tag>
            ))}
            {ellipsis && ellipsisTags.length > 0 && (
                <Tooltip title={tooltipStr}>
                    <Tag
                        className={classNames(styles[sizeClass], styles["base-tags-list-tag"], {
                            [styles[className || ""]]: !!className
                        })}
                        {...otherProps}
                    >
                        ...
                    </Tag>
                </Tooltip>
            )}
        </div>
    )
})
