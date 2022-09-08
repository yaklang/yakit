import { AutoCard } from "@/components/AutoCard"
import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList";
import { NetWorkApi } from "@/services/fetch";
import { API } from "@/services/swagger/resposeType";
import { failed } from "@/utils/notification";
import { getRandomInt } from "@/utils/randomUtil";
import { LoadingOutlined } from "@ant-design/icons";
import { useMemoizedFn } from "ahooks";
import { Timeline, Button, Card, Spin } from "antd";
import moment from "moment";
import React, { useEffect, useState } from "react"
import './YakitPluginOnlineJournal.scss'

const { ipcRenderer } = window.require("electron")

interface YakitPluginOnlineJournalProps {
    pluginId: number
}

const defData = [
    {
        id: 1,
        time: '2022-8-25  13：53',
        content: '插件已删除',
    },
    {
        id: 2,
        time: '2022-8-25  13：40',
        content: '通过张三的修改申请',
    },
    {
        id: 3,
        time: '2022-8-25  13：40 ',
        content: '张三申请修改插件',
    },
    {
        id: 4,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 5,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 6,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 7,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 8,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 9,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
    {
        id: 10,
        time: '2022-8-25  13：20',
        content: '管理员桔子爱吃橘子修改插件',
    },
]

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
                            <Timeline.Item>
                                {item.id}-
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