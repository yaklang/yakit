import {Drawer} from "antd"
import React from "react"
import {MITMRuleProp} from "./MITMRuleType"
import styles from "./MITMRule.module.scss"
import {MITMContentReplacerViewer} from "../MITMContentReplacerViewer"

export const MITMRule: React.FC<MITMRuleProp> = (props) => {
    const {visible, setVisible, getContainer} = props
    return (
        <Drawer
            placement='bottom'
            closable={false}
            onClose={() => setVisible(false)}
            visible={visible}
            getContainer={getContainer}
            mask={false}
            style={{position: "absolute"}}
            height='100%'
            className={styles["mitm-rule-drawer"]}
        >
            <div onClick={() => setVisible(false)}>x</div>
        </Drawer>
    )
}
