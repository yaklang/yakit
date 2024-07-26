import React from "react"
import classNames from "classnames"
import styles from "./RightAuditDetail.module.scss"

interface RightSideBarProps {}

export const RightAuditDetail: React.FC<RightSideBarProps> = (props) => {
    const {} = props

    return <div className={classNames(styles["right-audit-detail"])}>RightAuditDetail</div>
}
