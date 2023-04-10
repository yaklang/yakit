import {DurationMsToColor, StatusCodeToColor} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {compareAsc, compareDesc} from "@/pages/yakitStore/viewers/base"
import {formatTimestamp} from "@/utils/timeUtil"
import {useMemoizedFn} from "ahooks"
import classNames from "classnames"
import moment from "moment"
import React, {useMemo, useRef, useState} from "react"
import {analyzeFuzzerResponse, FuzzerResponse} from "../../HTTPFuzzerPage"
import styles from "./HTTPFuzzerPageTable.module.scss"

interface HTTPFuzzerPageTableProps {
    data: FuzzerResponse[]
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
}

/**
 * @description B转为kB M
 * @returns {string}
 */
const convertBodyLength = (val: string) => {
    const limit = parseInt(val)
    let size = ""
    if (limit < 0.1 * 1024) {
        //小于0.1KB，则转化成B
        size = limit.toFixed(2) + "B"
    } else if (limit < 0.1 * 1024 * 1024) {
        //小于0.1MB，则转化成KB
        size = (limit / 1024).toFixed(2) + "KB"
    } else if (limit < 0.1 * 1024 * 1024 * 1024) {
        //小于0.1GB，则转化成MB
        size = (limit / (1024 * 1024)).toFixed(2) + "MB"
    } else {
        //其他转化成GB
        size = (limit / (1024 * 1024 * 1024)).toFixed(2) + "GB"
    }
    return size
}

export const HTTPFuzzerPageTable: React.FC<HTTPFuzzerPageTableProps> = React.memo((props) => {
    const {data, success} = props
    const [listTable, setListTable] = useState<FuzzerResponse[]>([...data])
    const [loading, setLoading] = useState<boolean>(false)
    const [params, setParams] = useState()
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return success
            ? [
                  {
                      title: "请求",
                      dataKey: "Count",
                      render: (v) => v + 1,
                      width: 80,
                      sorterProps: {
                          sorter: true
                      }
                  },
                  {
                      title: "Method",
                      dataKey: "Method",
                      width: 100,
                      sorterProps: {
                          sorter: true
                      }
                  },
                  {
                      title: "StatusCode",
                      dataKey: "StatusCode",
                      render: (v) => <div style={{color: StatusCodeToColor(v)}}>{`${v}`}</div>,
                      width: 140,
                      sorterProps: {
                          sorter: true
                      },
                      filterProps: {
                          filterMultiple: true,
                          filtersType: "select",
                          filterSearchInputProps: {
                              size: "small"
                          },
                          filterOptionRender: (item: FiltersItemProps) => (
                              <div>
                                  <span>{item.value}</span>
                                  <span>{item.total}</span>
                              </div>
                          ),
                          filters: [
                              {
                                  value: "100-200",
                                  label: "100-200"
                              },
                              {
                                  value: "200-300",
                                  label: "200-300"
                              },
                              {
                                  value: "300-400",
                                  label: "300-400"
                              },
                              {
                                  value: "400-500",
                                  label: "400-500"
                              },
                              {
                                  value: "500-600",
                                  label: "500-600"
                              }
                          ]
                      }
                  },
                  {
                      title: "响应大小",
                      dataKey: "BodyLength",
                      width: 120,

                      render: (val) => {
                          return (
                              <>
                                  {/* 1M 以上的话，是红色*/}
                                  {val !== -1 && (
                                      <div
                                          className={classNames({
                                              [styles["body-length-text-red"]]: val > 1000000
                                          })}
                                      >
                                          {convertBodyLength(val)}
                                      </div>
                                  )}
                              </>
                          )
                      },
                      sorterProps: {
                          sorter: true
                      },
                      filterProps: {
                          filtersType: "input"
                      }
                  },
                  {
                      title: "响应相似度",
                      dataKey: "BodySimilarity",
                      width: 120,
                      render: (v) => {
                          const text = parseFloat(`${v}`).toFixed(3)
                          return (
                              <div style={{color: text.startsWith("1.00") ? "var(--yakit-success-5)" : undefined}}>
                                  {text}
                              </div>
                          )
                      },
                      sorterProps: {
                          sorter: true
                      }
                  },
                  {
                      title: "HTTP头相似度",
                      dataKey: "HeaderSimilarity",
                      render: (v) => parseFloat(`${v}`).toFixed(3),
                      width: 100
                  },
                  {
                      title: "Payloads",
                      dataKey: "Payloads",
                      width: 300
                  },
                  {
                      title: "延迟(ms)",
                      dataKey: "DurationMs",
                      width: 100,
                      sorterProps: {
                          sorter: true
                      },
                      render: (v) => <div style={{color: DurationMsToColor(v)}}>{`${v}`}</div>
                  },
                  {
                      title: "Content-Type",
                      dataKey: "Content-Type",
                      width: 300
                  },
                  {
                      title: "time",
                      dataKey: "Timestamp",
                      width: 165,
                      render: (text) => formatTimestamp(text),
                      sorterProps: {
                          sorter: true
                      }
                  },
                  {
                      title: "操作",
                      dataKey: "UUID",
                      fixed: "right",
                      render: (_, record, index: number) => {
                          return (
                              <YakitButton
                                  type='text'
                                  onClick={(e) => {
                                      e.stopPropagation()
                                      if ((record || []).length > 0 && props.onSendToWebFuzzer) {
                                          analyzeFuzzerResponse(record[0], props.onSendToWebFuzzer, index, record)
                                      }
                                  }}
                              >
                                  详情
                              </YakitButton>
                          )
                      },
                      width: 80
                  }
              ]
            : [
                  {
                      title: "Method",
                      dataKey: "Method",
                      width: 100
                  },
                  {
                      title: "失败原因",
                      dataKey: "Reason",
                      render: (v) => {
                          return v ? <YakitTag color='danger' enableCopy={true} copyText={v} /> : "-"
                      }
                  },
                  {
                      title: "Payloads",
                      dataKey: "Payloads"
                  }
              ]
    }, [success])
    const onTableChange = useMemoizedFn((page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
        console.log("sorter", sorter, filters, extra)
        // 重置
        if (sorter.order === "none") {
            setListTable([...data])
            return
        }
        // 升序
        if (sorter.order === "asc") {
            const ascList = listTable.sort((a, b) => compareAsc(a, b, sorter.orderBy))
            console.log("ascList", ascList)
            setListTable([...ascList])
        }
        // 降序
        if (sorter.order === "desc") {
            const descList = listTable.sort((a, b) => compareDesc(a, b, sorter.orderBy))
            console.log("descList", descList)
            setListTable([...descList])
        }
    })

    return (
        <div style={{overflowY: "hidden"}}>
            <TableVirtualResize<FuzzerResponse>
                query={params}
                titleHeight={4}
                renderTitle={<></>}
                renderKey='UUID'
                data={listTable}
                loading={loading}
                enableDrag={true}
                columns={columns}
                // pagination={{
                //     page: pagination.Page,
                //     limit: pagination.Limit,
                //     total,
                //     onChange: update
                // }}
                // currentSelectItem={currentSelectItem}
                onChange={onTableChange}
                containerClassName={styles["table-container"]}
            />
        </div>
    )
})
