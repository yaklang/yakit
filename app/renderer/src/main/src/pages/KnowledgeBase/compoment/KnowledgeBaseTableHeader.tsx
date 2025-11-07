import {Dispatch, SetStateAction, useEffect, useMemo, type FC} from "react"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import {ChevronDownIcon, PlusIcon} from "@/assets/newIcon"
import {LightningBoltIcon} from "../icon/sidebarIcon"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineExportIcon,
    OutlineExternallinkIcon,
    OutlineLoadingIcon,
    OutlinePencilaltIcon,
    OutlineTimeIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"

import styles from "../knowledgeBase.module.scss"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {Divider} from "antd"
import {tableHeaderGroupOptions} from "../utils"
import {useSafeState} from "ahooks"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {AddKnowledgeBaseModal} from "./AddKnowledgeBaseModal"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {KnowledgeBaseQA} from "../compoments/KnowledgeBaseQA"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"

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
    setQuery?: Dispatch<SetStateAction<string>>
    query?: string
}

const KnowledgeBaseTableHeader: FC<KnowledgeBaseTableHeaderProps & {setLinkId: Dispatch<SetStateAction<string[]>>}> = ({
    knowledgeBaseItems,
    onDeleteVisible,
    onEditVisible,
    onExportVisible,
    streams,
    setTableProps,
    tableProps,
    setQuery,
    setLinkId
}) => {
    const [searchValue, setSearchValue] = useSafeState("")
    const [addModalData, setAddModalData] = useSafeState<{visible: boolean; KnowledgeBaseName: string}>({
        visible: false,
        KnowledgeBaseName: ""
    })

    const [qaDrawerVisible, setQaDrawerVisible] = useSafeState(false)

    useEffect(() => {
        setQuery?.("")
        setSearchValue("")
    }, [tableProps.type, knowledgeBaseItems.ID])

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
                {tableProps.type !== "Vector" ? (
                    <>
                        <Divider type='vertical' />
                        <div className={styles["caption"]}>Selected</div>
                        <div className={styles["number"]}>{tableProps.selectNum}</div>{" "}
                    </>
                ) : null}
            </div>
        )
    }, [tableProps])

    const onOpenAddKnowledgeBaseModal = () => {
        setAddModalData({
            visible: true,
            KnowledgeBaseName: knowledgeBaseItems.KnowledgeBaseName
        })
    }

    return (
        <div className={styles["table-header"]}>
            <div className={styles["table-header-first"]}>
                <div className={styles["header-left"]}>
                    {knowledgeBaseItems.icon ? <knowledgeBaseItems.icon className={styles["icon"]} /> : null}
                    <div className={styles["header-title"]}>{knowledgeBaseItems?.KnowledgeBaseName}</div>
                    <div className={styles["tag"]}>{knowledgeBaseItems?.KnowledgeBaseType}</div>
                </div>
                <div className={styles["header-right"]}>
                    {knowledgeBaseItems.historyGenerateKnowledgeList?.length > 0 ? (
                        <YakitPopover
                            overlayClassName={styles["knowledge-history-popover"]}
                            content={
                                <div className={styles["knowledge-history-content"]}>
                                    <div className={styles["title"]}>
                                        <div>历史生成记录</div>
                                        <div className={styles["history-size"]}>
                                            {knowledgeBaseItems.historyGenerateKnowledgeList.length}
                                        </div>
                                    </div>
                                    {knowledgeBaseItems.historyGenerateKnowledgeList.map((it, key) => {
                                        return (
                                            <div key={it.token} className={styles["history-content"]}>
                                                <div className={styles["content-first"]}>
                                                    <div>{it.name}</div>
                                                    <div className={styles["tag"]}>
                                                        <OutlineLoadingIcon className={styles["loading-icon"]} />
                                                        生成中
                                                    </div>
                                                </div>
                                                <div className={styles["content-last"]}>
                                                    <div> {it.date}</div>
                                                    <OutlineExternallinkIcon className={styles["external-link-icon"]} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            }
                            trigger='click'
                            placement='bottomRight'
                        >
                            <YakitButton icon={<OutlineTimeIcon />} type='text2'>
                                历史
                                <ChevronDownIcon />
                            </YakitButton>
                        </YakitPopover>
                    ) : null}
                    <div className={styles["ai-button"]} onClick={() => setQaDrawerVisible(true)}>
                        <LightningBoltIcon />
                        AI 召回
                    </div>
                    <YakitButton
                        disabled={!knowledgeBaseItems.streamstep || knowledgeBaseItems.streamstep !== "success"}
                        icon={<PlusIcon />}
                        type='secondary2'
                        onClick={() => onOpenAddKnowledgeBaseModal()}
                    >
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
                            setLinkId([])
                        }}
                        buttonStyle='solid'
                        options={tableHeaderGroupOptions}
                    />
                    {tableHeaderSize}
                    {tableHeaderSpin}
                </div>
                <div className={styles["header-right"]}>
                    <YakitInput.Search
                        value={searchValue}
                        onSearch={(value) => {
                            setSearchValue(value)
                            setQuery?.(value)
                        }}
                        allowClear
                        onChange={(e) => setSearchValue?.(e.target.value)}
                        placeholder='请输入搜索关键词'
                        onPressEnter={(e) => {
                            e.preventDefault()
                            setSearchValue(e.currentTarget.value)
                            setQuery?.(e.currentTarget.value)
                        }}
                    />
                </div>
            </div>
            <AddKnowledgeBaseModal addModalData={addModalData} setAddModalData={setAddModalData} />
            <YakitDrawer
                title={`AI问答 - ${knowledgeBaseItems?.KnowledgeBaseName || "知识库"}`}
                placement='right'
                width={600}
                visible={qaDrawerVisible}
                onClose={() => setQaDrawerVisible(false)}
                bodyStyle={{padding: 0, height: "100%", display: "flex", flexDirection: "column"}}
            >
                <KnowledgeBaseQA
                    knowledgeBase={{...knowledgeBaseItems, ID: parseInt(knowledgeBaseItems.ID, 10)}}
                    queryAllCollectionsDefault={false}
                />
            </YakitDrawer>
        </div>
    )
}

export {KnowledgeBaseTableHeader}
