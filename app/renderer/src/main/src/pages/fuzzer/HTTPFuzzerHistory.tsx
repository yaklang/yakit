import React, {useEffect, useMemo, useState} from "react"
import {Card, Divider, List, Space} from "antd"
import {formatTimestamp} from "../../utils/timeUtil"
import {ReloadOutlined, DeleteOutlined} from "@ant-design/icons"
import {useMemoizedFn} from "ahooks"
import {info} from "../../utils/notification"
import {PaginationSchema} from "@/pages/invoker/schema"
import {HistoryHTTPFuzzerTask} from "@/pages/fuzzer/HTTPFuzzerPage"
import {Uint8ArrayToString} from "@/utils/str"
import {NewHTTPPacketEditor} from "@/utils/editors"
import {CheckIcon} from "@/assets/newIcon"
import styles from "./HTTPFuzzerHistory.module.scss"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {DeleteFuzzerConfigRequest, apiDeleteFuzzerConfig} from "../layout/mainOperatorContent/utils"

export interface HTTPFuzzerHistorySelectorProp {
    currentSelectId?: number
    onSelect: (i: number, page: number, showAll: boolean) => any
    onDeleteAllCallback: () => void
    fuzzerTabIndex: string
}

const {ipcRenderer} = window.require("electron")

interface HTTPFuzzerTask {
    Id: number
    CreatedAt: number
    HTTPFlowTotal: number
    HTTPFlowSuccessCount: number
    HTTPFlowFailedCount: number
    Host?: string
    Port?: number
    onReload?: () => any
}

export interface HTTPFuzzerTaskDetail {
    BasicInfo: HTTPFuzzerTask
    OriginRequest: HistoryHTTPFuzzerTask
}

/*
* message HistoryHTTPFuzzerTaskDetail {
  HistoryHTTPFuzzerTask BasicInfo = 1;
  FuzzerRequest OriginRequest = 2;
}
* */

