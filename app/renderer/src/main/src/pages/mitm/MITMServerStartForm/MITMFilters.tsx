import React, {useEffect, useImperativeHandle, useState} from "react"
import {Form, Spin} from "antd"
import {useControllableValue, useMemoizedFn} from "ahooks"
import {yakitNotify} from "../../../utils/notification"
import styles from "./MITMServerStartForm.module.scss"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import classNames from "classnames"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {
    LabelNodeItem,
    MatcherAndExtractionValueList
} from "@/pages/fuzzer/MatcherAndExtractionCard/MatcherAndExtractionCard"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {OutlineTrashIcon} from "@/assets/icon/outline"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import {defaultMITMBaseFilter, defaultMITMAdvancedFilter} from "@/defaultConstants/mitm"
import cloneDeep from "lodash/cloneDeep"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {YakitPanel} = YakitCollapse
const {ipcRenderer} = window.require("electron")

export interface MITMFiltersProp {
    filter?: MITMFilterSchema
    onFinished?: (filter: MITMFilterSchema) => any
    onClosed?: () => any
    ref?: any
    visible?: boolean
}

export interface MITMFilterSchema {
    includeHostname?: string[]
    excludeHostname?: string[]
    includeSuffix?: string[]
    excludeSuffix?: string[]
    excludeMethod?: string[]
    excludeContentTypes?: string[]
    excludeUri?: string[]
    includeUri?: string[]
    FilterData?: MITMFilterData
}

