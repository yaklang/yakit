import {Dispatch, SetStateAction, useMemo, type FC} from "react"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import {PlusIcon} from "@/assets/newIcon"
import {LightningBoltIcon} from "../icon/sidebarIcon"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineExportIcon, OutlineLoadingIcon, OutlinePencilaltIcon, OutlineTrashIcon} from "@/assets/icon/outline"

import styles from "../knowledgeBase.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {Divider} from "antd"
import {type} from "os"
import {tableHeaderGroupOptions} from "../utils"
import {HistorySearch} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {useMemoizedFn} from "ahooks"

export interface KnowledgeBaseTableHeaderProps extends KnowledgeBaseTableProps {
    setTableProps: Dispatch<
        SetStateAction<{
            type: (typeof tableHeaderGroupOptions)[number]["value"]
            tableTotal: number
            selectNum: number
        }>
    >
    tableProps: {
        type: (typeof tableHeaderGroupOptions)[number]["value"]
        tableTotal: number
        selectNum: number
    }
}

const KnowledgeBaseTableHeader: FC<KnowledgeBaseTableHeaderProps> = ({
    knowledgeBaseItems,
    onDeleteVisible,
    onEditVisible,
    onExportVisible,
    streams,
    setTableProps,
    tableProps
}) => {
    const tableHeaderSpin = useMemo(() => {
        return knowledgeBaseItems?.streamstep === 2 && streams?.[knowledgeBaseItems?.streamToken] ? (
            <div className={styles["building-knowledge-items"]}>
                <OutlineLoadingIcon className={styles["loading-icon"]} />
                构建知识条目中...
            </div>
        ) : null
    }, [knowledgeBaseItems?.streamToken, knowledgeBaseItems?.streamstep, streams])

    const tableHeaderSize = useMemo(() => {
        return (
            <div className={styles["header-left-total"]}>
                <div className={styles["caption"]}>Total</div>
                <div className={styles["number"]}>{tableProps.tableTotal ?? 0}</div>
                <Divider type='vertical' />
                <div className={styles["caption"]}>Selected</div>
                <div className={styles["number"]}>{tableProps.selectNum}</div>
            </div>
        )
    }, [tableProps])

    return (
        <div className={styles["table-header"]}>
            <div className={styles["table-header-first"]}>
                <div className={styles["header-left"]}>
                    {knowledgeBaseItems.icon ? <knowledgeBaseItems.icon className={styles["icon"]} /> : null}
                    <div className={styles["header-title"]}>{knowledgeBaseItems?.KnowledgeBaseName}</div>
                    <div className={styles["tag"]}>{knowledgeBaseItems?.KnowledgeBaseType}</div>
                </div>
                <div className={styles["header-right"]}>
                    <YakitButton type='text'>历史</YakitButton>
                    <div className={styles["ai-button"]}>
                        <LightningBoltIcon />
                        AI 召回
                    </div>
                    <YakitButton icon={<PlusIcon />} type='secondary2'>
                        添加
                    </YakitButton>
                    <YakitButton icon={<OutlineExportIcon />} type='secondary2' onClick={() => onExportVisible?.(true)}>
                        导出
                    </YakitButton>
                    <YakitButton icon={<OutlinePencilaltIcon />} type='text2' onClick={() => onEditVisible?.(true)} />
                    <YakitButton
                        className={styles["delete"]}
                        icon={<OutlineTrashIcon />}
                        type='text2'
                        color='danger'
                        onClick={() => onDeleteVisible?.(true)}
                    />
                </div>
            </div>
            <div className={styles["table-header-last"]}>{knowledgeBaseItems?.KnowledgeBaseDescription}</div>
            <div className={styles["table-content-header"]}>
                <div className={styles["header-left"]}>
                    <YakitRadioButtons
                        value={tableProps.type}
                        onChange={(e) => {
                            setTableProps((preValue) => ({
                                ...preValue,
                                type: e.target.value
                            }))
                        }}
                        buttonStyle='solid'
                        options={tableHeaderGroupOptions}
                    />
                    {tableHeaderSize}
                    {tableHeaderSpin}
                </div>
                <div className={styles["header-right"]}>
                    <HistorySearch
                        // showPopoverSearch={size?.width ? size?.width <= 1200 : true}
                        showPopoverSearch={false}
                        hint={false}
                        addonBeforeOption={[
                            {
                                label: "关键字",
                                value: "all"
                            }
                        ]}
                        handleSearch={useMemoizedFn((searchValue, searchType) => {
                            // setQuery((prev) => {
                            //     return {
                            //         ...prev,
                            //         Keyword: searchValue,
                            //         KeywordType: searchType
                            //     }
                            // })
                        })}
                    />
                </div>
            </div>
        </div>
    )
}

export {KnowledgeBaseTableHeader}
