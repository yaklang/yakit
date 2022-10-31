import React from "react"
import {ReverseLinkSvgIcon, ReverseUnlinkSvgIcon} from "./icons"
import classnames from "classnames"
import styles from "./globalReverseState.module.scss"

export interface GlobalReverseStateProp {}

export const GlobalReverseState: React.FC<GlobalReverseStateProp> = React.memo((props) => {
    return (
        <div className={classnames(styles["global-reserver-state-wrapper"], styles["link-state"])}>
            <ReverseLinkSvgIcon />
            {/* <ReverseUnlinkSvgIcon /> */}
        </div>
    )
})
