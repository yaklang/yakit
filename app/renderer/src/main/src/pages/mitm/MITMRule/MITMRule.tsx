import {Button, Checkbox, Divider, Drawer, Modal, Select, Switch, Tag, Tooltip} from "antd"
import React, {ReactNode, useCallback, useEffect, useMemo, useState} from "react"
import {
    ButtonTextProps,
    CloseTipModalProps,
    MITMContentReplacerRule,
    MITMRuleProp,
    YakitCheckboxProps,
    YakitSelectMemoProps,
    YakitSwitchMemoProps
} from "./MITMRuleType"
import styles from "./MITMRule.module.scss"
import {
    BanIcon,
    ChevronDownIcon,
    ExportIcon,
    PencilAltIcon,
    PlusIcon,
    QuestionMarkCircleIcon,
    RemoveIcon,
    SaveIcon,
    TrashIcon
} from "@/assets/newIcon"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import classNames from "classnames"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {openExternalWebsite} from "@/utils/openWebsite"
import {TagsList} from "@/components/baseTemplate/BaseTags"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {MITMRuleFromModal} from "./MITMRuleFromModal"
import {randomString} from "@/utils/randomUtil"
import {MITMResponse} from "../MITMPage"
import {failed, success} from "@/utils/notification"
import {MITMRuleExport, MITMRuleImport} from "./MITMRuleConfigure/MITMRuleConfigure"
import update from "immutability-helper"
import {ExclamationCircleOutlined} from "@ant-design/icons"

const {ipcRenderer} = window.require("electron")

export const HitColor = [
    {
        title: "Red",
        value: "red",
        className: "bg-color-red-opacity"
    },
    {
        title: "Green",
        value: "green",
        className: "bg-color-green-opacity"
    },
    {
        title: "Blue",
        value: "blue",
        className: "bg-color-blue-opacity"
    },
    {
        title: "Yellow",
        value: "yellow",
        className: "bg-color-yellow-opacity"
    },
    {
        title: "Orange",
        value: "orange",
        className: "bg-color-orange-opacity"
    },
    {
        title: "Purple",
        value: "purple",
        className: "bg-color-purple-opacity"
    },
    {
        title: "Cyan",
        value: "cyan",
        className: "bg-color-cyan-opacity"
    },
    {
        title: "Grey",
        value: "grey",
        className: "bg-color-grey-opacity"
    }
]

const batchMenuData: YakitMenuItemProps[] = [
    {
        key: "ban",
        label: "禁用"
    },
    {
        key: "no-replace",
        label: "不替换"
    },
    {
        key: "remove",
        label: "删除"
    }
]

export const colorSelectNode = (
    <>
        {HitColor.map((item) => (
            <YakitSelect.Option value={item.value} key={item.value}>
                <div className={classNames(styles["table-hit-color-content"])}>
                    <div className={classNames(styles["table-hit-color"], item.className)} />
                    {item.title}
                </div>
            </YakitSelect.Option>
        ))}
    </>
)

