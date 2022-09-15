import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList"
import { NetWorkApi } from "@/services/fetch"
import { API } from "@/services/swagger/resposeType"
import { failed } from "@/utils/notification"
import { useMemoizedFn } from "ahooks"
import { Button, Card, Checkbox, Col, Row, Spin, Tag, Input, Popconfirm } from "antd"
import { useEffect, useState } from "react"
import { defQueryOnline, PluginItemOnline, SearchPluginOnlineRequest, YakModuleOnlineList } from "../YakitStorePage"
import './OnlinePluginRecycleBin.scss'
import '../YakitStorePage.scss'
import { useStore } from "@/store"
import { LoadingOutlined, ReloadOutlined } from "@ant-design/icons"
import { tips } from "@/alibaba/ali-react-table-dist/dist/pipeline/features"

const { Search } = Input

export const OnlinePluginRecycleBin: React.FC = () => {
    const [queryRecycleBin, setQueryRecycleBin] = useState<SearchPluginOnlineRequest>({
        ...defQueryOnline,
        recycle: true
    })
    const [selectedRowKeysRecord, setSelectedRowKeysRecord] = useState<API.YakitPluginDetail[]>([])
    const [currentItem, setCurrentItem] = useState<API.YakitPluginDetail>()
    const [total, setTotal] = useState<number>(0)
    const [refresh, setRefresh] = useState(false)
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false)
    const [recycleLoading, setRecycleLoading] = useState<boolean>(false)
    const { userInfo } = useStore()
    const onSelectAll = useMemoizedFn((checked) => {
        setIsSelectAll(checked)
        if (!checked) {
            setSelectedRowKeysRecord([]) // 清除本地
        }
    })
    const onSelect = useMemoizedFn((item: API.YakitPluginDetail) => {
        const index = selectedRowKeysRecord.findIndex((ele) => ele.id === item.id)
        if (index === -1) {
            selectedRowKeysRecord.push(item)
        } else {
            selectedRowKeysRecord.splice(index, 1)
        }
        setIsSelectAll(false)
        setSelectedRowKeysRecord([...selectedRowKeysRecord])
    })
    const onReduction = (item: API.YakitPluginDetail) => {
        setCurrentItem(item)
        const params: API.UpPluginRecycleRequest = {
            dump: false,
            ids: [item.id]
        }
        onReductionOrRemove(params)
    }
    const onBatchOperation = useMemoizedFn((type: boolean) => {
        let params: API.UpPluginRecycleRequest = {
            dump: type,
        }
        if (isSelectAll || selectedRowKeysRecord.length === 0) {
            params = {
                ...params,
                keywords: queryRecycleBin.keywords
            }
            // 默认删除全部
            onReductionOrRemove(params)
        } else {
            params = {
                ...params,
                ids: selectedRowKeysRecord.map(ele => ele.id)
            }
            onReductionOrRemove(params)
        }
    })
    const onReductionOrRemove = (params: API.UpPluginRecycleRequest) => {
        setRecycleLoading(true)
        NetWorkApi<API.UpPluginRecycleRequest, API.ActionSucceeded>({
            method: "post",
            url: "yakit/plugin/recycle",
            data: params
        })
            .then((res) => {
                onRefresh()
            })
            .catch((err) => {
                failed("还原或者删除失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setRecycleLoading(false), 200)
            })
    }

    const onTips = useMemoizedFn((type: boolean) => {
        let typeTest = type ? '删除' : '还原'
        if (isSelectAll || selectedRowKeysRecord.length === 0) {
            return `是否${typeTest}所有的数据?${type && '不可恢复' || ''}`
        } else {
            return `是否${typeTest}所选择的的数据?${type && '不可恢复' || ''}`
        }
    })

    const onRefresh = useMemoizedFn(() => {
        setRefresh(!refresh)
        setSelectedRowKeysRecord([])
        setIsSelectAll(false)
    })
    const onRefList = useMemoizedFn(() => {
        setQueryRecycleBin({
            ...queryRecycleBin,
            keywords: ''
        })
        setSelectedRowKeysRecord([])
        setIsSelectAll(false)
        setTimeout(() => {
            setRefresh(!refresh)
        }, 200)
    })
    return (
        <Card
            bordered={false}
            bodyStyle={{ padding: 0, height: "calc(100% - 64px)" }}
            style={{ border: 0, height: "100%", }}
            title={
                <div className="recycle-search-input">
                    <div className="recycle-left">
                        <div className="recycle-left-title">插件回收站</div>
                        <ReloadOutlined className="recycle-left-refresh" onClick={onRefList} />
                    </div>
                    <Search
                        placeholder='输入关键字搜索'
                        size="middle"
                        enterButton="搜索"
                        onSearch={() => onRefresh()}
                        value={queryRecycleBin.keywords}
                        onChange={(e) => {
                            setQueryRecycleBin({
                                ...queryRecycleBin,
                                keywords: e.target.value
                            })
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
                        <Popconfirm
                            title={onTips(true)}
                            onConfirm={() => onBatchOperation(true)}
                            okText="Yes"
                            cancelText="No"
                            placement="topRight"
                        >
                            <Button type="primary" size="small" danger disabled={!userInfo.isLogin}>删除</Button>
                        </Popconfirm>
                        <Popconfirm
                            title={onTips(false)}
                            onConfirm={() => onBatchOperation(false)}
                            okText="Yes"
                            cancelText="No"
                            placement="topRight"
                        >
                            <Button type="primary" size="small" disabled={!userInfo.isLogin}>还原</Button>
                        </Popconfirm>
                    </Col>
                </Row>
                <div className='list-height'>
                    <YakModuleOnlineList
                        size="middle"
                        currentId={0}
                        queryOnline={queryRecycleBin}
                        selectedRowKeysRecord={selectedRowKeysRecord}
                        onSelectList={setSelectedRowKeysRecord} //选择一个
                        isSelectAll={isSelectAll}
                        setIsSelectAll={setIsSelectAll}
                        setTotal={setTotal}
                        onClicked={(info, index) => { }}
                        userInfo={userInfo}
                        bind_me={false}
                        refresh={refresh}
                        renderRow={(data: API.YakitPluginDetail, index: number) => (
                            <PluginItemOnline
                                currentId={0}
                                isAdmin={userInfo.role === 'admin'}
                                info={data}
                                selectedRowKeysRecord={selectedRowKeysRecord}
                                onSelect={onSelect}
                                onClick={(info) => { }}
                                bind_me={true}
                                extra={currentItem && currentItem.id === data.id && recycleLoading && <LoadingOutlined className='plugin-down' /> || <a href="#" onClick={() => onReduction(data)}>还原</a>}
                            />
                        )}
                    />
                </div>
            </div>
        </Card>
    )
}