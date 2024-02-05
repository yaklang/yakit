import React, {memo, ReactNode, useMemo} from "react"
import styles from "./PluginListWrap.module.scss"
import {Tooltip} from "antd"
import {OutlineViewgridIcon, OutlineViewlistIcon} from "@/assets/icon/outline"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"

interface PluginListWrapProps {
    /** 全选框状态 */
    checked: boolean
    /** 设置全选框 */
    onCheck: (value: boolean) => void
    /** 列表名字 */
    title: string
    /** 插件总数 */
    total: number
    /** 已勾选插件数量 */
    selected: number
    /** 插件展示(列表|网格) */
    isList: boolean
    /** 设置插件展示(列表|网格) */
    setIsList: (value: boolean) => void
    /** 表头拓展元素 */
    extraHeader?: ReactNode
    children: ReactNode
}

export const PluginListWrap: React.FC<PluginListWrapProps> = memo((props) => {
    const {checked, onCheck, title, total, selected, children, isList, setIsList, extraHeader} = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    return (
        <div className={styles["plugin-list-wrapper"]}>
            <div className={styles["plugin-list-header"]}>
                <div className={styles["plugin-list-header-left"]}>
                    <div className={styles["plugin-list-header-left-title"]}>{title}</div>
                    <div className={styles["body-check"]}>
                        <YakitCheckbox
                            indeterminate={checkIndeterminate}
                            checked={checked}
                            onChange={(e) => onCheck(e.target.checked)}
                        />
                        全选
                    </div>
                    <div className={styles["body-total-selected"]}>
                        <div>
                            Total <span className={styles["num-style"]}>{+total || 0}</span>
                        </div>
                        <div className={styles["divider-style"]} />
                        <div>
                            Selected <span className={styles["num-style"]}>{+selected || 0}</span>
                        </div>
                    </div>
                </div>
                <div className={styles["plugin-list-header-right"]}>
                    <div className={styles["header-extra"]}>
                        {extraHeader || null}
                        <Tooltip
                            className='plugins-tooltip'
                            placement='topRight'
                            title={isList ? "切换至宫格视图" : "切换至列表视图"}
                        >
                            <div className={styles["is-list-btn"]} onClick={() => setIsList(!isList)}>
                                {isList ? <OutlineViewgridIcon /> : <OutlineViewlistIcon />}
                            </div>
                        </Tooltip>
                    </div>
                </div>
            </div>
            <div className={styles["plugin-list-body"]}>{children}</div>
        </div>
    )
})