export const MITMRule: React.FC<MITMRuleProp> = (props) => {
    const {visible, setVisible, getContainer, top, status} = props
    // 内容替代模块
    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])
    const [originalRules, setOriginalRules] = useState<MITMContentReplacerRule[]>([])

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<MITMContentReplacerRule[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)

    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const [exportVisible, setExportVisible] = useState<boolean>(false)
    const [importVisible, setImportVisible] = useState<boolean>(false)

    const [isRefresh, setIsRefresh] = useState<boolean>(false)

    const [isEdit, setIsEdit] = useState<boolean>(false)
    const [isAllBan, setIsAllBan] = useState<boolean>(false)
    const [isNoReplace, setIsNoReplace] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<MITMContentReplacerRule>()
    const [currentIndex, setCurrentIndex] = useState<number>()
    useEffect(() => {
        ipcRenderer.invoke("GetCurrentRules", {}).then((rsp: {Rules: MITMContentReplacerRule[]}) => {
            const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
            setOriginalRules(newRules)
        })
    }, [visible])
    useEffect(() => {
        if (importVisible) return
        setLoading(true)
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                const newRules = rsp.Rules.map((ele) => ({...ele, Id: ele.Index}))
                setRules(newRules)
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    }, [visible, importVisible])
    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            const newRules = (data?.replacers || []).map((ele) => ({...ele, Id: ele.Index}))
            setRules(newRules)
            return
        })
        return () => {
            ipcRenderer.removeAllListeners("client-mitm-content-replacer-update")
        }
    }, [])
    const styleDrawer = useCreation(() => {
        return {width: "100vw", top, height: `calc(100vh - ${top + 1}px)`}
    }, [top])
    const onSelectAll = (newSelectedRowKeys: string[], selected: MITMContentReplacerRule[], checked: boolean) => {
        const rows = selected.filter((ele) => !ele.Disabled)
        setIsAllSelect(checked)
        setSelectedRowKeys(rows.map((ele: any) => ele.Index))
        setSelectedRows(rows)
    }

    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: MITMContentReplacerRule) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, keys])
            setSelectedRows([...selectedRows, rows])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
            const newSelectedRows = selectedRows.filter((ele) => ele.Index !== rows.Index)
            setSelectedRowKeys(newSelectedRowKeys)
            setSelectedRows(newSelectedRows)
        }
    })
    const onSetCurrentRow = useDebounceFn(
        (rowDate: MITMContentReplacerRule) => {
            setCurrentItem(rowDate)
        },
        {wait: 200}
    ).run
    const onRemove = useMemoizedFn((rowDate: MITMContentReplacerRule) => {
        setRules(rules.filter((t) => t.Id !== rowDate.Id))
    })

    const onOpenAddOrEdit = useMemoizedFn((rowDate?: MITMContentReplacerRule) => {
        setModalVisible(true)
        setIsEdit(true)
        setCurrentItem(rowDate)
    })
    const onBan = useMemoizedFn((rowDate: MITMContentReplacerRule) => {
        const newRules: MITMContentReplacerRule[] = rules.map((item: MITMContentReplacerRule) => {
            if (item.Id === rowDate.Id) {
                item = {
                    ...rowDate,
                    Disabled: !rowDate.Disabled
                }
            }
            return item
        })
        setRules(newRules)
    })

    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "执行顺序",
                dataKey: "Index",
                fixed: "left",
                width: 130
            },
            {
                title: "规则名称",
                dataKey: "VerboseName",
                fixed: "left",
                width: 150
            },
            {
                title: "规则内容",
                dataKey: "Rule",
                width: 240
            },
            {
                title: "替换结果",
                dataKey: "NoReplace",
                width: 350,
                tip: "HTTP Header 与 HTTP Cookie 优先级较高，会覆盖文本内容",
                extra: <div className={styles["table-result-extra"]}>开/关</div>,
                render: (_, i: MITMContentReplacerRule) => (
                    <YakitSwitchMemo
                        ExtraCookies={i.ExtraCookies}
                        ExtraHeaders={i.ExtraHeaders}
                        Result={i.Result}
                        disabled={i.Disabled}
                        checked={!i.NoReplace}
                        onChange={(val) => {
                            onEdit({Id: i.Id, NoReplace: !val}, "NoReplace")
                        }}
                    />
                )
            },
            {
                title: "请求",
                dataKey: "EnableForRequest",
                width: 80,
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckboxMemo
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) =>
                            onEdit({Id: record.Id, EnableForRequest: e.target.checked}, "EnableForRequest")
                        }
                    />
                )
            },
            {
                title: "响应",
                dataKey: "EnableForResponse",
                width: 80,
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckboxMemo
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) =>
                            onEdit({Id: record.Id, EnableForResponse: e.target.checked}, "EnableForResponse")
                        }
                    />
                )
            },
            {
                title: "Header",
                dataKey: "EnableForHeader",
                width: 80,
                render: (checked, record: MITMContentReplacerRule) => {
                    return (
                        <YakitCheckboxMemo
                            checked={checked}
                            disabled={record.Disabled}
                            onChange={(e) =>
                                onEdit({Id: record.Id, EnableForHeader: e.target.checked}, "EnableForHeader")
                            }
                        />
                    )
                }
            },
            {
                title: "Body",
                dataKey: "EnableForBody",
                width: 80,
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckboxMemo
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) => onEdit({Id: record.Id, EnableForBody: e.target.checked}, "EnableForBody")}
                    />
                )
            },
            {
                title: "命中颜色",
                dataKey: "Color",
                ellipsis: false,
                render: (text, record: MITMContentReplacerRule) => (
                    <YakitSelectMemo
                        value={text}
                        disabled={record.Disabled}
                        onSelect={(val) => onEdit({Id: record.Id, Color: val}, "Color")}
                    />
                )
            },
            {
                title: "追加 Tag",
                dataKey: "ExtraTag",
                render: (text) => {
                    return <TagsList data={text} ellipsis={true} />
                }
            },
            {
                title: "操作",
                dataKey: "action",
                fixed: "right",
                width: 128,
                render: (_, record: MITMContentReplacerRule) => {
                    return (
                        <div className={styles["table-action-icon"]}>
                            <TrashIcon className={styles["icon-trash"]} onClick={() => onRemove(record)} />
                            <PencilAltIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-edit-disabled"]]: record.Disabled
                                })}
                                onClick={() => onOpenAddOrEdit(record)}
                            />
                            <BanIcon
                                className={classNames(styles["action-icon"], {
                                    [styles["action-icon-ban-disabled"]]: record.Disabled
                                })}
                                onClick={() => onBan(record)}
                            />
                        </div>
                    )
                }
            }
        ]
    }, [])

    const onEdit = useMemoizedFn((record, text: string) => {
        const newRules: MITMContentReplacerRule[] = rules.map((item) => {
            if (item.Id === record.Id) {
                item[text] = record[text]
            }
            return {...item}
        })
        setRules(newRules)
    })
    const onMenuSelect = useMemoizedFn((key: string) => {
        if (key === "ban") {
            onBatchNoReplaceOrBan(true, "Disabled")
        }
        if (key === "no-replace") {
            onBatchNoReplaceOrBan(false, "NoReplace")
        }
        if (key === "remove") {
            onBatchRemove()
        }
    })
    const onOpenOrCloseModal = useMemoizedFn((b: boolean) => {
        if (b) {
            const index = rules.length + 1
            const defRowDate: MITMContentReplacerRule = {
                Color: "",
                EnableForRequest: false,
                EnableForResponse: true,
                EnableForBody: true,
                EnableForHeader: true,
                Index: index,
                Id: index,
                NoReplace: false,
                Result: "",
                Rule: "",
                ExtraTag: [],
                Disabled: false,
                VerboseName: "RULE:" + randomString(10),
                ExtraCookies: [],
                ExtraHeaders: []
            }
            setCurrentItem(defRowDate)
        } else {
            setIsEdit(false)
        }
        setModalVisible(b)
    })

    const onSaveRules = useMemoizedFn((val: MITMContentReplacerRule) => {
        if (isEdit) {
            const index = rules.findIndex((item) => item.Id === val.Id)
            if (index === -1) return
            rules[index] = {...val}
            setRules([...rules])
        } else {
            const newRules = [{...val}, ...rules].sort((a, b) => a.Index - b.Index)
            setRules(newRules)
            setCurrentIndex(newRules.length - 1)
        }
        onOpenOrCloseModal(false)
    })
    const onSaveToDataBase = useMemoizedFn(() => {
        const newRules: MITMContentReplacerRule[] = rules.map((item, index) => ({...item, Index: index + 1}))
        if (status === "idle") {
            // 劫持未开启
            ipcRenderer
                .invoke("SetCurrentRules", {Rules: newRules})
                .then((e) => {
                    setVisible(false)
                    success("保存成功")
                })
                .catch((e) => {
                    failed(`保存失败: ${e}`)
                })
        } else {
            // 开启劫持
            ipcRenderer
                .invoke("mitm-content-replacers", {
                    replacers: newRules
                })
                .then((val) => {
                    setVisible(false)
                    success("保存成功")
                })
                .catch((e) => {
                    failed(`保存失败: ${e}`)
                })
        }
    })
    const onBatchNoReplaceOrBan = useMemoizedFn((checked: boolean, text: string) => {
        if (selectedRowKeys.length === 0) return
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = rules.map((item) => {
            if (selectedRowKeys.findIndex((ele) => ele == `${item.Id}`) !== -1) {
                item[text] = checked
            }
            return item
        })
        setRules([...newRules])
        setSelectedRowKeys([])
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })

    const onBatchRemove = useMemoizedFn(() => {
        if (selectedRowKeys.length === 0) return
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = []
        rules.forEach((item) => {
            if (selectedRowKeys.findIndex((ele) => ele == `${item.Id}`) === -1) {
                newRules.push(item)
            }
        })
        setRules([...newRules])
        setSelectedRowKeys([])
        setIsAllSelect(false)
        setIsRefresh(!isRefresh)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })

    const onAllBan = useMemoizedFn((checked: boolean) => {
        setIsAllBan(checked)
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = rules.map((item) => ({...item, Disabled: checked}))
        setRules(newRules)
        setSelectedRowKeys([])
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    const onAllNoReplace = useMemoizedFn((checked: boolean) => {
        setIsNoReplace(checked)
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = []
        rules.forEach((item) => {
            if (item.Disabled) {
                newRules.push(item)
            } else {
                newRules.push({...item, NoReplace: !checked})
            }
        })
        setRules(newRules)
        setSelectedRowKeys([])
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    const onMoveRow = useMemoizedFn((dragIndex: number, hoverIndex: number) => {
        setRules((prevRules: MITMContentReplacerRule[]) =>
            update(prevRules, {
                $splice: [
                    [dragIndex, 1],
                    [hoverIndex, 0, prevRules[dragIndex]]
                ]
            })
        )
    })
    const onMoveRowEnd = useMemoizedFn(() => {
        setRules((prevRules: MITMContentReplacerRule[]) => {
            const newRules = prevRules.map((item, index) => ({...item, Index: index + 1}))
            return [...newRules]
        })
    })

    const onOkImport = useMemoizedFn(() => {
        setIsRefresh(!isRefresh)
        setImportVisible(false)
    })

    const onClose = useMemoizedFn(() => {
        if (JSON.stringify(originalRules) !== JSON.stringify(rules)) {
            Modal.confirm({
                title: "温馨提示",
                icon: <ExclamationCircleOutlined />,
                content: "请问是否要保存规则内容并关闭弹框？",
                okText: "保存",
                cancelText: "不保存",
                closable: true,
                closeIcon: (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            Modal.destroyAll()
                        }}
                        className={styles["remove-icon"]}
                    >
                        <RemoveIcon />
                    </div>
                ),
                onOk: () => {
                    onSaveToDataBase()
                },
                onCancel: () => {
                    setVisible(false)
                },
                cancelButtonProps: {size: "small", style: {borderRadius: 4}},
                okButtonProps: {size: "small", style: {borderRadius: 4, backgroundColor: "#1890ff"}}
            })
        } else {
            setVisible(false)
        }
    })

    return (
        <>
            <YakitDrawer
                placement='bottom'
                closable={false}
                onClose={() => onClose()}
                visible={visible}
                getContainer={getContainer}
                mask={false}
                style={(visible && styleDrawer) || {}}
                className={classNames(styles["mitm-rule-drawer"], "old-theme-html")}
                contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                title={<div className={styles["heard-title"]}>内容规则配置</div>}
                extra={
                    <div className={styles["heard-right-operation"]}>
                        <YakitButton type='text' icon={<SaveIcon />} onClick={() => setImportVisible(true)}>
                            导入配置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton
                            type='text'
                            icon={<ExportIcon />}
                            className={styles["button-export"]}
                            onClick={() => {
                                setExportVisible(true)
                            }}
                        >
                            导出配置
                        </YakitButton>
                        <YakitButton
                            type='primary'
                            className={styles["button-save"]}
                            onClick={() => onSaveToDataBase()}
                        >
                            保存
                        </YakitButton>
                        <YakitButton
                            type='outline2'
                            className={styles["button-question"]}
                            onClick={() => openExternalWebsite("https://www.yaklang.com/")}
                        >
                            <QuestionMarkCircleIcon />
                        </YakitButton>
                        <div onClick={() => onClose()} className={styles["icon-remove"]}>
                            <RemoveIcon />
                        </div>
                    </div>
                }
            >
                <div className={styles["mitm-rule-table"]}>
                    <TableVirtualResize<MITMContentReplacerRule>
                        currentIndex={currentIndex}
                        isRefresh={isRefresh}
                        titleHeight={42}
                        title={
                            <div className={styles["table-title-body"]}>
                                <div className={styles["table-title"]}>现有 MITM 内容规则</div>
                                <div className={styles["table-total"]}>
                                    共 <span>{rules.length}</span> 条规则
                                </div>
                            </div>
                        }
                        extra={
                            <div className={styles["table-title-body"]}>
                                <div className={styles["table-switch"]}>
                                    <span className={styles["switch-text"]}>全部禁用</span>
                                    <YakitSwitch checked={isAllBan} onChange={(c) => onAllBan(c)} />
                                </div>
                                <Divider type='vertical' style={{margin: "0 16px"}} />
                                <div className={styles["table-switch"]}>
                                    <span className={styles["switch-text"]}>全部不替换</span>
                                    <YakitSwitch checked={isNoReplace} onChange={(c) => onAllNoReplace(c)} />
                                </div>
                                {/* <YakitButton type='outline2' className={styles["button-filter"]}>
                                <FilterIcon />
                            </YakitButton> */}
                                <YakitPopover
                                    placement={"bottom"}
                                    arrowPointAtCenter={true}
                                    content={
                                        <YakitMenu
                                            type='secondary'
                                            data={batchMenuData}
                                            selectedKeys={[]}
                                            width={92}
                                            onSelect={({key}) => onMenuSelect(key)}
                                        />
                                    }
                                    trigger='hover'
                                    overlayClassName={classNames(styles["popover-remove"])}
                                >
                                    <YakitButton
                                        type='outline2'
                                        disabled={selectedRowKeys.length === 0}
                                        className={classNames(styles["button-batch-remove"])}
                                    >
                                        批量操作
                                        <ChevronDownIcon />
                                    </YakitButton>
                                </YakitPopover>

                                <YakitButton type='primary' onClick={() => onOpenOrCloseModal(true)}>
                                    <div className={styles["button-add-rule"]}>
                                        <PlusIcon />
                                        新增规则
                                    </div>
                                </YakitButton>
                            </div>
                        }
                        renderKey='Id'
                        data={rules}
                        rowSelection={{
                            isAll: isAllSelect,
                            type: "checkbox",
                            selectedRowKeys,
                            onSelectAll: onSelectAll,
                            onChangeCheckboxSingle: onSelectChange
                        }}
                        pagination={{
                            total: rules.length,
                            limit: 20,
                            page: 1,
                            onChange: () => {}
                        }}
                        loading={loading}
                        columns={columns}
                        onSetCurrentRow={onSetCurrentRow}
                        onMoveRow={onMoveRow}
                        enableDragSort={true}
                        onMoveRowEnd={onMoveRowEnd}
                    />
                </div>
            </YakitDrawer>
            {modalVisible && (
                <MITMRuleFromModal
                    rules={rules}
                    modalVisible={modalVisible}
                    isEdit={isEdit}
                    onClose={() => onOpenOrCloseModal(false)}
                    onSave={onSaveRules}
                    currentItem={currentItem}
                />
            )}
            {exportVisible && <MITMRuleExport visible={exportVisible} setVisible={setExportVisible} />}
            {importVisible && (
                <MITMRuleImport visible={importVisible} setVisible={setImportVisible} onOk={onOkImport} />
            )}
        </>
    )
}

const YakitSelectMemo = React.memo<YakitSelectMemoProps>(
    (props) => {
        return (
            <YakitSelect
                value={props.value}
                bordered={false}
                disabled={props.disabled}
                size='small'
                wrapperStyle={{width: "100%"}}
                onSelect={(val) => props.onSelect(val)}
                dropdownClassName='old-theme-html'
            >
                {colorSelectNode}
            </YakitSelect>
        )
    },
    (preProps, nextProps) => {
        // return true; 	不渲染
        // return false;	渲染
        if (preProps.value !== nextProps.value) {
            return false
        }
        if (preProps.disabled !== nextProps.disabled) {
            return false
        }
        return true
    }
)

const YakitCheckboxMemo = React.memo<YakitCheckboxProps>(
    (props) => {
        return <YakitCheckbox checked={props.checked} disabled={props.disabled} onChange={props.onChange} />
    },
    (preProps, nextProps) => {
        // return true; 	不渲染
        // return false;	渲染
        if (preProps.checked !== nextProps.checked) {
            return false
        }
        if (preProps.disabled !== nextProps.disabled) {
            return false
        }
        return true
    }
)

const YakitSwitchMemo = React.memo<YakitSwitchMemoProps>(
    (props) => {
        let node: ReactNode = (
            <Tooltip title={props.Result}>
                <div className={styles["table-result-text"]}>{props.Result}</div>
            </Tooltip>
        )
        if (
            (props.ExtraHeaders && props.ExtraHeaders.length > 0) ||
            (props.ExtraCookies && props.ExtraCookies.length > 0)
        ) {
            node = (
                <div>
                    {props.ExtraHeaders.length > 0 && (
                        <YakitTag size='small' color='purple' disable={props.disabled}>
                            HTTP Header: {props.ExtraHeaders.length}
                        </YakitTag>
                    )}
                    {props.ExtraCookies.length > 0 && (
                        <YakitTag size='small' color='success' disable={props.disabled}>
                            HTTP Cookie: {props.ExtraCookies.length}
                        </YakitTag>
                    )}
                </div>
            )
        }
        return (
            <div className={styles["table-result"]}>
                {node}
                <YakitSwitch size='small' disabled={props.disabled} checked={props.checked} onChange={props.onChange} />
            </div>
        )
    },
    (preProps, nextProps) => {
        // return true; 	不渲染
        // return false;	渲染
        if (preProps.checked !== nextProps.checked) {
            return false
        }
        if (preProps.disabled !== nextProps.disabled) {
            return false
        }
        if (preProps.Result !== nextProps.Result) {
            return false
        }
        if (JSON.stringify(preProps.ExtraCookies) !== JSON.stringify(nextProps.ExtraCookies)) {
            return false
        }
        if (JSON.stringify(preProps.ExtraHeaders) !== JSON.stringify(nextProps.ExtraHeaders)) {
            return false
        }
        return true
    }
)
