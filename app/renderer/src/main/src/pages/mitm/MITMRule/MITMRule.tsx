import {Button, Checkbox, Divider, Drawer, Select, Switch, Tag} from "antd"
import React, {ReactNode, useEffect, useState} from "react"
import {ButtonTextProps, MITMRuleProp} from "./MITMRuleType"
import styles from "./MITMRule.module.scss"
import {ButtonColor, TestButton} from "@/components/baseTemplate/BaseButton"
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
import {MITMContentReplacerRule} from "../MITMContentReplacer"
import {MITMResponse} from "../MITMPage"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {ColumnsTypeProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import classNames from "classnames"
import {YakitDrawer} from "@/components/yakit/YakitDrawer/YakitDrawer"
import {YakitInputNumber} from "@/components/yakit/YakitInputNumber/YakitInputNumber"
import {openExternalWebsite} from "@/utils/openWebsite"
import {TagsList, Test} from "@/components/baseTemplate/BaseTags"
import {YakitTag} from "@/components/yakit/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakit/YakitSwitch/YakitSwitch"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"

const {ipcRenderer, shell} = window.require("electron")

const HitColor = [
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

export const MITMRule: React.FC<MITMRuleProp> = (props) => {
    const {visible, setVisible, getContainer, top} = props
    // 内容替代模块
    const [rules, setRules] = useState<MITMContentReplacerRule[]>([])
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [selectedRows, setSelectedRows] = useState<MITMContentReplacerRule[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [modalVisible, setModalVisible] = useState<boolean>(false)
    const [selected, setSelected] = useState<MITMContentReplacerRule>()

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetCurrentRules", {})
            .then((rsp: {Rules: MITMContentReplacerRule[]}) => {
                console.log("rsp.Rules", rsp.Rules)
                setRules(rsp.Rules)
            })
            .finally(() => setTimeout(() => setLoading(false), 100))
    }, [visible])
    const styleDrawer = {width: "100vw", top, height: `calc(100vh - ${top + 1}px)`}
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
            setSelected(rowDate)
        },
        {wait: 200}
    ).run
    const onRemove = useMemoizedFn((rowDate: MITMContentReplacerRule) => {
        console.log("删除", rowDate)
    })

    const onOpenAddOrEdit = useMemoizedFn((rowDate?: MITMContentReplacerRule) => {
        console.log("编辑", rowDate)
        setModalVisible(true)
        setSelected(rowDate)
    })
    const onBan = useMemoizedFn((rowDate?: MITMContentReplacerRule) => {
        console.log("禁用", rowDate)
    })
    const columns: ColumnsTypeProps[] = [
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
            dataKey: "Result",
            width: 350,
            tip: "HTTP Header 与 HTTP Cookie 优先级较高，会覆盖文本内容",
            extra: <div className={styles["table-result-extra"]}>不替换</div>,
            render: (_, i: MITMContentReplacerRule) => {
                let node: ReactNode = <div>{i.Result}</div>
                if (i.ExtraHeaders.length > 0 || i.ExtraCookies.length > 0) {
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
                        <YakitSwitch size='small' disabled={i.Disabled} />
                    </div>
                )
            }
        },
        {
            title: "请求",
            dataKey: "EnableForRequest",
            render: (checked, record: MITMContentReplacerRule) => (
                <YakitCheckbox checked={checked} disabled={record.Disabled} />
            )
        },
        {
            title: "响应",
            dataKey: "EnableForResponse",
            render: (checked, record: MITMContentReplacerRule) => (
                <YakitCheckbox checked={checked} disabled={record.Disabled} />
            )
        },
        {
            title: "Header",
            dataKey: "EnableForHeader",
            render: (checked, record: MITMContentReplacerRule) => (
                <YakitCheckbox checked={checked} disabled={record.Disabled} />
            )
        },
        {
            title: "Body",
            dataKey: "EnableForBody",
            render: (checked, record: MITMContentReplacerRule) => (
                <YakitCheckbox checked={checked} disabled={record.Disabled} />
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
                >
                    {HitColor.map((item) => (
                        <YakitSelect.Option value={item.value}>
                            <div className={classNames(styles["table-hit-color-content"])}>
                                <div className={classNames(styles["table-hit-color"], item.className)} />
                                {item.title}
                            </div>
                        </YakitSelect.Option>
                    ))}
                </YakitSelect>
            )
        },
        {
            title: "追加 Tag",
            dataKey: "ExtraTag",
            render: (_) => {
                const text = ["公钥传输", "登陆/密码传输", "疑似JSONP"]
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
    return (
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
                    <YakitButton type='primary' className={styles["button-save"]}>
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
                                共 <span>6</span> 条规则
                            </div>
                        </div>
                    }
                    extra={
                        <div className={styles["table-title-body"]}>
                            <Test />
                            <div className={styles["table-switch"]}>
                                <span className={styles["switch-text"]}>全部禁用</span>
                                <YakitSwitch />
                            </div>
                            <Divider type='vertical' style={{margin: "0 16px"}} />
                            <div className={styles["table-switch"]}>
                                <span className={styles["switch-text"]}>全部不替换</span>
                                <YakitSwitch />
                            </div>
                            <YakitButton
                                type='outline2'
                                disabled={selectedRowKeys.length === 0}
                                className={classNames(styles["button-batch-remove"])}
                            >
                                批量删除
                                <ChevronDownIcon />
                            </YakitButton>
                            <ButtonColor type='primary' size='small'>
                                <div className={styles["button-add-rule"]}>
                                    <PlusIcon />
                                    新增规则
                                </div>
                            </ButtonColor>
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
    )
}
