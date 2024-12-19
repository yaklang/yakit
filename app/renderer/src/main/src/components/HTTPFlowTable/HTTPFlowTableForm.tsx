import React, {useEffect, useRef, useState} from "react"
import {Form, Modal, Tooltip} from "antd"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {YakitDrawer} from "../yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "../yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "../yakitUI/YakitSelect/YakitSelect"
import {YakitRadioButtons} from "../yakitUI/YakitRadioButtons/YakitRadioButtons"
import {FiltersItemProps} from "../TableVirtualResize/TableVirtualResizeType"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {OutlineInformationcircleIcon, OutlineXIcon} from "@/assets/icon/outline"
import {yakitNotify} from "@/utils/notification"
import {RemoteHistoryGV} from "@/enums/history"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import cloneDeep from "lodash/cloneDeep"

import classNames from "classnames"
import styles from "./HTTPFlowTableForm.module.scss"
import {ColumnAllInfoItem} from "./HTTPFlowTable"

export interface HTTPFlowTableFormConfigurationProps {
    visible: boolean
    setVisible: (b: boolean) => void
    responseType: FiltersItemProps[]
    onSave: (v: HTTPFlowTableFromValue, setting: HTTPFlowSettingValue, excludeColKeywords: string[]) => void
    filterMode: "shield" | "show"
    hostName: string[]
    urlPath: string[]
    fileSuffix: string[]
    searchContentType: string
    excludeKeywords: string[]
    columnsAll: string
}

export interface HTTPFlowTableFromValue {
    filterMode: "shield" | "show"
    urlPath: string[]
    hostName: string[]
    fileSuffix: string[]
    searchContentType: string
    excludeKeywords: string[]
}
export interface HTTPFlowSettingValue {
    backgroundRefresh: boolean
}

export enum HTTPFlowTableFormConsts {
    HTTPFlowTableFilterMode = "YAKIT_HTTPFlowTableFilterMode",
    HTTPFlowTableHostName = "YAKIT_HTTPFlowTableHostName",
    HTTPFlowTableUrlPath = "YAKIT_HTTPFlowTableUrlPath",
    HTTPFlowTableFileSuffix = "YAKIT_HTTPFlowTableFileSuffix",
    HTTPFlowTableContentType = "YAKIT_HTTPFlowTableContentType",
    HTTPFlowTableExcludeKeywords = "YAKIT_HTTPFlowTableExcludeKeywords"
}

