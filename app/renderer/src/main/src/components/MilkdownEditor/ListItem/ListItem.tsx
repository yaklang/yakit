import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {ListItemBlockConfig} from "@milkdown/kit/component/list-item-block"
import {Attrs} from "@milkdown/kit/prose/model"
import {useInstance} from "@milkdown/react"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import React, {useEffect} from "react"
import styles from "./ListItem.module.scss"
import classNames from "classnames"

export const ListItem = () => {
    const {node, contentRef, setAttrs} = useNodeViewContext()

    const {label, checked, listType} = node.attrs

    const onUpdateChecked = (val: boolean) => {
        setAttrs({checked: val})
    }

    const render = () => {
        if (checked === null) {
            if (listType === "bullet") {
                return (
                    <div className={styles["bullet-dot-wrapper"]}>
                        <div className={styles["bullet-dot"]} />
                    </div>
                )
            }

            return (
                <div className={styles["label-dot-wrapper"]}>
                    <div className={styles["label"]}>{label}</div>
                </div>
            )
        }

        return (
            <div className={styles["checked-dot-wrapper"]}>
                <YakitCheckbox checked={checked} onChange={(e) => onUpdateChecked(e.target.checked)} />
            </div>
        )
    }
    return (
        <li
            className={classNames(styles["list-item-wrapper"], {
                [styles["list-item-checked-wrapper"]]: checked !== null
            })}
        >
            {render()}
            <div
                className={classNames(styles["list-item"], {
                    [styles["list-item-checked"]]: !!checked
                })}
                ref={contentRef}
            />
        </li>
    )
}
