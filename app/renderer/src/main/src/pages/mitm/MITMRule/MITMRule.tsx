import {Button, Divider, Drawer, Switch, Tag} from "antd"
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
import {TagsList} from "@/components/baseTemplate/BaseTags"
import {YakitTag} from "@/components/yakit/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakit/YakitSwitch/YakitSwitch"
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton"

const {ipcRenderer, shell} = window.require("electron")

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
                        <YakitSwitch size='small' />
                    </div>
                )
            }
        },
        {
            title: "禁用",
            dataKey: "Disabled"
        },
        {
            title: "不修改流量",
            dataKey: "NoReplace"
        },
        {
            title: "请求",
            dataKey: "EnableForRequest"
        },
        {
            title: "响应",
            dataKey: "EnableForResponse"
        },
        {
            title: "Header",
            dataKey: "EnableForHeader"
        },
        {
            title: "Body",
            dataKey: "EnableForBody"
        },
        // {
        //     title: "修改 Cookie 与 Header",
        //     dataKey: "ExtraHeaders",
        //     width: 180,
        //     render: (_, i: MITMContentReplacerRule) => {
        //         if (i.ExtraHeaders.length > 0 || i.ExtraCookies.length > 0) {
        //             return (
        //                 <div>
        //                     {i.ExtraHeaders.length > 0 && <Tag>额外 HTTP Header: {i.ExtraHeaders.length}</Tag>}
        //                     {i.ExtraCookies.length > 0 && <Tag>额外 HTTP Cookie: {i.ExtraCookies.length}</Tag>}
        //                 </div>
        //             )
        //         }
        //         return ""
        //     }
        // },
        {
            title: "命中颜色",
            dataKey: "Color"
        },
        {
            title: "追加 Tag",
            dataKey: "ExtraTag"
        },
        {
            title: "操作",
            dataKey: "action",
            fixed: "right",
            render: (_, record: MITMContentReplacerRule) => {
                return (
                    <div className={styles["table-action-icon"]}>
                        <TrashIcon className={styles["icon-trash"]} onClick={() => onRemove(record)} />
                        <PencilAltIcon className={styles["action-icon"]} onClick={() => onOpenAddOrEdit(record)} />
                        <BanIcon className={styles["action-icon"]} onClick={() => onBan(record)} />
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
