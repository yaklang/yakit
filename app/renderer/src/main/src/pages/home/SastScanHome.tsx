import React from "react"
import styles from "./SastScanHome.module.scss"
interface SastScanHomeProps {}
const SastScanHome: React.FC<SastScanHomeProps> = (props) => {
    return <div className={styles["sast-scan-home"]}>
        <div className={styles['title']}>代码千万行  安全第一行</div>
    </div>
}

export default SastScanHome
