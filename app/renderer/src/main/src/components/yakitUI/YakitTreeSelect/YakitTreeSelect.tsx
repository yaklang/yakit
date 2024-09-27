import React from "react"
import TreeSelect, {TreeSelectProps} from "antd/lib/tree-select"
import classNames from "classnames"
import styles from "./YakitTreeSelect.module.scss"
import {OutlineChevrondownIcon} from "@/assets/icon/outline"

export interface YakitTreeSelectProp extends TreeSelectProps {
    wrapperClassName?: string
}
export const YakitTreeSelect: React.FC<YakitTreeSelectProp> = (props) => {
    const {wrapperClassName, dropdownClassName, ...resetProps} = props

    return (
        <div className={classNames(styles["yakit-tree-select-wrapper"], wrapperClassName)}>
            <TreeSelect
                dropdownClassName={classNames(styles["yakit-tree-select-dropdown"], dropdownClassName)}
                switcherIcon={<OutlineChevrondownIcon className={styles["yakit-tree-select-switcher-icon"]} />}
                {...resetProps}
            ></TreeSelect>
        </div>
    )
}
