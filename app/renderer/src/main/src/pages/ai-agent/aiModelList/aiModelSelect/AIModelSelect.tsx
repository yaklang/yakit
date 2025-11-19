import React, {useEffect, useState} from "react"
import {AIModelItemProps, AIModelSelectProps} from "./AIModelSelectType"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import useAIAgentDispatcher from "../../useContext/useDispatcher"
import {getAIModelList} from "../utils"
import styles from "./AIModelSelect.module.scss"
import classNames from "classnames"
import {GetAIModelListResponse} from "../../type/aiModel"
import {AIAgentSettingDefault, AIOnlineModelIconMap} from "../../defaultConstant"
import {OutlineAtomIconByStatus, setAIModal} from "../AIModelList"
import useAIAgentStore from "../../useContext/useStore"
import {AIChatSelect} from "@/pages/ai-re-act/aiReviewRuleSelect/AIReviewRuleSelect"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {apiGetGlobalNetworkConfig} from "@/pages/spaceEngine/utils"
import {AIInputEventSyncTypeEnum} from "@/pages/ai-re-act/hooks/defaultConstant"

export const AIModelSelect: React.FC<AIModelSelectProps> = React.memo((props) => {
    //#region AI model
    const {setting} = useAIAgentStore()
    const {setSetting} = useAIAgentDispatcher()
    const {chatIPCData} = useChatIPCStore()
    const {handleSendSyncMessage} = useChatIPCDispatcher()
    const [aiModelOptions, setAIModelOptions] = useState<GetAIModelListResponse>({
        onlineModels: [],
        localModels: []
    })
    const [open, setOpen] = useState<boolean>(false)
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

    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)
        if (!v && chatIPCData.execute) {
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_UPDATE_CONFIG,
                params: {
                    AIService: modelValue
                }
            })
        }
    })

    const modelValue = useCreation(() => {
        return setting?.AIService || AIAgentSettingDefault.AIService
    }, [setting?.AIService])

    const isHaveData = useCreation(() => {
        return aiModelOptions.onlineModels.length > 0 || aiModelOptions.localModels.length > 0
    }, [aiModelOptions.onlineModels.length, aiModelOptions.localModels.length])

    //#endregion
    return isHaveData ? (
        <AIChatSelect
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
            open={open}
            setOpen={onSetOpen}
        >
            {aiModelOptions.onlineModels.length > 0 && (
                <YakitSelect.OptGroup key='线上' label='线上'>
                    {aiModelOptions.onlineModels.map((nodeItem) => (
                        <YakitSelect.Option key={nodeItem.Type} value={nodeItem.Type}>
                            <AIModelItem value={nodeItem.Type} />
                        </YakitSelect.Option>
                    ))}
                </YakitSelect.OptGroup>
            )}
            {aiModelOptions.localModels.length > 0 && (
                <YakitSelect.OptGroup key='本地' label='本地'>
                    {aiModelOptions.localModels.map((nodeItem) => (
                        <YakitSelect.Option key={nodeItem.Name} value={nodeItem.Name}>
                            <AIModelItem value={nodeItem.Name} />
                        </YakitSelect.Option>
                    ))}
                </YakitSelect.OptGroup>
            )}
        </AIChatSelect>
    ) : (
        <></>
    )
})

export const AIModelItem: React.FC<AIModelItemProps> = React.memo((props) => {
    const {value} = props
    const icon = useCreation(() => {
        return (
            AIOnlineModelIconMap[value] || (
                <OutlineAtomIconByStatus isRunning={true} iconClassName={styles["icon-small"]} />
            )
        )
    }, [value])
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        apiGetGlobalNetworkConfig().then((obj) => {
            const item = obj.AppConfigs.find((it) => it.Type === value)
            setAIModal({
                config: obj,
                item,
                onSuccess: () => {}
            })
        })
    })
    return (
        <div className={classNames(styles["select-option-wrapper"])}>
            {icon}
            <div className={styles["option-text"]}>{value}</div>
            <OutlinePencilaltIcon className={styles["icon-pencilalt"]} onClick={onEdit} />
        </div>
    )
})
