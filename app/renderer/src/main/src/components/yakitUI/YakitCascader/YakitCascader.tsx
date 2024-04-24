import React from "react"
import {Cascader, CascaderProps} from "antd"
import styles from "./YakitCascader.module.scss"
import classNames from "classnames"

const YakitCascader: React.FC<CascaderProps<any>> = React.memo((props) => {
    return (
        <div className={styles['yakit-cascader']}>
            <Cascader {...props} />
        </div>
    )
})

export default YakitCascader
