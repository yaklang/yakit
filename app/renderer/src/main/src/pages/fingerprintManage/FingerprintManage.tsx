import React from "react"
import style from "./FingerprintManage.module.scss"

interface FingerprintManageProp {}
const FingerprintManage: React.FC<FingerprintManageProp> = (props) => {
    return <div className={style["fingerprintManage"]}>指纹管理</div>
}
export default FingerprintManage
