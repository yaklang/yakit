import React, {useEffect, useState} from "react"
import {AIModelSelectProps} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {getAIModelList} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    const {disabled, radius} = props
    //#region AI model
    const {setAIActiveAIModel, getAIActiveAIModel} = useAIAgentDispatcher()
    const [aiModelOptions, setAIModelOptions] = useState<YakitSelectProps["options"]>([])
    useEffect(() => {
        getAIModelListOption()
    }, [])
    const getAIModelListOption = useMemoizedFn(() => {
        getAIModelList().then((res) => {
            if (res && res.length > 0) {
                setAIActiveAIModel((res[0].value as string) || "")
            }
            setAIModelOptions(res)
        })
    })

    const onSelectModel = useMemoizedFn((value: string) => {
        setAIActiveAIModel(value)
    })

    //#endregion
    return (
        <div
            className={classNames({
                [styles["ai-model-select-wrapper-radius"]]: !!radius
            })}
        >
            <YakitSelect
                disabled={disabled}
                options={aiModelOptions}
                value={getAIActiveAIModel()}
                onSelect={onSelectModel}
            />
        </div>
    )
})
