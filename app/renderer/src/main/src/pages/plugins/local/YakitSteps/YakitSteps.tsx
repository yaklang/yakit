import React, {useEffect} from "react"
import {YakitStepProps, YakitStepsProps} from "./YakitStepsType"
import styles from "./YakitSteps.module.scss"
import {Steps} from "antd"

import classNames from "classnames"

const {Step} = Steps
/** YakitSteps/YakitStep 目前只有插件商店的批量上传时使用，暂时没打算作为公共组件，后续有需求再议 */
const YakitSteps: React.FC<YakitStepsProps> = React.memo((props) => {
    useEffect(() => {}, [])
    return (
        <Steps {...props} size='small' className={classNames(styles["yakit-steps"], props.className)}>
            {props.children}
        </Steps>
    )
})

const YakitStep: React.FC<YakitStepProps> = React.memo((props) => {
    return <Step {...props} className={classNames(styles["yakit-step"], props.className)} />
})

export default Object.assign(YakitSteps, {YakitStep})
