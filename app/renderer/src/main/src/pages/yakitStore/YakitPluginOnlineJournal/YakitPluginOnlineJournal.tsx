import { AutoCard } from "@/components/AutoCard"
import { RollingLoadList } from "@/components/RollingLoadList/RollingLoadList";
import { API } from "@/services/swagger/resposeType";
import { getRandomInt } from "@/utils/randomUtil";
import { LoadingOutlined } from "@ant-design/icons";
import { useMemoizedFn } from "ahooks";
import { Timeline, Button, Card, Spin } from "antd";
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

interface ResJournalProps {
    data: JournalProps[]
    pagemeta: API.PageMeta
}


export const YakitPluginOnlineJournal: React.FC<YakitPluginOnlineJournalProps> = (props) => {
    const { pluginId, } = props;
    const [detailsVisible, setDetailsVisible] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [lineLoading, setLineLoading] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [resJournal, setResJournal] = useState<ResJournalProps>({
        pagemeta: {
            page: 1,
            limit: 10,
            total: 50,
            total_page: 5
        },
        data: []
    })
    useEffect(() => {
        if (pluginId >= 0) getJournalList()
    }, [pluginId])
    const getJournalList = useMemoizedFn(() => {
        setLineLoading(true)
        const newData: JournalProps[] = [];
        for (let index = 0; index < 10; index++) {
            const element: JournalProps = defData[index];
            newData.push(element)
        }
        setHasMore(resJournal.data.length < 40)
        setResJournal({
            data: resJournal.data.concat(newData),
            pagemeta: {
                page: resJournal.pagemeta.page + 1,
                limit: 10,
                total: 50,
                total_page: 5
            }
        })
        setLineLoading(false)
    })
    const loadMoreData = useMemoizedFn(() => {
        setLoading(true)
        const newData: JournalProps[] = [];
        for (let index = resJournal.data.length; index < resJournal.data.length + 10; index++) {
            const element: JournalProps = {
                ...resJournal.data[0],
                id: getRandomInt(1000)
            }
            newData.push(element)
        }
        setHasMore(resJournal.data.length < 40)
        setTimeout(() => {
            setResJournal({
                data: resJournal.data.concat(newData),
                pagemeta: {
                    page: resJournal.pagemeta.page + 1,
                    limit: 10,
                    total: 50,
                    total_page: 5
                }
            })
            setLoading(false)
        }, 500);
    })

    const onGoDetails = useMemoizedFn((item: JournalProps) => {
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
                    <RollingLoadList<JournalProps>
                        data={resJournal.data}
                        page={resJournal.pagemeta.page}
                        hasMore={hasMore}
                        loading={loading}
                        loadMoreData={() => loadMoreData()}
                        rowKey='id'
                        defItemHeight={52}
                        renderRow={(item: JournalProps, index) => (
                            <Timeline.Item>{index}-{item.time}&emsp;{item.content}<Button type="link" onClick={() => onGoDetails(item)}>详情</Button></Timeline.Item>
                        )}
                    />
                </Timeline>
            </Spin>
        </div>
    )
}