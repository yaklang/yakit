import React, {useEffect, useRef, useState} from "react"
import {AIFocusModeProps} from "./type"
import {OutlineMicroscopeIcon, OutlineQuestionmarkcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useInViewport, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import {AIChatSelect} from "../aiReviewRuleSelect/AIReviewRuleSelect"
import {AIInputEvent} from "../hooks/grpcApi"
import styles from "./AIFocusMode.module.scss"
import {grpcQueryAIFocus} from "@/pages/ai-agent/grpc"
import {AIFocus} from "@/pages/ai-agent/type/forge"

import i18n from "@/i18n/i18n"
import {Tooltip} from "antd"
import {DefaultOptionType} from "antd/lib/select"

type FocusModeListType = DefaultOptionType & {
    description: string
}

export const AIFocusMode: React.FC<AIFocusModeProps> = React.memo((props) => {
    const lang = i18n.language
    const {value, onChange, className} = props

    const [focusModeList, setFocusModeList] = useState<FocusModeListType[]>([])
    const [focusModeRaw, setFocusModeRaw] = useState<AIFocus[]>([])

    const [open, setOpen] = useState<boolean>(false)
    const ref = useRef<HTMLDivElement>(null)

    const [inViewPort = true] = useInViewport(ref)

    useEffect(() => {
        if (inViewPort) getFocusMode()
    }, [inViewPort])

    useEffect(() => {
        const list = focusModeRaw.map((item) => {
            const description = item.Description.length ? item.Description : "暂无描述"
            const resultVerboseNameZh = item?.VerboseNameZh?.length ? item.VerboseNameZh : item.Name
            return {
                label: lang === "zh" ? resultVerboseNameZh : item.Name,
                value: item.Name,
                description
            }
        })

        setFocusModeList(list)
    }, [focusModeRaw, lang])

    const getFocusMode = useMemoizedFn(() => {
        grpcQueryAIFocus().then((res) => {
            const data = res?.Data || []
            setFocusModeRaw(data)
        })
    })

    const onSelectModel = useMemoizedFn((value: AIInputEvent["FocusModeLoop"]) => {
        onChange(value)
    })

    const onSetOpen = useMemoizedFn((v: boolean) => {
        setOpen(v)
    })
    const onRemove = useMemoizedFn(() => {
        onChange(undefined)
        setOpen(false)
    })

    return (
        <div ref={ref} className={className}>
            <AIChatSelect
                dropdownRender={(menu) => {
                    return (
                        <div className={styles["drop-select-wrapper"]}>
                            <div className={styles["select-title"]}>
                                <OutlineMicroscopeIcon />
                                专注模式
                                <Tooltip title={"复杂场景限定使用框架，限制AI思考范围"}>
                                    <OutlineQuestionmarkcircleIcon />
                                </Tooltip>
                            </div>
                            {menu}
                        </div>
                    )
                }}
                value={
                    value || {
                        label: (
                            <div className={styles["select-option"]}>
                                <OutlineMicroscopeIcon className={styles["icon-wrapper"]} />
                                <span className={styles["select-option-text"]}>请选择</span>
                            </div>
                        ),
                        value: ""
                    }
                }
                // placeholder="请选择"
                onSelect={onSelectModel}
                optionLabelProp='label'
                open={open}
                setOpen={onSetOpen}
                disabled={props.disabled}
            >
                {focusModeList?.map((item) => (
                    <YakitSelect.Option
                        key={item.value}
                        value={item.value}
                        label={
                            <div className={styles["select-option"]}>
                                <OutlineMicroscopeIcon className={styles["icon-wrapper"]} />
                                <span className={styles["select-option-text"]} title={`${item.label}`}>
                                    {item.label}
                                </span>
                                {props.disabled ?? (
                                    <OutlineXIcon className={styles["icon-wrapper"]} onClick={onRemove} />
                                )}
                            </div>
                        }
                    >
                        <Tooltip title={item.description} placement='right'>
                            <div
                                className={classNames(styles["select-option-wrapper"], {
                                    [styles["select-option-active-wrapper"]]: item.value === value
                                })}
                            >
                                <div className={styles["text"]}>{item.label}</div>
                            </div>
                        </Tooltip>
                    </YakitSelect.Option>
                ))}
            </AIChatSelect>
        </div>
    )
})
