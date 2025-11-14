import classNames from "classnames"
import React, {useState} from "react"
import {YakitCheckableTagProps} from "./YakitTagType"
import styles from "./YakitTag.module.scss"
import {Tag} from "antd"

const {CheckableTag} = Tag

export const YakitCheckableTag: React.FC<YakitCheckableTagProps> = React.memo((props) => {
    const {wrapClassName, disable, className, ...resProps} = props
    return (
        <div
            className={classNames(
                styles["yakit-checked-tag-wrap"],
                {
                    [styles["yakit-checked-tag-disable"]]: disable,
                    [styles["yakit-checked-tag-checked-disable"]]: disable && props.checked
                },
                wrapClassName
            )}
        >
            <CheckableTag
                {...resProps}
                onClick={(e) => {
                    if (!disable && props.onClick) props.onClick(e)
                }}
                onChange={(c) => {
                    if (!disable && props.onChange) props.onChange(c)
                }}
            >
                {props.children}
            </CheckableTag>
        </div>
    )
})
