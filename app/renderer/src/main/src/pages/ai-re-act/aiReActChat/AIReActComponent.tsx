import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import styles from "./AIReActChat.module.scss"
import {SolidStopIcon} from "@/assets/icon/solid"
import React from "react"
import {OutlineChevrondownIcon, OutlineChevronleftIcon} from "@/assets/icon/outline"

export const RoundedStopButton: React.FC<YakitButtonProp> = React.memo((props) => {
    return (
        <YakitButton
            className={styles["rounded-icon-btn"]}
            colors='danger'
            icon={<SolidStopIcon className={styles["stop-icon"]} />}
            {...props}
        />
    )
})

export const ChevrondownButton: React.FC<YakitButtonProp> = React.memo((props) => {
    return (
        <YakitButton
            type='outline2'
            className={styles["side-header-btn"]}
            icon={<OutlineChevrondownIcon />}
            size='small'
            {...props}
        />
    )
})

export const ChevronleftButton: React.FC<YakitButtonProp> = React.memo((props) => {
    return <ChevrondownButton icon={<OutlineChevronleftIcon />} {...props} />
})
