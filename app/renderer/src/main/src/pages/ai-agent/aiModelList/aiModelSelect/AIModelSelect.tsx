import React, {useEffect, useRef, useState} from "react"
import {AIModelSelectProps} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useClickAway, useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {getAIModelList} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelListResponse} from "../../type/aiChat"
import {AIOnlineModelIconMap} from "../../defaultConstant"
import {OutlineAtomIconByStatus} from "../AIModelList"

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    const {disabled} = props
    //#region AI model
    const {setAIActiveAIModel, getAIActiveAIModel} = useAIAgentDispatcher()
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
    const getAIModelListOption = useMemoizedFn(() => {
        getAIModelList().then((res) => {
            if (res && res.onlineModels.length > 0) {
                setAIActiveAIModel((res.onlineModels[0].Type as string) || "")
            } else if (res && res.localModels.length > 0) {
                setAIActiveAIModel((res.localModels[0].Name as string) || "")
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
            ref={selectWrapperRef}
            className={classNames(styles["ai-model-select-wrapper"])}
            onMouseEnter={() => setOpen(true)}
        >
            <YakitSelect
                disabled={disabled}
                value={getAIActiveAIModel()}
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
    )
})
