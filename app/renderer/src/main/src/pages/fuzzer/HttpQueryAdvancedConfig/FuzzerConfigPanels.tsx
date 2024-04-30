import React, {useRef} from "react"
import styles from "./HttpQueryAdvancedConfig.module.scss"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useCreation, useMemoizedFn} from "ahooks"
import {Descriptions, Divider, Form} from "antd"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {MatchingAndExtraction} from "../MatcherAndExtractionCard/MatcherAndExtractionCardType"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {
    ColorSelect,
    defMatcherAndExtractionCode,
    filterModeOptions,
    matchersConditionOptions
} from "../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {ExtractorsList, MatchersList} from "./HttpQueryAdvancedConfig"
import {AdvancedConfigValueProps} from "./HttpQueryAdvancedConfigType"
import {StringToUint8Array} from "@/utils/str"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {CopyableField} from "@/utils/inputUtil"
import {yakitFailed, yakitNotify} from "@/utils/notification"
import {VariableList} from "@/pages/httpRequestBuilder/HTTPRequestBuilder"
import {OutlinePlusIcon} from "@/assets/icon/outline"
import {RemoteGV} from "@/yakitGV"

const {YakitPanel} = YakitCollapse
const {ipcRenderer} = window.require("electron")

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
const variableModeOptions = [
    {
        value: "nuclei-dsl",
        label: "nuclei"
    },
    {
        value: "fuzztag",
        label: "fuzztag"
    },
    {
        value: "raw",
        label: "raw"
    }
]
interface VariablePanelProps {
    pageId: string
    defaultHttpResponse: string
    onAdd: (s: string) => void
}
export const VariablePanel: React.FC<VariablePanelProps> = React.memo((props) => {
    const {defaultHttpResponse, onAdd, pageId, ...restProps} = props
    const form = Form.useFormInstance()
    const params = Form.useWatch("params", form) || []

    const variableRef = useRef<any>()

    const onReset = useMemoizedFn(() => {
        form.setFieldsValue({
            params: [{Key: "", Value: "", Type: "raw"}]
        })
    })
    /** @description 变量预览 */
    const onRenderVariables = useMemoizedFn((e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation()
        ipcRenderer
            .invoke("RenderVariables", {
                Params: form.getFieldValue("params") || [],
                HTTPResponse: StringToUint8Array(defaultHttpResponse || defMatcherAndExtractionCode)
            })
            .then((rsp: {Results: {Key: string; Value: string}[]}) => {
                showYakitModal({
                    title: "渲染后变量内容",
                    footer: <></>,
                    content: (
                        <div className={styles["render-variables-modal-content"]}>
                            <Descriptions size={"small"} column={1} bordered={true}>
                                {rsp.Results.filter((i) => {
                                    return !(i.Key === "" && i.Value === "")
                                }).map((data, index) => {
                                    return (
                                        <Descriptions.Item
                                            label={<CopyableField text={data.Key} maxWidth={100} />}
                                            key={`${data.Key}-${data.Value}`}
                                        >
                                            <CopyableField text={data.Value} maxWidth={300} />
                                        </Descriptions.Item>
                                    )
                                })}
                            </Descriptions>
                        </div>
                    )
                })
            })
            .catch((err) => {
                yakitNotify("error", "预览失败:" + err)
            })
    })
    const onAddPrams = useMemoizedFn(() => {
        onAdd("设置变量")
        const index = params.findIndex((ele: {Key: string; Value: string}) => !ele || (!ele.Key && !ele.Value))
        if (index === -1) {
            form.setFieldsValue({
                params: [...params, {Key: "", Value: "", Type: "raw"}]
            })
            onSetActiveKey()
        } else {
            yakitFailed(`请将已添加【变量${index}】设置完成后再进行添加`)
        }
    })

    const onSetActiveKey = useMemoizedFn(() => {
        const newActiveKeys = [...(variableRef.current?.variableActiveKey || []), `${params?.length || 0}`]
        variableRef.current?.setVariableActiveKey([...newActiveKeys])
    })
    const onRemove = useMemoizedFn((index: number) => {
        const newParams = params.filter((_, i) => i !== index)
        form.setFieldsValue({
            params: [...newParams]
        })
    })
    return (
        <>
            <YakitPanel
                {...restProps}
                header='设置变量'
                key='设置变量'
                extra={
                    <>
                        <YakitButton
                            type='text'
                            colors='danger'
                            onClick={(e) => {
                                e.stopPropagation()
                                onReset()
                            }}
                            size='small'
                        >
                            重置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton type='text' onClick={onRenderVariables} size='small'>
                            预览
                        </YakitButton>
                        <Divider type='vertical' style={{margin: 0}} />
                        <YakitButton
                            type='text'
                            onClick={(e) => {
                                e.stopPropagation()
                                onAddPrams()
                            }}
                            className={styles["btn-padding-right-0"]}
                            size='small'
                        >
                            添加
                            <OutlinePlusIcon />
                        </YakitButton>
                    </>
                }
                className={styles["params-panel"]}
            >
                <VariableList
                    cacheType='variableActiveKeys'
                    pageId={pageId}
                    ref={variableRef}
                    field='params'
                    onDel={onRemove}
                    extra={(i, info) => (
                        <Form.Item name={[info.name, "Type"]} noStyle wrapperCol={{span: 24}}>
                            <YakitRadioButtons
                                style={{marginLeft: 4}}
                                buttonStyle='solid'
                                options={variableModeOptions}
                                size={"small"}
                            />
                        </Form.Item>
                    )}
                ></VariableList>
            </YakitPanel>
        </>
    )
})
