import {Button, Checkbox, Divider, Drawer, Select, Switch, Tag} from "antd"
import React, {ReactNode, useEffect, useMemo, useState} from "react"
import {ButtonTextProps, MITMRuleProp} from "./MITMRuleType"
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
import {MITMContentReplacer, MITMContentReplacerRule} from "../MITMContentReplacer"
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
import {showModal} from "@/utils/showModal"
import {MITMResponse} from "../MITMPage"
import {failed, success} from "@/utils/notification"

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
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<MITMContentReplacerRule[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const [isEdit, setIsEdit] = useState<boolean>(false)
    const [isAllBan, setIsAllBan] = useState<boolean>(false)
    const [isNoReplace, setIsNoReplace] = useState<boolean>(false)
    const [currentItem, setCurrentItem] = useState<MITMContentReplacerRule>()

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                setRules(rsp.Rules)
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    }, [visible])
    useEffect(() => {
        ipcRenderer.on("client-mitm-content-replacer-update", (e, data: MITMResponse) => {
            setRules(data?.replacers || [])
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
        setIsAllSelect(checked)
        setSelectedRowKeys(newSelectedRowKeys)
        setSelectedRows(selected)
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
        setRules(rules.filter((t) => t.Index !== rowDate.Index))
    })

    const onOpenAddOrEdit = useMemoizedFn((rowDate?: MITMContentReplacerRule) => {
        setModalVisible(true)
        setIsEdit(true)
        setCurrentItem(rowDate)
    })
    const onBan = useMemoizedFn((rowDate: MITMContentReplacerRule) => {
        const newRules: MITMContentReplacerRule[] = rules.map((item: MITMContentReplacerRule) => {
            if (item.Index === rowDate.Index) {
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
                extra: <div className={styles["table-result-extra"]}>不替换</div>,
                render: (_, i: MITMContentReplacerRule) => {
                    let node: ReactNode = <div>{i.Result}</div>
                    if (
                        (i.ExtraHeaders && i.ExtraHeaders.length > 0) ||
                        (i.ExtraCookies && i.ExtraCookies.length > 0)
                    ) {
                        node = (
                            <div>
                                {i.ExtraHeaders.length > 0 && (
                                    <YakitTag size='small' color='purple'>
                                        HTTP Header: {i.ExtraHeaders.length}
                                    </YakitTag>
                                )}
                                {i.ExtraCookies.length > 0 && (
                                    <YakitTag size='small' color='success'>
                                        HTTP Cookie: {i.ExtraCookies.length}
                                    </YakitTag>
                                )}
                            </div>
                        )
                    }
                    return (
                        <div className={styles["table-result"]}>
                            {node}
                            <YakitSwitch
                                size='small'
                                disabled={i.Disabled}
                                checked={i.NoReplace}
                                onChange={(val) => onEdit({...i, NoReplace: val}, "NoReplace")}
                            />
                        </div>
                    )
                }
            },
            {
                title: "请求",
                dataKey: "EnableForRequest",
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckbox
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) => onEdit({...record, EnableForRequest: e.target.checked}, "EnableForRequest")}
                    />
                )
            },
            {
                title: "响应",
                dataKey: "EnableForResponse",
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckbox
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) => onEdit({...record, EnableForResponse: e.target.checked}, "EnableForResponse")}
                    />
                )
            },
            {
                title: "Header",
                dataKey: "EnableForHeader",
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckbox
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) => onEdit({...record, EnableForHeader: e.target.checked}, "EnableForHeader")}
                    />
                )
            },
            {
                title: "Body",
                dataKey: "EnableForBody",
                render: (checked, record: MITMContentReplacerRule) => (
                    <YakitCheckbox
                        checked={checked}
                        disabled={record.Disabled}
                        onChange={(e) => onEdit({...record, EnableForBody: e.target.checked}, "EnableForBody")}
                    />
                )
            },
            {
                title: "命中颜色",
                dataKey: "Color",
                ellipsis: false,
                render: (text, record: MITMContentReplacerRule) => (
                    <YakitSelect
                        value={text}
                        bordered={false}
                        disabled={record.Disabled}
                        size='small'
                        wrapperStyle={{width: "100%"}}
                        onSelect={(val) => onEdit({...record, Color: val}, "Color")}
                    >
                        {colorSelectNode}
                    </YakitSelect>
                )
            },
            {
                title: "追加 Tag",
                dataKey: "ExtraTag",
                render: (text) => {
                    // const text = ["公钥传输", "登陆/密码传输", "疑似JSONP"]
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
    const onEdit = useMemoizedFn((record: MITMContentReplacerRule, text: string) => {
        const newRules: MITMContentReplacerRule[] = rules.map((item) => {
            if (item.Index === record.Index) {
                item = record
            }
            return item
        })
        setRules(newRules)
    })
    const onMenuSelect = useMemoizedFn((key: string) => {
        if (key === "ban") {
            onBatchNoReplaceOrBan(false, "NoReplace")
        }
        if (key === "no-replace ") {
            onBatchNoReplaceOrBan(false, "Disabled")
        }
        if (key === "remove") {
            onBatchRemove()
        }
    })
    const onOpenOrCloseModal = useMemoizedFn((b: boolean) => {
        if (b) {
            const defRowDate: MITMContentReplacerRule = {
                Color: "",
                EnableForRequest: false,
                EnableForResponse: true,
                EnableForBody: true,
                EnableForHeader: true,
                Index: rules.length + 1,
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
            const index = rules.findIndex((item) => item.Index === val.Index)
            if (index === -1) return
            rules[index] = {...val}
            setRules([...rules])
        } else {
            setRules([{...val}, ...rules].sort((a, b) => a.Index - b.Index))
        }
        onOpenOrCloseModal(false)
    })

    const onSaveToDataBase = useMemoizedFn(() => {
        if (status === "idle") {
            // 劫持未开启
            ipcRenderer
                .invoke("SetCurrentRules", {Rules: rules})
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
                    replacers: rules
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
            if (selectedRowKeys.findIndex((ele) => ele == `${item.Index}`) !== -1) {
                item[text] = checked
            }
            return item
        })
        setRules({...newRules})
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
            if (selectedRowKeys.findIndex((ele) => ele == `${item.Index}`) === -1) {
                newRules.push(item)
            }
        })
        setRules({...newRules})
        setSelectedRowKeys([])
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    const onAllBan = useMemoizedFn((checked: boolean) => {
        setIsAllBan(checked)
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = rules.map((item) => ({...item, Disabled: checked}))
        setRules(newRules)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    const onAllNoReplace = useMemoizedFn((checked: boolean) => {
        setIsNoReplace(checked)
        setLoading(true)
        const newRules: MITMContentReplacerRule[] = rules.map((item) => ({...item, NoReplace: checked}))
        setRules(newRules)
        setTimeout(() => {
            setLoading(false)
        }, 200)
    })
    return (
        <>
            <YakitDrawer
                placement='bottom'
                closable={false}
                onClose={() => setVisible(false)}
                visible={visible}
                getContainer={getContainer}
                mask={false}
                style={(visible && styleDrawer) || {}}
                className={styles["mitm-rule-drawer"]}
                contentWrapperStyle={{boxShadow: "0px -2px 4px rgba(133, 137, 158, 0.2)"}}
                title={<div className={styles["heard-title"]}>内容规则配置</div>}
                extra={
                    <div className={styles["heard-right-operation"]}>
                        <YakitButton type='text' icon={<SaveIcon />}>
                            导入配置
                        </YakitButton>
                        <Divider type='vertical' style={{margin: "0 4px"}} />
                        <YakitButton type='text' icon={<ExportIcon />} className={styles["button-export"]}>
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
                        <div onClick={() => setVisible(false)} className={styles["icon-remove"]}>
                            <RemoveIcon />
                        </div>
                    </div>
                }
            >
                <div className={styles["mitm-rule-table"]}>
                    <TableVirtualResize<MITMContentReplacerRule>
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
                                        批量删除
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
                        renderKey='Index'
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
                        // onRowClick={onRowClick}
                        onSetCurrentRow={onSetCurrentRow}
                    />
                </div>
            </YakitDrawer>
            <MITMRuleFromModal
                rules={rules}
                modalVisible={modalVisible}
                isEdit={isEdit}
                onClose={() => onOpenOrCloseModal(false)}
                onSave={onSaveRules}
                currentItem={currentItem}
            />
        </>
    )
}
