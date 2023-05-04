import React, {useEffect, useState} from "react"
import {AutoCard} from "@/components/AutoCard"
import {useMemoizedFn} from "ahooks"
import {genDefaultPagination, QueryGeneralResponse} from "@/pages/invoker/schema"
import {List, Tag} from "antd"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed} from "@/utils/notification"
import {formatTimestamp} from "@/utils/timeUtil"
import {showByContextMenu} from "@/components/functionTemplate/showByContext"
import {showByCursorMenu} from "@/utils/showByCursor"
import {openABSFileLocated} from "@/utils/openWebsite"
import {callCopyToClipboard} from "@/utils/basic"
import ReactPlayer from "react-player/lazy"

export interface ScreenRecorderListProp {
    refreshTrigger?: boolean
}

const {ipcRenderer} = window.require("electron")

export interface ScreenRecorder {
    Id: string
    Filename: string
    NoteInfo: string
    Project: string
    CreatedAt: number
    UpdatedAt: number
}

export const ScreenRecorderList: React.FC<ScreenRecorderListProp> = (props) => {
    const [params, setParams] = useState({})
    const [pagination, setPagination] = useState(genDefaultPagination(200))
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ScreenRecorder[]>([])
    const [total, setTotal] = useState(0)

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any, reload?: boolean) => {
            const paginationProps = {
                Page: page || 1,
                Limit: limit || pagination.Limit
            }

            if (!reload) {
                setLoading(true)
            }
            ipcRenderer
                .invoke("QueryScreenRecorders", {
                    ...params,
                    ...(extraParam ? extraParam : {}),
                    Pagination: paginationProps
                })
                .then((r: QueryGeneralResponse<any>) => {
                    setData(r.Data)
                    setPagination(r.Pagination || genDefaultPagination(200))
                    setTotal(r.Total)
                })
                .catch((e) => {
                    failed(`${e}`)
                })
                .finally(() => setTimeout(() => setLoading(false), 300))
        }
    )

    useEffect(() => {
        update(1, undefined, undefined, undefined, undefined, true)
    }, [props.refreshTrigger])

    return (
        <AutoCard
            title={"当前项目录屏列表"}
            size={"small"}
            bordered={true}
            extra={
                <div>
                    <YakitButton type={"outline2"} onClick={() => update(1)}>
                        刷新
                    </YakitButton>
                </div>
            }
        >
            <List<ScreenRecorder>
                dataSource={data}
                pagination={false}
                loading={loading}
                renderItem={(item) => {
                    return (
                        <List.Item key={item.Id}>
                            <AutoCard
                                extra={
                                    <div>
                                        <Tag>创建时间：{formatTimestamp(item.CreatedAt)}</Tag>
                                    </div>
                                }
                                size={"small"}
                                title={
                                    <div>
                                        项目：<Tag color={"orange"}>{item.Project}</Tag>
                                        录屏编号：<Tag>{item.Id}</Tag>
                                    </div>
                                }
                                onClick={(e) => {}}
                            >
                                <ReactPlayer
                                    url={`atom://${item.Filename}`}
                                    height={150}
                                    width={300}
                                    playing={true}
                                    controls={true}
                                />
                                <YakitButton
                                    onClick={(e) => {
                                        showByCursorMenu(
                                            {
                                                content: [
                                                    {
                                                        title: "打开文件位置",
                                                        onClick: () => {
                                                            openABSFileLocated(item.Filename)
                                                        }
                                                    },
                                                    {
                                                        title: "复制文件名",
                                                        onClick: () => {
                                                            callCopyToClipboard(item.Filename)
                                                        }
                                                    }
                                                ]
                                            },
                                            e.clientX,
                                            e.clientY
                                        )
                                    }}
                                    type={"outline2"}
                                >
                                    文件位置：{item.Filename}
                                </YakitButton>
                            </AutoCard>
                        </List.Item>
                    )
                }}
            />
        </AutoCard>
    )
}