export const MITMFilters: React.FC<MITMFiltersProp> = React.forwardRef((props, ref) => {
    const {t, i18n} = useI18nNamespaces(["mitm"])
    const [params, setParams] = useState<MITMFilterSchema>(props.filter || cloneDeep(defaultMITMBaseFilter))
    const [loading, setLoading] = useState(false)
    useImperativeHandle(
        ref,
        () => ({
            getFormValue: () => params,
            clearFormValue: () => setParams(cloneDeep(defaultMITMBaseFilter)),
            setFormValue: (v) => setParams(v)
        }),
        [params]
    )
    useEffect(() => {
        setParams(props.filter || cloneDeep(defaultMITMBaseFilter))
    }, [props.filter])

    return (
        <Spin spinning={loading}>
            <Form
                labelCol={{span: 6}}
                wrapperCol={{span: 16}}
                className={classNames(styles["mitm-filters-form"], {
                    [styles["mitm-filters-form-hidden"]]: props.visible === false
                })}
            >
                <Form.Item label={t("MITMFilters.includeHostname")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeHostname}
                        onChange={(value, _) => {
                            setParams({...params, includeHostname: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.excludeHostname")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeHostname || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeHostname: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.includeUrlPath")} help={t("MITMFilters.uriMatchExplanation")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeUri || undefined}
                        onChange={(value, _) => {
                            setParams({...params, includeUri: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.excludeUrlPath")} help={t("MITMFilters.uriFilterExplanation")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeUri || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeUri: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.includeFileExtension")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.includeSuffix || undefined}
                        onChange={(value, _) => {
                            setParams({...params, includeSuffix: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.excludeFileExtension")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeSuffix || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeSuffix: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.excludeContentType")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeContentTypes || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeContentTypes: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
                <Form.Item label={t("MITMFilters.excludeHttpMethod")}>
                    <YakitSelect
                        mode='tags'
                        value={params?.excludeMethod || undefined}
                        onChange={(value, _) => {
                            setParams({...params, excludeMethod: value})
                        }}
                    ></YakitSelect>
                </Form.Item>
            </Form>
        </Spin>
    )
})

interface MITMAdvancedFiltersProps {
    visible?: boolean
    filterData: MITMAdvancedFilter[]
    setFilterData?: (v: MITMAdvancedFilter[]) => void
    activeKey?: string
    setActiveKey?: (v: string) => void
}

export type FilterMatcherType = "word" | "regexp" | "glob" | "mime" | "suffix"
export interface FilterDataItem {
    MatcherType: FilterMatcherType
    Group: string[]
}
export interface MITMFilterData {
    IncludeHostnames: FilterDataItem[]
    ExcludeHostnames: FilterDataItem[]

    IncludeSuffix: FilterDataItem[]
    ExcludeSuffix: FilterDataItem[]

    IncludeUri: FilterDataItem[]
    ExcludeUri: FilterDataItem[]

    ExcludeMethods: FilterDataItem[]

    ExcludeMIME: FilterDataItem[]
}

export interface MITMAdvancedFilter extends FilterDataItem {
    Field?: keyof MITMFilterData
}

export const onFilterEmptyMITMAdvancedFilters = (list: FilterDataItem[]) => {
    return list.filter((i) => i.MatcherType && !isFilterItemEmpty(i))
}
const MITMAdvancedFilters: React.FC<MITMAdvancedFiltersProps> = React.memo((props, ref) => {
    const {visible = true} = props
    const {t, i18n} = useI18nNamespaces(["mitm"])

    const [activeKey, setActiveKey] = useControllableValue<string>(props, {
        defaultValue: "ID:0",
        valuePropName: "activeKey",
        trigger: "setActiveKey"
    })

    const [filterData, setFilterData] = useControllableValue<MITMAdvancedFilter[]>(props, {
        defaultValue: [],
        valuePropName: "filterData",
        trigger: "setFilterData"
    })

    const onEdit = useMemoizedFn((field: string, value, index: number) => {
        filterData[index][field] = value
        setFilterData([...filterData])
    })

    const onAddAdvancedSetting = useMemoizedFn(() => {
        const isEmptyIndex = filterData.findIndex((i) => isFilterItemEmpty(i))
        if (isEmptyIndex !== -1) {
            setActiveKey(`ID:${isEmptyIndex}`)
            yakitNotify("error", t("MITMAdvancedFilters.completeExistingConditionBeforeAdding"))
            return
        }
        const newFilterData = [...filterData, cloneDeep(defaultMITMAdvancedFilter)]
        setFilterData(newFilterData)
        const index = newFilterData.length - 1 || 0
        setActiveKey(`ID:${index}`)
    })

    return (
        <div
            className={classNames(styles["filter-content"], {
                [styles["filter-content-hidden"]]: visible === false
            })}
        >
            <div className={styles["filter-operation"]}>
                <YakitButton type='text' onClick={onAddAdvancedSetting}>
                    {t("MITMAdvancedFilters.addAdvancedConfig")}
                </YakitButton>
            </div>
            {!!filterData.length ? (
                <YakitCollapse
                    activeKey={activeKey}
                    onChange={(key) => setActiveKey(key as string)}
                    accordion
                    className={styles["filter-collapse"]}
                >
                    {filterData!.map((filterItem, index) => {
                        const name = filterRangeOption(t)?.find((ele) => ele.value === filterItem.Field)?.label
                        return (
                            <YakitPanel
                                header={
                                    <div className={styles["collapse-panel-header"]}>
                                        <span className={classNames(styles["header-id"])}>
                                            <span>{`${t("MITMAdvancedFilters.rule")}_${index}`}</span>
                                        </span>
                                        <span>[{name}]</span>
                                        {filterItem.Group.length > 0 ? (
                                            <span className={classNames("content-ellipsis", styles["header-number"])}>
                                                {filterItem.Group.length}
                                            </span>
                                        ) : (
                                            <YakitTag color='danger' size='small'>
                                                {t("MITMAdvancedFilters.noConditionSet")}
                                            </YakitTag>
                                        )}
                                    </div>
                                }
                                extra={
                                    <OutlineTrashIcon
                                        className={styles["trash-icon"]}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFilterData(filterData.filter((_, n) => n !== index))
                                            if (index === 0) {
                                                setActiveKey(`ID:${index + 1}`)
                                            } else {
                                                setActiveKey(`ID:${index - 1}`)
                                            }
                                        }}
                                    />
                                }
                                key={`ID:${index}`}
                            >
                                <MITMAdvancedFiltersItem
                                    item={filterItem}
                                    onEdit={(field, value) => onEdit(field, value, index)}
                                />
                            </YakitPanel>
                        )
                    })}
                </YakitCollapse>
            ) : (
                <YakitEmpty
                    description={
                        <YakitButton type='primary' onClick={onAddAdvancedSetting} style={{marginTop: 12}}>
                            {t("MITMAdvancedFilters.addAdvancedConfig")}
                        </YakitButton>
                    }
                />
            )}
        </div>
    )
})
export default MITMAdvancedFilters
interface MITMAdvancedFiltersItemProps {
    item: MITMAdvancedFilter
    onEdit: (f: string, v: any) => void
}

export const isFilterItemEmpty = (item: FilterDataItem) => {
    return (item.Group || []).map((i) => i.trim()).findIndex((ele) => !ele) !== -1
}
const filterRangeOption: (t: (text: string) => string) => YakitSelectProps["options"] = (t) => {
    return [
        {
            label: t("MITMAdvancedFiltersItem.excludeHostnames"),
            value: "ExcludeHostnames"
        },
        {
            label: t("MITMAdvancedFiltersItem.includeHostnames"),
            value: "IncludeHostnames"
        },
        {
            label: t("MITMAdvancedFiltersItem.excludeUris"),
            value: "ExcludeUri"
        },
        {
            label: t("MITMAdvancedFiltersItem.includeUris"),
            value: "IncludeUri"
        },
        {
            label: t("MITMAdvancedFiltersItem.excludeMethods"),
            value: "ExcludeMethods"
        }
    ]
}
export const MITMAdvancedFiltersItem: React.FC<MITMAdvancedFiltersItemProps> = React.memo((props) => {
    const {item, onEdit} = props
    const {t, i18n} = useI18nNamespaces(["mitm"])
    const onAddGroup = useMemoizedFn(() => {
        if (isFilterItemEmpty(item)) {
            yakitNotify("error", t("MITMAdvancedFiltersItem.completeExistingConditionBeforeAdding"))
            return
        } else {
            item.Group.push("")
            onEdit("Group", item.Group)
        }
    })
    return (
        <>
            <div className={classNames(styles["collapse-panel-condition"])}>
                <LabelNodeItem label={t("MITMAdvancedFiltersItem.usageScope")}>
                    <YakitSelect
                        value={item.Field}
                        onSelect={(value) => onEdit("Field", value)}
                        options={filterRangeOption(t)}
                    />
                </LabelNodeItem>
                <LabelNodeItem label={t("MITMAdvancedFiltersItem.matchType")}>
                    <YakitRadioButtons
                        value={item.MatcherType}
                        onChange={(e) => {
                            onEdit("MatcherType", e.target.value)
                        }}
                        buttonStyle='solid'
                        options={[
                            {label: t("MITMAdvancedFiltersItem.regex"), value: "regexp"},
                            {label: "glob", value: "glob"}
                        ]}
                    />
                </LabelNodeItem>
            </div>
            <MatcherAndExtractionValueList
                httpResponse={""}
                showRegex={false}
                group={item.Group}
                notEditable={false}
                onEditGroup={(g) => {
                    onEdit("Group", g)
                }}
                onAddGroup={onAddGroup}
            />
        </>
    )
})
