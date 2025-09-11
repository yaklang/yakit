import React, {useEffect, useRef, useState} from "react"
import {AIModelSelectProps} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useClickAway, useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {getAIModelList} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelListResponse} from "../../type/aiChat"
import {AIOnlineModelIconMap} from "../../defaultConstant"
import {OutlineAtomIconByStatus} from "../AIModelList"
import useAIAgentStore from "../../useContext/useStore"

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    const {disabled} = props
    //#region AI model
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()
    const [open, setOpen] = useState<boolean>(false)
    const [aiModelOptions, setAIModelOptions] = useState<GetAIModelListResponse>({
        onlineModels: [],
        localModels: []
    })
    const selectWrapperRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        getAIModelListOption()
    }, [])
    useClickAway(() => {
        setOpen(false)
    }, [selectWrapperRef])
    const getAIModelListOption = useDebounceFn(
        () => {
            getAIModelList().then((res) => {
                setAIModelOptions(res)
                if (!setting?.AIService) {
                    if (res && res.onlineModels.length > 0) {
                        onSelectModel((res.onlineModels[0].Type as string) || "")
                    } else if (res && res.localModels.length > 0) {
                        onSelectModel((res.localModels[0].Name as string) || "")
                    }
                }
            })
        },
        {wait: 200, leading: true}
    ).run

    const onSelectModel = useMemoizedFn((value: string) => {
        setSetting && setSetting((old) => ({...old, AIService: value}))
    })

    const onMouseEnter = useMemoizedFn((e) => {
        setOpen(true)
        getAIModelListOption()
    })

    const modelValue = useCreation(() => {
        return setting?.AIService || ""
    }, [setting])

    const isHaveData = useCreation(() => {
        return aiModelOptions.onlineModels.length > 0 || aiModelOptions.localModels.length > 0
    }, [aiModelOptions.onlineModels.length, aiModelOptions.localModels.length])

    //#endregion
    return isHaveData ? (
        <div
            ref={selectWrapperRef}
            className={classNames(styles["ai-model-select-wrapper"])}
            onMouseEnter={onMouseEnter}
        >
            <YakitSelect
                disabled={disabled}
                value={modelValue}
                onSelect={onSelectModel}
                dropdownMatchSelectWidth={false}
                dropdownRender={(menu) => {
                    return (
                        <div className={styles["drop-select-wrapper"]} onMouseLeave={() => setOpen(false)}>
                            <div className={styles["select-title"]}>AI 模型选择</div>
                            {menu}
                        </div>
                    )
                }}
                bordered={false}
                open={open}
                size='small'
            >
                {aiModelOptions.onlineModels.length > 0 && (
                    <YakitSelect.OptGroup key='线上' label='线上'>
                        {aiModelOptions.onlineModels.map((nodeItem) => (
                            <YakitSelect.Option key={nodeItem.Type} value={nodeItem.Type}>
                                <div
                                    className={classNames(
                                        styles["select-option-wrapper"],
                                        styles["select-option-online-wrapper"]
                                    )}
                                >
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
            </YakitSelect>
        </div>
    ) : (
        <></>
    )
})