export const HTTPFuzzerHistorySelector: React.FC<HTTPFuzzerHistorySelectorProp> = React.memo((props) => {
    const {currentSelectId, fuzzerTabIndex} = props
    const [tasks, setTasks] = useState<HTTPFuzzerTaskDetail[]>([])
    const [loading, setLoading] = useState(false)
    const [paging, setPaging] = useState<PaginationSchema>({Limit: 10, Order: "", OrderBy: "", Page: 1})
    const [keyword, setKeyword] = useState("")
    const [total, setTotal] = useState(0)
    const [showAll, setShowAll] = useState<boolean>(false)
    const page = useMemo(() => paging.Page, [paging.Page])
    const limit = useMemo(() => paging.Limit, [paging.Limit])
    useEffect(() => {
        reload(1, limit, true)
    }, [])
    const deleteAll = useMemoizedFn(() => {
        setLoading(true)
        const removeParams = {
            WebFuzzerIndex: showAll ? "" : fuzzerTabIndex
        }
        ipcRenderer
            .invoke("DeleteHistoryHTTPFuzzerTask", removeParams)
            .then(() => {
                info("Delete History")
                deleteFuzzerConfig()
                reload(1, limit)
                props.onDeleteAllCallback()
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })
    /**删除 对应的配置缓存历史数据 */
    const deleteFuzzerConfig = useMemoizedFn(() => {
        let deleteFuzzerConfigRequest: DeleteFuzzerConfigRequest = {
            PageId: [],
            DeleteAll: false
        }
        if (showAll) {
            deleteFuzzerConfigRequest.DeleteAll = true
        } else {
            deleteFuzzerConfigRequest.PageId = [fuzzerTabIndex]
        }
        apiDeleteFuzzerConfig(deleteFuzzerConfigRequest)
    })

    const reload = useMemoizedFn((pageInt: number, limitInt: number, first?: boolean) => {
        setLoading(true)
        const params = {
            Pagination: {...paging, Page: pageInt, Limit: limitInt},
            Keyword: keyword,
            FuzzerTabIndex: showAll ? "" : fuzzerTabIndex
        }
        ipcRenderer
            .invoke("QueryHistoryHTTPFuzzerTaskEx", params)
            .then((data: {Data: HTTPFuzzerTaskDetail[]; Total: number; Pagination: PaginationSchema}) => {
                setTasks(data.Data)
                setTotal(data.Total)
                setPaging(data.Pagination)
                if (data.Total == 0 && first) {
                    onSwitchShowAll(true)
                }
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    const onSwitchShowAll = useMemoizedFn((v) => {
        setShowAll(v)
        setTimeout(() => {
            reload(1, limit)
        }, 200)
    })

    return (
        <Card
            size={"small"}
            bordered={false}
            title={
                <Space style={{lineHeight: "16px"}}>
                    <span>Web Fuzzer History</span>
                    <YakitButton
                        type='text'
                        size={"small"}
                        icon={<ReloadOutlined />}
                        onClick={(e) => {
                            reload(1, limit)
                        }}
                    />
                    <YakitPopconfirm
                        title={"将会删除数据包与缓存数据，确定删除吗"}
                        onConfirm={() => {
                            deleteAll()
                        }}
                    >
                        <YakitButton type='text' size={"small"} colors='danger' icon={<DeleteOutlined />} />
                    </YakitPopconfirm>
                </Space>
            }
            style={{color: "var(--yakit-header-color)"}}
        >
            {/* <Form
                size={"small"}
                layout={"inline"}
                onSubmitCapture={(e) => {
                    e.preventDefault()

                    reload(1, limit)
                }}
            >
                <InputItem
                    label={
                        <div style={{display: "flex", alignItems: "center"}}>
                            
                            <Tooltip title={"快速搜索 Host 与 Request 中的内容"}>
                                <YakitButton type='text' size={"small"} icon={<QuestionOutlined />} />
                            </Tooltip>
                        </div>
                    }
                    extraFormItemProps={{style: {marginBottom: 0}}}
                    value={keyword}
                    setValue={setKeyword}
                />
                <Form.Item style={{marginBottom: 0}}>
                    <Button type='primary' htmlType='submit' icon={<SearchOutlined />} />
                </Form.Item>
            </Form> */}
            <div style={{display: "flex", alignItems: "center", gap: 8}}>
                <span>快速搜索：</span>
                <YakitInput.Search
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onSearch={() => reload(1, limit)}
                    onPressEnter={() => reload(1, limit)}
                />
                <span>
                    查看全部
                    <YakitSwitch checked={showAll} onChange={onSwitchShowAll} />
                </span>
            </div>
            <Divider style={{marginTop: 10, marginBottom: 6}} />
            <List<HTTPFuzzerTaskDetail>
                className='yakit-list'
                loading={loading}
                dataSource={tasks}
                // pagination={{total: tasks.length, size: "small", pageSize: 10}}
                pagination={{
                    size: "small",
                    pageSize: limit,
                    showSizeChanger: true,
                    total,
                    pageSizeOptions: ["5", "10", "20"],
                    onChange: (page: number, limit?: number) => {
                        reload(page, limit || 10)
                    },
                    onShowSizeChange: (old, limit) => {
                        reload(page, limit || 10)
                    }
                }}
                renderItem={(detail: HTTPFuzzerTaskDetail, index: number) => {
                    const i = detail.BasicInfo
                    let verbose = detail.OriginRequest.Verbose
                    if (!verbose) {
                        const rawToStr = Uint8ArrayToString(detail.OriginRequest.RequestRaw)
                        if (!rawToStr) {
                            verbose = detail.OriginRequest.Request
                        } else {
                            verbose = rawToStr
                        }
                    }
                    return (
                        <List.Item key={i.Id} style={{padding: 2}}>
                            <YakitPopover
                                placement={"rightBottom"}
                                content={
                                    <div style={{width: 600, height: 300}}>
                                        <NewHTTPPacketEditor
                                            originValue={verbose}
                                            readOnly={true}
                                            noMinimap={true}
                                            noHeader={true}
                                            showDownBodyMenu={false}
                                        />
                                    </div>
                                }
                            >
                                <Card
                                    size={"small"}
                                    style={{marginBottom: 4, width: "100%"}}
                                    bodyStyle={{paddingTop: 4, paddingBottom: 4}}
                                    hoverable={true}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        const page = (paging.Page - 1) * 10 + index + 1
                                        props.onSelect(i.Id, page, showAll)
                                    }}
                                    bordered={false}
                                >
                                    <div className={styles["history-item"]}>
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "row",
                                                width: "100%",
                                                gap: 4,
                                                position: "relative"
                                            }}
                                        >
                                            <div>{`ID:${i.Id}`}</div>
                                            <div style={{overflow: "hidden"}}>
                                                <YakitTag
                                                    color='info'
                                                    style={{
                                                        whiteSpace: "normal",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        display: "block",
                                                        lineHeight: "14px"
                                                    }}
                                                >
                                                    {!!i.Host ? i.Host : formatTimestamp(i.CreatedAt)}
                                                </YakitTag>
                                            </div>

                                            <YakitTag>共{i.HTTPFlowTotal}个</YakitTag>
                                            {i.HTTPFlowSuccessCount != i.HTTPFlowTotal && (
                                                <YakitTag>成功:{i.HTTPFlowSuccessCount}个</YakitTag>
                                            )}
                                            {currentSelectId == i.Id && <CheckIcon className={styles["check-icon"]} />}
                                        </div>
                                    </div>
                                </Card>
                            </YakitPopover>
                        </List.Item>
                    )
                }}
            />
        </Card>
    )
})
