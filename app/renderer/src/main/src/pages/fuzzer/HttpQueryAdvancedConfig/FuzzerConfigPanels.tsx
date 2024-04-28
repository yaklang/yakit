import React from "react"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {Divider, Form} from "antd"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {
    ColorSelect,
    filterModeOptions,
    matchersConditionOptions
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {ExtractorsList, MatchersList} from "./HttpQueryAdvancedConfig"
import {AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"

const {YakitPanel} = YakitCollapse

interface MatchersPanelProps {
    onAddMatchingAndExtractionCard: (type: MatchingAndExtraction) => void
    onEdit: (index: number, type: MatchingAndExtraction) => void
    onSetValue?: (v: AdvancedConfigValueProps) => void
}
export const MatchersPanel: React.FC<MatchersPanelProps> = React.memo((props) => {
    const {onAddMatchingAndExtractionCard, onEdit, onSetValue, ...restProps} = props
    const form = Form.useFormInstance()
    const filterMode = Form.useWatch("filterMode", form)
    const matchersCondition = Form.useWatch("matchersCondition", form)
    const hitColor = Form.useWatch("hitColor", form)
    const matchers = Form.useWatch("matchers", form) || []
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({
            ...restValue
        })
        onChangeValue(restValue)
    })
    const onRemoveMatcher = useMemoizedFn((i) => {
        const newMatchers = matchers.filter((m, n) => n !== i)
        form.setFieldsValue({
            matchers: newMatchers
        })
        onChangeValue(newMatchers)
    })
    /** setFieldsValue不会触发Form onValuesChange，抛出去由外界自行解决 */
    const onChangeValue = useMemoizedFn((restValue) => {
        if (onSetValue) {
            const v = form.getFieldsValue()
            onSetValue({
                ...v,
                ...restValue
            })
        }
    })
    const onEditMatcher = useMemoizedFn((index: number) => {
        onEdit(index, "matchers")
    })
    const matcherValue = useCreation(() => {
        return {
            matchersList: matchers,
            filterMode,
            matchersCondition,
            hitColor
        }
    }, [matchers, filterMode, matchersCondition, hitColor])
    return (
        <>
            <YakitPanel
                {...restProps}
                header={
                    <div className={styles["matchers-panel"]}>
                        匹配器
                        <div className={styles["matchers-number"]}>{matchers?.length}</div>
                    </div>
                }
                key='匹配器'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                const restValue = {
                                    matchers: [],
                                    filterMode: "drop",
                                    hitColor: "red",
                                    matchersCondition: "and"
                                }
                                onReset(restValue)
                            }}
                            size='small'
                        >
                            重置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddMatchingAndExtractionCard("matchers")
                            }}
                            className={styles["btn-padding-right-0"]}
                        >
                            添加/调试
                            <HollowLightningBoltIcon />
                        </YakitButton>
                    </>
                }
                className={styles["panel-wrapper"]}
            >
                <div className={styles["matchers-heard"]}>
                    <div className={styles["matchers-heard-left"]}>
                        <Form.Item name='filterMode' noStyle>
                            <YakitRadioButtons buttonStyle='solid' options={filterModeOptions} size='small' />
                        </Form.Item>
                        {filterMode === "onlyMatch" && (
                            <Form.Item name='hitColor' noStyle>
                                <ColorSelect size='small' />
                            </Form.Item>
                        )}
                    </div>
                    <Form.Item name='matchersCondition' noStyle>
                        <YakitRadioButtons buttonStyle='solid' options={matchersConditionOptions} size='small' />
                    </Form.Item>
                </div>
                <MatchersList
                    matcherValue={matcherValue}
                    onAdd={() => onAddMatchingAndExtractionCard("matchers")}
                    onRemove={onRemoveMatcher}
                    onEdit={onEditMatcher}
                />
            </YakitPanel>
        </>
    )
})

interface ExtractorsPanelProps extends MatchersPanelProps {}
export const ExtractorsPanel: React.FC<ExtractorsPanelProps> = React.memo((props) => {
    const {onAddMatchingAndExtractionCard, onEdit, onSetValue, ...restProps} = props
    const form = Form.useFormInstance()
    const extractors = Form.useWatch("extractors", form) || []
    const onReset = useMemoizedFn((restValue) => {
        form.setFieldsValue({
            ...restValue
        })
        onChangeValue(restValue)
    })
    const onRemoveExtractors = useMemoizedFn((i) => {
        const newExtractors = extractors.filter((m, n) => n !== i)
        form.setFieldsValue({
            extractors: newExtractors
        })
        onChangeValue(newExtractors)
    })
    /** setFieldsValue不会触发Form onValuesChange，抛出去由外界自行解决 */
    const onChangeValue = useMemoizedFn((restValue) => {
        if (onSetValue) {
            const v = form.getFieldsValue()
            onSetValue({
                ...v,
                ...restValue
            })
        }
    })
    const onEditExtractors = useMemoizedFn((index: number) => {
        onEdit(index, "extractors")
    })
    const extractorValue = useCreation(() => {
        return {
            extractorList: extractors
        }
    }, [extractors])
    return (
        <>
            <YakitPanel
                {...restProps}
                header={
                    <div className={styles["matchers-panel"]}>
                        数据提取器
                        <div className={styles["matchers-number"]}>{extractors?.length}</div>
                    </div>
                }
                key='数据提取器'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                const restValue = {
                                    extractors: []
                                }
                                onReset(restValue)
                            }}
                            size='small'
                        >
                            重置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            size='small'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddMatchingAndExtractionCard("extractors")
                            }}
                            className={styles["btn-padding-right-0"]}
                        >
                            添加/调试
                            <HollowLightningBoltIcon />
                        </YakitButton>
                    </>
                }
            >
                <ExtractorsList
                    extractorValue={extractorValue}
                    onAdd={() => onAddMatchingAndExtractionCard("extractors")}
                    onRemove={onRemoveExtractors}
                    onEdit={onEditExtractors}
                />
            </YakitPanel>
        </>
    )
})
