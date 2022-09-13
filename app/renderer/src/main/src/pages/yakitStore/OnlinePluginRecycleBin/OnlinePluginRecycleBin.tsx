import { RollingLoadList } from "@/components/RollingLoadList"
import { NetWorkApi } from "@/services/fetch"
import { API } from "@/services/swagger/resposeType"
import { failed } from "@/utils/notification"
import { useMemoizedFn } from "ahooks"
import { Button, Card, Checkbox, Col, Row, Spin, Tag, Input } from "antd"
import { useEffect, useState } from "react"
import { PluginItemOnline, SearchPluginOnlineRequest } from "../YakitStorePage"
import './OnlinePluginRecycleBin.scss'
import '../YakitStorePage.scss'

const { Search } = Input

export const OnlinePluginRecycleBin: React.FC = () => {
    const [keyword, setKeyword] = useState<string>("")
    const [selectedRowKeysRecord, setSelectedRowKeysRecordUser] = useState<API.YakitPluginDetail[]>([])
    const [total, setTotal] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)

    const onSelectAll = useMemoizedFn((checked) => {
        setIsSelectAll(checked)
        if (!checked) {
            setSelectedRowKeysRecordUser([]) // 清除本地
        }
    })
    return (
        <Card
            bordered={false}
            bodyStyle={{ padding: 0, height: "calc(100% - 64px)" }}
            style={{ border: 0, height: "100%", }}
            title={
                <div className="search-input-body">
                    <Search
                        placeholder='输入关键字搜索'
                        size="middle"
                        enterButton="搜索"
                        onSearch={() => setRefresh(!refresh)}
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                        }}
                    />
                </div>
            }
            size={"small"}
            className='left-list'
        >
            <div className='height-100'>
                <Row className='row-body' gutter={12}>
                    <Col span={16} className='col'>
                        <Checkbox checked={isSelectAll} onChange={(e) => onSelectAll(e.target.checked)}>
                            全选
                        </Checkbox>
                        {selectedRowKeysRecord.length > 0 && (
                            <Tag color='blue'>已选{isSelectAll ? total : selectedRowKeysRecord.length}条</Tag>
                        )}
                        <Tag>Total:{total}</Tag>
                    </Col>
                    <Col span={8} className='col-flex-end'>
                        <Button type="primary" size="small" danger>删除</Button>
                        <Button type="primary" size="small" >还原</Button>
                    </Col>
                </Row>
                <div className='list-height'>
                    <YakRecycleBinList
                        keyword={keyword}
                        selectedRowKeysRecord={selectedRowKeysRecord}
                        onSelectList={setSelectedRowKeysRecordUser} //选择一个
                        isSelectAll={isSelectAll}
                        setIsSelectAll={setIsSelectAll}
                        setTotal={setTotal}
                        refresh={refresh}
                    />
                </div>
            </div>
        </Card>
    )
}

interface RecycleBinRequest extends API.PageMeta {
    keyword: string
}
interface YakRecycleBinListProps {
    keyword: string
    setTotal: (n: number) => void
    selectedRowKeysRecord: API.YakitPluginDetail[]
    onSelectList: (m: API.YakitPluginDetail[]) => void
    isSelectAll: boolean
    refresh: boolean
    setIsSelectAll: (b: boolean) => void
}

const YakRecycleBinList: React.FC<YakRecycleBinListProps> = (props) => {
    const {
        keyword,
        setTotal,
        selectedRowKeysRecord,
        onSelectList,
        isSelectAll,
        refresh,
        setIsSelectAll
    } = props
    const [response, setResponse] = useState<API.YakitPluginListResponse>({
        data: [],
        pagemeta: {
            limit: 40,
            page: 1,
            total: 0,
            total_page: 1
        }
    })
    const [loading, setLoading] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [isRef, setIsRef] = useState(false)
    const [listBodyLoading, setListBodyLoading] = useState(false)

    useEffect(() => {
        if (isSelectAll) {
            onSelectList([...response.data])
        }
    }, [isSelectAll])
    useEffect(() => {
        setListBodyLoading(true)
        search(1)
    }, [refresh,])
    const search = useMemoizedFn((page: number) => {
        const payload = {
            keyword,
            page,
            limit: 10,
            total: 0,
            total_page: 0,
            order_by: 'stars',
            order: 'desc',
            bind_me: false
        }
        setLoading(true)
        NetWorkApi<SearchPluginOnlineRequest, API.YakitPluginListResponse>({
            method: "get",
            url: 'yakit/plugin',
            params: {
                page: payload.page,
                order_by: payload.order_by,
                limit: payload.limit,
                order: payload.order,
                bind_me: false
            },
            data: payload
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const data = page === 1 ? res.data : response.data.concat(res.data)
                const isMore = res.data.length < res.pagemeta.limit
                setHasMore(!isMore)
                if (payload.page > 1 && isSelectAll) {
                    onSelectList(data)
                }
                setResponse({
                    ...res,
                    data: [...data]
                })
                setTotal(res.pagemeta.total)
                if (page === 1) {
                    setIsRef(!isRef)
                }
            })
            .catch((err) => {
                failed("插件列表获取失败:" + err)
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                    setListBodyLoading(false)
                }, 200)
            })
    })
    const loadMoreData = useMemoizedFn(() => {
        if (hasMore) search(response.pagemeta.page + 1)
    })
    const onSelect = useMemoizedFn((item: API.YakitPluginDetail) => {
        const index = selectedRowKeysRecord.findIndex((ele) => ele.id === item.id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
        } else {
            selectedRowKeysRecord.splice(index, 1)
        }
        setIsSelectAll(false)
        onSelectList([...selectedRowKeysRecord])
    })
    return (
        <Spin spinning={listBodyLoading}>
            <RollingLoadList<API.YakitPluginDetail>
                isRef={isRef}
                data={response.data}
                page={response.pagemeta.page}
                hasMore={hasMore}
                loading={loading}
                loadMoreData={() => loadMoreData()}
                rowKey='id'
                isGridLayout={true}
                defItemHeight={170}
                classNameRow='plugin-list'
                classNameList='plugin-list-body'
                renderRow={(data: API.YakitPluginDetail, index: number) => (
                    <PluginItemOnline
                        currentId={0}
                        isAdmin={false}
                        info={data}
                        selectedRowKeysRecord={selectedRowKeysRecord}
                        onSelect={onSelect}
                        onClick={(info) => { }}
                        onDownload={() => { }}
                        onStarred={() => { }}
                        bind_me={true}
                    />
                )}
            />
        </Spin>
    )
}