import React, {useEffect, useState} from "react"
import {NotepadManageProps} from "./NotepadManageType"
import styles from "./NotepadManage.module.scss"
import {TableTotalAndSelectNumber} from "@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineChevrondownIcon,
    OutlineChevronupIcon,
    OutlineClouddownloadIcon,
    OutlinePencilIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlineSearchIcon,
    OutlineShareIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {Avatar, Divider, Tooltip} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {VirtualColumns, VirtualTable} from "@/pages/dynamicControl/VirtualTable"
import {API} from "@/services/swagger/resposeType"
import {useDebounceFn, useMemoizedFn} from "ahooks"
import {PaginationSchema} from "@/pages/invoker/schema"
import {YakitMenu} from "@/components/yakitUI/YakitMenu/YakitMenu"
import moment from "moment"
import {ListSelectFilterPopover, YakitVirtualList} from "../YakitVirtualList/YakitVirtualList"
import {ListSelectOptionProps, VirtualListColumns} from "../YakitVirtualList/YakitVirtualListType"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {AuthorImg} from "@/pages/plugins/funcTemplate"

const timeMap = {
    created_at: "最近创建时间",
    updated_at: "最近更新时间"
}

interface NotepadQuery {
    keyWords: string
    authorList: string[]
}
const NotepadManage: React.FC<NotepadManageProps> = React.memo((props) => {
    const [loading, setLoading] = useState<boolean>(true)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [timeSortVisible, setTimeSortVisible] = useState<boolean>(false)
    const [data, setData] = useState<any[]>([])
    const [sorterKey, setSorterKey] = useState<string>("updated_at")
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
    const [isAllSelect, setIsAllSelect] = useState<boolean>(false)

    const [refresh, setRefresh] = useState<boolean>(true)

    const [authors, setAuthors] = useState<ListSelectOptionProps[]>([])

    const [query, setQuery] = useState<NotepadQuery>({
        keyWords: "",
        authorList: []
    })

    const [pagination, setPagination] = useState<PaginationSchema>({
        Limit: 20,
        Order: "desc",
        OrderBy: "updated_at",
        Page: 1
    })
    const columns: VirtualListColumns[] = [
        {
            title: "文件名称",
            dataIndex: "name"
        },
        {
            title: "作者",
            dataIndex: "author",
            render: (text, record) => (
                <div className={styles["author-cell"]}>
                    <AuthorImg src={record.authorImg} />
                    <span className='content-ellipsis'>{record.author}</span>
                </div>
            ),
            filterProps: {
                filterRender: () => (
                    <ListSelectFilterPopover
                        option={authors}
                        selectKeys={query.authorList}
                        onSetValue={onSetAuthor}
                        filterOption={true}
                    >
                        <YakitButton type='text2'>
                            <span style={{lineHeight: "16px"}}>作者</span>
                            <OutlineSearchIcon className={styles["search-icon"]} />
                        </YakitButton>
                    </ListSelectFilterPopover>
                )
            }
        },
        {
            title: "协作人",
            dataIndex: "collaborators",
            render: (text, record) => (
                <Avatar.Group maxCount={2} maxStyle={{color: "#B4BBCA", backgroundColor: "#f0f1f3"}}>
                    {record.collaborators.map((ele) => (
                        <Tooltip key={ele.id} title={ele.name} placement='top'>
                            <Avatar src={ele.img} />
                        </Tooltip>
                    ))}
                </Avatar.Group>
            )
        },
        {
            title: "最近更新时间",
            dataIndex: sorterKey,
            render: (text) => <div className={styles["time-cell"]}>{moment.unix(text).format("YYYY-MM-DD HH:mm")}</div>,
            filterProps: {
                filterRender: () => (
                    <YakitDropdownMenu
                        menu={{
                            data: [
                                {
                                    key: "updated_at",
                                    label: "最近更新时间"
                                },
                                {
                                    key: "created_at",
                                    label: "最近创建时间"
                                }
                            ],
                            onClick: ({key}) => {
                                setSorterKey(key)
                                setTimeSortVisible(false)
                            }
                        }}
                        dropdown={{
                            visible: timeSortVisible,
                            onVisibleChange: setTimeSortVisible
                        }}
                    >
                        <YakitButton type='text2'>
                            <span style={{marginRight: 8}}>{timeMap[sorterKey]}</span>
                            {timeSortVisible ? <OutlineChevronupIcon /> : <OutlineChevrondownIcon />}
                        </YakitButton>
                    </YakitDropdownMenu>
                )
            }
        },
        {
            title: "操作",
            dataIndex: "action",
            width: 180,
            render: (text, record) => (
                <div>
                    <YakitButton type='text2' icon={<OutlinePencilaltIcon />} onClick={() => {}} />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton type='text2' icon={<OutlineShareIcon />} onClick={() => {}} />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton type='text2' icon={<OutlineClouddownloadIcon />} onClick={() => {}} />
                    <Divider type='vertical' style={{margin: "0 8px"}} />
                    <YakitButton danger type='text' icon={<OutlineTrashIcon />} onClick={() => {}} />
                </div>
            )
        }
    ]
    useEffect(() => {
        console.log("query", query)
        getList()
    }, [refresh])
    useEffect(() => {
        getList()
    }, [])
    const onSetAuthor = useMemoizedFn((value: string[]) => {
        setQuery((v) => ({...v, authorList: value}))
        setRefresh(!refresh)
    })
    const getList = useMemoizedFn(() => {
        const arr = Array.from({length: 200}).map((_, index) => ({
            id: index,
            authorId: index,
            author: `作者-${index}`,
            authorImg: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500",
            name: `记事本-${index}`,
            collaborators: [
                {
                    id: index,
                    name: "张三",
                    img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
                },
                {
                    id: index + 1,
                    name: "张三",
                    img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
                },
                {
                    id: index + 2,
                    name: "张三",
                    img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
                },
                {
                    id: index + 3,
                    name: "张三",
                    img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
                },
                {
                    id: index + 4,
                    name: "张三",
                    img: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
                }
            ],
            updated_at: moment().valueOf(),
            created_at: moment().valueOf()
        }))
        const authorArr: ListSelectOptionProps[] = Array.from({length: 200}).map((_, index) => ({
            value: `${index}`,
            label: `作者${index}`,
            heardImgSrc: "https://img2.baidu.com/it/u=3239145147,4288448155&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500"
        }))
        setData(arr)
        setAuthors(authorArr)
    })
    const updateLoadMore = useDebounceFn(
        (page: number) => {
            // if (page > Math.ceil(total / pagination.Limit)) {
            //     setHasMore(false)
            //     return
            // }
            // setLoading(true)
            // setHasMore(true)
            // const paginationProps = {
            //     page: page || 1,
            //     limit: pagination.Limit
            // }
        },
        {wait: 200}
    )
    const onSelectAll = useMemoizedFn((newSelectedRowKeys: string[], select, checked: boolean) => {
        setIsAllSelect(checked)
        setSelectedRowKeys(newSelectedRowKeys)
    })
    const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows) => {
        if (c) {
            setSelectedRowKeys([...selectedRowKeys, keys])
        } else {
            setIsAllSelect(false)
            const newSelectedRowKeys = selectedRowKeys.filter((ele) => ele !== keys)
            setSelectedRowKeys(newSelectedRowKeys)
        }
    })
    return (
        <div className={styles["notepad-manage"]}>
            <div className={styles["notepad-manage-heard"]}>
                <div className={styles["heard-title"]}>
                    <span>记事本管理</span>
                    <TableTotalAndSelectNumber total={10} selectNum={0} />
                </div>
                <div className={styles["heard-extra"]}>
                    <YakitInput.Search
                        placeholder='请输入关键词搜索'
                        value={query.keyWords}
                        onChange={(e) => setQuery({...query, keyWords: e.target.value})}
                    />
                    <YakitButton type='outline2' danger icon={<OutlineTrashIcon />}>
                        删除
                    </YakitButton>
                    <YakitButton type='outline2' icon={<OutlineClouddownloadIcon />}>
                        批量下载
                    </YakitButton>
                    <Divider type='vertical' style={{margin: 0}} />
                    <YakitButton type='primary' icon={<OutlinePlusIcon />}>
                        新建
                    </YakitButton>
                </div>
            </div>
            <YakitVirtualList
                columns={columns}
                data={data}
                rowSelection={{
                    isAll: isAllSelect,
                    type: "checkbox",
                    selectedRowKeys,
                    onSelectAll: onSelectAll,
                    onChangeCheckboxSingle: onSelectChange,
                    getCheckboxProps: (record) => {
                        return {
                            disabled: record.authorId % 2 === 0
                        }
                    }
                }}
            />
        </div>
    )
})

export default NotepadManage
