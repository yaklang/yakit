import { AutoCard } from "@/components/AutoCard"
import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList";
import { NetWorkApi } from "@/services/fetch";
import { API } from "@/services/swagger/resposeType";
import { failed } from "@/utils/notification";
import { getRandomInt } from "@/utils/randomUtil";
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useMemoizedFn } from "ahooks";
import { Timeline, Button, Card, Spin } from "antd";
import moment from "moment";
import React, { useEffect, useState } from "react"
import './YakitPluginOnlineJournal.scss'

const { ipcRenderer } = window.require("electron")

interface YakitPluginOnlineJournalProps {
    pluginId: number
}

interface JournalProps {
    id: number
    time: string
    content: string
}

interface SearchApplyUpdatePluginRequest {

}


export const YakitPluginOnlineJournal: React.FC<YakitPluginOnlineJournalProps> = (props) => {
    const { pluginId, } = props;
    const [detailsVisible, setDetailsVisible] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [lineLoading, setLineLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [resJournal, setResJournal] = useState<API.ApplyListResponses>({
        pagemeta: {
            page: 1,
            limit: 10,
            total: 0,
            total_page: 1,
        },
        data: []
    })
    const [isRef, setIsRef] = useState(false)
    useEffect(() => {
        if (pluginId >= 0) getJournalList(1)
    }, [pluginId])
    const getJournalList = useMemoizedFn((page: number) => {
        const payload = {
            ...resJournal.pagemeta,
            page
        }
        setLineLoading(true)
        NetWorkApi<SearchApplyUpdatePluginRequest, API.ApplyListResponses>({
            method: "get",
            url: 'apply/update/plugin',
            params: {
                page: payload.page,
                limit: payload.limit,
                id: pluginId
            },
        }).then((res) => {
            if (!res.data) {
                res.data = []
            }
            console.log('res.data', res.data);
            const data = payload.page === 1 ? res.data : resJournal.data.concat(res.data)
            const isMore = res.data.length < resJournal.pagemeta.limit
            setHasMore(!isMore)
            setResJournal({
                ...resJournal,
                data: [...data]
            })
            if (payload.page === 1) {
                setIsRef(!isRef)
            }
        }).catch((err) => {
            failed("获取插件日志列表失败:" + err)
        })
            .finally(() => {
                setTimeout(() => {
                    setLineLoading(false)
                }, 200)
            })
    })
    const loadMoreData = useMemoizedFn(() => {
        getJournalList(resJournal.pagemeta.page + 1)
    })

    const onGoDetails = useMemoizedFn((item: API.ApplyPluginLists) => {
        ipcRenderer.invoke("send-to-tab", {
            type: "yakit-plugin-journal-details",
            data: {
                YakScriptJournalDetailsId: item.id
            }
        })
    })
    const showDot = useMemoizedFn((status) => {
        switch (status) {
            case 0:
                return <InfoCircleOutlined />
            case 1: //1合并
                return <CheckCircleOutlined style={{ color: '#52c41a' }} />
            case 2: //2拒绝
                return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            default:
                return <InfoCircleOutlined />
        }
    })
    return (
        <div className="journal-content">
            <Spin spinning={lineLoading}>
                <Timeline>
                    <RollingLoadList<API.ApplyPluginLists>
                        data={resJournal.data}
                        page={resJournal.pagemeta.page}
                        hasMore={hasMore}
                        loading={loading}
                        loadMoreData={() => loadMoreData()}
                        rowKey='id'
                        defItemHeight={52}
                        renderRow={(item: API.ApplyPluginLists, index) => (
                            <Timeline.Item dot={showDot(item.merge_status)}>
                                {moment.unix(item.created_at).format("YYYY-MM-DD HH:mm")}
                                &emsp;
                                {item.role === 'admin' && `管理员${item.user_name}修改插件` || `${item.user_name}申请修改插件`}
                                <Button type="link" onClick={() => onGoDetails(item)}>详情</Button>
                            </Timeline.Item>
                        )}
                    />
                </Timeline>
            </Spin>
        </div>
    )
}