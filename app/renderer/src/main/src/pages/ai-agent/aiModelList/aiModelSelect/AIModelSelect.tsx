import React, {useEffect, useState} from "react"
import {AIModelSelectProps} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {getAIModelList} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelListResponse} from "../../type/aiChat"
import {AIOnlineModelIconMap} from "../../defaultConstant"
import {OutlineAtomIconByStatus} from "../AIModelList"
import useAIAgentStore from "../../useContext/useStore"
import {AIChatSelect} from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    const {disabled} = props
    //#region AI model
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()
    const [aiModelOptions, setAIModelOptions] = useState<GetAIModelListResponse>({
        onlineModels: [],
        localModels: []
    })
    useEffect(() => {
        getAIModelListOption()
    }, [])
    const getAIModelListOption = useDebounceFn(
        () => {
            getAIModelList().then((res) => {
                setAIModelOptions(res)
                onInitValue(res)
            })
        },
        {wait: 200, leading: true}
    ).run

    const onInitValue = useMemoizedFn((res) => {
        if (!setting?.AIService) {
            if (res && res.onlineModels.length > 0) {
                onSelectModel((res.onlineModels[0].Type as string) || "")
            } else if (res && res.localModels.length > 0) {
                onSelectModel((res.localModels[0].Name as string) || "")
            }
        }
    })

    const onSelectModel = useMemoizedFn((value: string) => {
        setSetting && setSetting((old) => ({...old, AIService: value}))
    })

    const modelValue = useCreation(() => {
        return setting?.AIService || ""
    }, [setting?.AIService])

    const isHaveData = useCreation(() => {
        return aiModelOptions.onlineModels.length > 0 || aiModelOptions.localModels.length > 0
    }, [aiModelOptions.onlineModels.length, aiModelOptions.localModels.length])

    //#endregion
    return isHaveData ? (
        <AIChatSelect
            disabled={disabled}
            value={modelValue}
            onSelect={onSelectModel}
            dropdownRender={(menu, setOpen) => {
                return (
                    <div className={styles["drop-select-wrapper"]} onMouseLeave={() => setOpen(false)}>
                        <div className={styles["select-title"]}>AI 模型选择</div>
                        {menu}
                    </div>
                )
            }}
            getList={getAIModelListOption}
        >
            {aiModelOptions.onlineModels.length > 0 && (
                <YakitSelect.OptGroup key='线上' label='线上'>
                    {aiModelOptions.onlineModels.map((nodeItem) => (
                        <YakitSelect.Option key={nodeItem.Type} value={nodeItem.Type}>
                            <div className={classNames(styles["select-option-wrapper"])}>
                                {AIOnlineModelIconMap[nodeItem.Type]}
                                <div className={styles["option-text"]}>{nodeItem.Type}</div>
                            </div>
                        </YakitSelect.Option>
                    ))}
                </YakitSelect.OptGroup>
            )}
            {aiModelOptions.localModels.length > 0 && (
                <YakitSelect.OptGroup key='本地' label='本地'>
                    {aiModelOptions.localModels.map((nodeItem) => (
                        <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
                            <div className={styles["select-option-wrapper"]}>
                                <OutlineAtomIconByStatus isRunning={true} iconClassName={styles["icon-small"]} />
                                <div className={styles["option-text"]}>{nodeItem.Name}</div>
                            </div>
                        </YakitSelect.Option>
                    ))}
                </YakitSelect.OptGroup>
            )}
        </AIChatSelect>
    ) : (
        <></>
    )
})
