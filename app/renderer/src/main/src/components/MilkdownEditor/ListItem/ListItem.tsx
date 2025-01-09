import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import React from "react"
import styles from "./ListItem.module.scss"
import classNames from "classnames"
import {useCreation} from "ahooks"

export const ListItem: React.FC = () => {
    const {node, view, contentRef, setAttrs} = useNodeViewContext()

    const {label, checked, listType} = node.attrs

    const disabled = useCreation(() => {
        return !view.editable
    }, [view.editable])

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
                <YakitCheckbox
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) => onUpdateChecked(e.target.checked)}
                />
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