export const HTTPFlowTableFormConfiguration: React.FC<HTTPFlowTableFormConfigurationProps> = (props) => {
    const {
        visible,
        setVisible,
        responseType,
        onSave,
        filterMode,
        hostName,
        urlPath,
        fileSuffix,
        searchContentType,
        excludeKeywords,
        columnsAll
    } = props

    /** ---------- 高级筛选 Start ---------- */
    // 筛选模式
    const [filterModeVal, setFilterModeVal] = useState<"shield" | "show">("shield")

    // 原始数据-筛选模式
    const oldFilterMode = useRef<"shield" | "show">("shield")
    // 原始数据-Hostname
    const oldHostName = useRef<string[]>([])
    // 原始数据-URL路径
    const oldUrlPath = useRef<string[]>([])
    // 原始数据-文件后缀
    const oldFileSuffix = useRef<string[]>([])
    // 原始数据-响应类型
    const oldSearchContentType = useRef<string[]>([])
    // 原始数据-关键字
    const oldExcludeKeywords = useRef<string[]>([])

    const [form] = Form.useForm()

    /** 高级筛选-保存 */
    const handleAdvancedFiltersSave = useMemoizedFn(() => {
        return new Promise<HTTPFlowTableFromValue>((resolve, reject) => {
            form.validateFields()
                .then((formValue) => {
                    const {filterMode, urlPath = [], hostName = [], fileSuffix = [], excludeKeywords = []} = formValue
                    let searchContentType: string = (formValue.searchContentType || []).join(",")
                    setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFilterMode, filterMode)
                    setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableHostName, JSON.stringify(hostName))
                    setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableUrlPath, JSON.stringify(urlPath))
                    setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableFileSuffix, JSON.stringify(fileSuffix))
                    setRemoteValue(HTTPFlowTableFormConsts.HTTPFlowTableContentType, searchContentType)
                    setRemoteValue(
                        HTTPFlowTableFormConsts.HTTPFlowTableExcludeKeywords,
                        JSON.stringify(excludeKeywords)
                    )
                    const info: HTTPFlowTableFromValue = {
                        filterMode: filterMode,
                        hostName,
                        urlPath,
                        fileSuffix,
                        searchContentType,
                        excludeKeywords
                    }
                    resolve(info)
                })
                .catch((err) => {
                    reject(`${reject}`)
                })
        })
    })

    /** 高级筛选-重置 */
    const handleAdvancedFiltersReset = () => {
        form.resetFields()
        setFilterModeVal("shield")
    }
    /** ---------- 高级筛选 End ---------- */

    /** ---------- 配置 Start ---------- */
    const [backgroundRefresh, setBackgroundRefresh] = useState<boolean>(false)
    const oldBackgroundRefresh = useRef<boolean>(false)
    /** ---------- 配置 End ---------- */

    // 获取默认值
    useEffect(() => {
        if (!visible) return

        // 筛选模式
        oldFilterMode.current = filterMode
        setFilterModeVal(filterMode)
        // HostName
        oldHostName.current = hostName
        // URL路径
        oldUrlPath.current = urlPath
        // 文件后缀
        oldFileSuffix.current = fileSuffix
        // 响应类型
        const contentType: string = searchContentType
        const searchType: string[] = !contentType ? [] : contentType.split(",")
        oldSearchContentType.current = searchType
        // 关键字
        oldExcludeKeywords.current = excludeKeywords
        form.setFieldsValue({filterMode, hostName, urlPath, fileSuffix, searchContentType: searchType, excludeKeywords})

        // 后台刷新
        getRemoteValue(RemoteHistoryGV.BackgroundRefresh).then((e) => {
            oldBackgroundRefresh.current = !!e
            setBackgroundRefresh(!!e)
        })
    }, [visible])

    // 保存
    const handleSave = useMemoizedFn(async () => {
        try {
            const advancedFilters = await handleAdvancedFiltersSave()

            // 缓存后台刷新状态
            if (oldBackgroundRefresh.current !== backgroundRefresh) {
                setRemoteValue(RemoteHistoryGV.BackgroundRefresh, backgroundRefresh ? "true" : "")
            }

            onSave(
                cloneDeep(advancedFilters),
                {backgroundRefresh},
                curColumnsAll.filter((item) => !item.isChecked).map((item) => item.dataKey)
            )
        } catch (error) {
            yakitNotify("error", `${error}`)
        }
    })
    // 取消
    const handleCancel = useMemoizedFn(() => {
        setVisible(false)
    })

    // 判断是否有修改
    const handleJudgeModify = useMemoizedFn(async () => {
        try {
            // 是否有修改
            let isModify: boolean = false

            const newValue = await form.getFieldsValue()
            const oldValue: any = {
                filterMode: oldFilterMode.current,
                hostName: oldHostName.current,
                urlPath: oldUrlPath.current,
                fileSuffix: oldFileSuffix.current,
                searchContentType: oldSearchContentType.current,
                excludeKeywords: oldExcludeKeywords.current
            }
            isModify = JSON.stringify(oldValue) !== JSON.stringify(newValue)

            isModify = oldBackgroundRefresh.current !== backgroundRefresh

            return isModify
        } catch (error) {
            yakitNotify("error", `${error}`)
            return null
        }
    })

    const handleClose = useMemoizedFn(async () => {
        const result = await handleJudgeModify()
        if (result == null) return

        if (result) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存高级配置并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className='modal-remove-icon'
                    >
                        <OutlineXIcon />
                    </div>
                ),
                onOk: handleSave,
                onCancel: handleCancel,
                cancelButtonProps: {size: "small", className: "modal-cancel-button"},
                okButtonProps: {size: "small", className: "modal-ok-button"}
            })
        } else {
            setVisible(false)
        }
    })

    // 自定义列
    const [curColumnsAll, setCurColumnsAll] = useState<ColumnAllInfoItem[]>([])
    useEffect(() => {
        try {
            setCurColumnsAll(JSON.parse(columnsAll))
        } catch (error) {
        }
    }, [columnsAll])

    return (
        <YakitDrawer
            className={styles["http-flow-table-form-configuration"]}
            visible={visible}
            width='40%'
            onClose={handleClose}
            title={
                <div className={styles["advanced-configuration-drawer-title"]}>
                    <div className={styles["advanced-configuration-drawer-title-text"]}>高级配置</div>
                    <div className={styles["advanced-configuration-drawer-title-btns"]}>
                        <YakitButton type='outline2' onClick={handleCancel}>
                            取消
                        </YakitButton>
                        <YakitButton type='primary' onClick={handleSave}>
                            保存
                        </YakitButton>
                    </div>
                </div>
            }
            maskClosable={false}
        >
            <div className={styles["advanced-config-wrapper"]}>
                {/* 筛选项 */}
                <div className={styles["config-item-wrapper"]}>
                    <div className={styles["item-header"]}>
                        <div className={styles["header-title"]}>高级筛选</div>
                        <YakitButton type='text' onClick={handleAdvancedFiltersReset}>
                            重置
                        </YakitButton>
                    </div>

                    <Form
                        form={form}
                        labelCol={{span: 6}}
                        wrapperCol={{span: 16}}
                        className={styles["mitm-filters-form"]}
                    >
                        <Form.Item label='筛选模式' name='filterMode' initialValue={"shield"}>
                            <YakitRadioButtons
                                buttonStyle='solid'
                                options={[
                                    {
                                        value: "shield",
                                        label: "屏蔽内容"
                                    },
                                    {
                                        value: "show",
                                        label: "只展示"
                                    }
                                ]}
                                value={filterModeVal}
                                onChange={(e) => {
                                    setFilterModeVal(e.target.value)
                                }}
                            />
                        </Form.Item>
                        <Form.Item label='Hostname' name='hostName'>
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item
                            label='URL路径'
                            name='urlPath'
                            help={"可理解为 URI 匹配，例如 /main/index.php?a=123 或者 /*/index 或 /admin* "}
                        >
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={"文件后缀"} name='fileSuffix'>
                            <YakitSelect mode='tags'></YakitSelect>
                        </Form.Item>
                        <Form.Item label={"响应类型"} name='searchContentType'>
                            <YakitSelect mode='tags' options={responseType}></YakitSelect>
                        </Form.Item>
                        {filterModeVal === "shield" && (
                            <Form.Item label='关键字' name='excludeKeywords' help={"匹配逻辑与外面搜索关键字逻辑一样"}>
                                <YakitSelect mode='tags'></YakitSelect>
                            </Form.Item>
                        )}
                    </Form>
                </div>

                {/* 配置项 */}
                <div className={styles["config-item-wrapper"]}>
                    <div className={styles["item-header"]}>
                        <div className={styles["header-title"]}>其他配置</div>
                        {/* <YakitButton type='text' onClick={()=>{}}>
                            重置
                        </YakitButton> */}
                    </div>

                    <div className={styles["setting-body"]}>
                        <div className={classNames(styles["background-refresh"], styles["setting-item"])}>
                            <div className={styles["setting-item-header"]}>
                                <YakitCheckbox
                                    checked={backgroundRefresh}
                                    onChange={(e) => {
                                        setBackgroundRefresh(e.target.checked)
                                    }}
                                />
                            </div>
                            <div className={styles["setting-item-body"]}>
                                <span className={styles["title-style"]}>后台刷新</span>
                                <Tooltip title='勾选后不在当前页面也会刷新流量数据'>
                                    <OutlineInformationcircleIcon className={styles["hint-style"]} />
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
                {/* 列表显示字段 */}
                <div className={styles["config-item-wrapper"]}>
                    <div className={styles["item-header"]}>
                        <div className={styles["header-title"]}>列表显示字段</div>
                        <YakitButton
                            type='text'
                            onClick={() => {
                                const newCurColumnsAll = curColumnsAll.map((item) => ({...item, isChecked: true}))
                                setCurColumnsAll(newCurColumnsAll)
                            }}
                        >
                            重置
                        </YakitButton>
                    </div>
                    <div>勾选则代表展示，不勾选则不进行展示，该配置对插件执行流量表，webfuzzer流量表全部生效</div>
                    <div className={styles["columns-cols"]}>
                        {curColumnsAll.map((item, index) => (
                            <YakitCheckbox
                                wrapperClassName={styles["columns-cols-item"]}
                                key={index}
                                checked={item.isChecked}
                                onChange={(e) => {
                                    const arr = [...curColumnsAll]
                                    arr.forEach((i) => {
                                        if (i.dataKey === item.dataKey) {
                                            i.isChecked = e.target.checked
                                        }
                                    })
                                    setCurColumnsAll(arr)
                                }}
                            >
                                {item.title}
                            </YakitCheckbox>
                        ))}
                    </div>
                </div>
            </div>
        </YakitDrawer>
    )
}
