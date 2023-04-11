import {FilterIcon} from "@/assets/newIcon"
import {DurationMsToColor, RangeInputNumberTable, StatusCodeToColor} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, FiltersItemProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {compareAsc, compareDesc} from "@/pages/yakitStore/viewers/base"
import {yakitFailed} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {formatTimestamp} from "@/utils/timeUtil"
import {useDebounceEffect, useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import moment from "moment"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {analyzeFuzzerResponse, FuzzerResponse} from "../../HTTPFuzzerPage"
import styles from "./HTTPFuzzerPageTable.module.scss"

interface HTTPFuzzerPageTableProps {
    query?: HTTPFuzzerPageTableQuery
    data: FuzzerResponse[]
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    isRefresh: boolean
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
    }
    // else {
    //     //其他转化成GB
    //     size = (limit / (1024 * 1024 * 1024)).toFixed(2) + "GB"
    // }
    return size
}

export interface HTTPFuzzerPageTableQuery {
    keyWord?: string
    afterBodyLength?: number
    beforeBodyLength?: number
    StatusCode?: string[]
    bodyLengthUnit: "B" | "k" | "M"
}

const sorterFunction = (list, sorterTable) => {
    // ------------  排序 开始  ------------
    let newList = list
    // 重置
    if (sorterTable?.order === "none") {
        newList = list.sort((a, b) => compareAsc(a, b, "Count"))
    }
    // 升序
    if (sorterTable?.order === "asc") {
        newList = list.sort((a, b) => compareAsc(a, b, sorterTable?.orderBy))
    }
    // 降序
    if (sorterTable?.order === "desc") {
        newList = list.sort((a, b) => compareDesc(a, b, sorterTable?.orderBy))
    }
    // ------------  排序 结束  ------------
    return newList
}

export const HTTPFuzzerPageTable: React.FC<HTTPFuzzerPageTableProps> = React.memo((props) => {
    const {data, success, query, setQuery, isRefresh} = props
    const [listTable, setListTable] = useState<FuzzerResponse[]>([...data])
    const [loading, setLoading] = useState<boolean>(false)
    const [sorterTable, setSorterTable] = useState<SortProps>()

    const bodyLengthRef = useRef<any>()
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
                          filterKey: "bodyLength",
                          filterIcon: (
                              <FilterIcon
                                  className={classNames(styles["filter-icon"], {
                                      [styles["active-icon"]]: query?.afterBodyLength || query?.beforeBodyLength
                                  })}
                              />
                          ),
                          filterRender: () => (
                              <BodyLengthInputNumber
                                  ref={bodyLengthRef}
                                  query={query}
                                  setQuery={(q) => {
                                      setQuery({
                                          ...q
                                      })
                                  }}
                                  onSure={() => {
                                      setTimeout(() => {
                                          update()
                                      }, 100)
                                  }}
                                  showFooter={true}
                              />
                          )
                      }
                  },
                  {
                      title: "响应相似度",
                      dataKey: "BodySimilarity",
                      width: 150,
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
                      width: 150,
                      sorterProps: {
                          sorter: true
                      }
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
                      dataKey: "ContentType",
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
                                      onDetails(record, index)
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
    }, [success, query?.afterBodyLength, query?.beforeBodyLength, query?.bodyLengthUnit])
    const onDetails = useMemoizedFn((record, index: number) => {
        if (props.onSendToWebFuzzer) {
            analyzeFuzzerResponse(record, props.onSendToWebFuzzer, index, data)
        }
    })
    const onTableChange = useMemoizedFn((page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
        const l = bodyLengthRef?.current?.getValue() || {}
        setQuery({
            ...query,
            ...filters,
            ...l
        })
        setSorterTable(sorter)
    })
    useEffect(() => {
        update()
    }, [isRefresh])
    /**
     * @description 搜索防抖
     */
    useEffect(() => {
        if (!query) return
        update()
    }, [query])

    /**
     * @description 前端搜索
     */
    const update = useDebounceFn(
        () => {
            setLoading(true)
            new Promise((resolve, reject) => {
                try {
                    // ------------  搜索 开始  ------------

                    // 有搜索条件才循环
                    if (
                        query?.keyWord ||
                        (query?.StatusCode && query?.StatusCode?.length > 0) ||
                        query?.afterBodyLength ||
                        query?.beforeBodyLength
                    ) {
                        const newDataTable = sorterFunction(listTable, sorterTable) || []
                        const l = newDataTable.length
                        const searchList: FuzzerResponse[] = []
                        for (let index = 0; index < l; index++) {
                            const record = newDataTable[index]
                            // 关键字搜索是否满足，默认 满足，以下同理,搜索同时为true时，push新数组
                            let keyWordIsPush = true
                            let statusCodeIsPush = true
                            let bodyLengthMinIsPush = true
                            let bodyLengthMaxIsPush = true
                            // 搜索满足条件 交集
                            // 关键字搜索
                            if (query?.keyWord) {
                                const responseString = Uint8ArrayToString(record.ResponseRaw)
                                keyWordIsPush = responseString.includes(query.keyWord)
                            }
                            // 状态码搜索
                            if (query?.StatusCode && query?.StatusCode?.length > 0) {
                                const codeArr: number[] = query.StatusCode.join("-")
                                    .split("-")
                                    .map((n) => parseInt(n))
                                const maxCode = Math.max(...codeArr)
                                const minCode = Math.min(...codeArr)
                                if (record.StatusCode >= minCode && record.StatusCode <= maxCode) {
                                    statusCodeIsPush = true
                                } else {
                                    statusCodeIsPush = false
                                }
                            }
                            // 响应大小搜索
                            if (query?.afterBodyLength) {
                                // 最小
                                bodyLengthMinIsPush = Number(record.BodyLength) >= query.afterBodyLength
                            }
                            if (query?.beforeBodyLength) {
                                // 最大
                                bodyLengthMaxIsPush = Number(record.BodyLength) <= query.beforeBodyLength
                            }
                            // 搜索同时为true时，push新数组
                            if (keyWordIsPush && statusCodeIsPush && bodyLengthMinIsPush && bodyLengthMaxIsPush) {
                                searchList.push(record)
                            }
                        }
                        setListTable([...searchList])
                    } else {
                        const newData = sorterFunction(data, sorterTable) || []
                        setListTable([...newData])
                    }
                    // ------------  搜索 结束  ------------
                    resolve(true)
                } catch (error) {
                    reject(error)
                }
            })
                .catch((e) => {
                    yakitFailed("搜索失败:" + e)
                })
                .finally(() => {
                    setTimeout(() => {
                        setLoading(false)
                    }, 200)
                })
        },
        {
            wait: 200
        }
    ).run

    return (
        <div style={{overflowY: "hidden"}}>
            <TableVirtualResize<FuzzerResponse>
                query={query}
                isRefresh={isRefresh}
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

interface BodyLengthInputNumberProps {
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    onSure?: () => void
    showFooter?: boolean
    ref?: any
}
export const BodyLengthInputNumber: React.FC<BodyLengthInputNumberProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {query, setQuery, showFooter} = props
        // 响应大小
        const [afterBodyLength, setAfterBodyLength] = useState<number>()
        const [beforeBodyLength, setBeforeBodyLength] = useState<number>()
        const [bodyLengthUnit, setBodyLengthUnit] = useState<"B" | "k" | "M">("B")
        useEffect(() => {
            setAfterBodyLength(query?.afterBodyLength)
            setBeforeBodyLength(query?.beforeBodyLength)
            setBodyLengthUnit(query?.bodyLengthUnit || "B")
        }, [query])
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const objLength = {
                        afterBodyLength: afterBodyLength ? getLength(afterBodyLength) : undefined,
                        beforeBodyLength: beforeBodyLength ? getLength(beforeBodyLength) : undefined,
                        bodyLengthUnit
                    }
                    return objLength
                }
            }),
            [afterBodyLength, beforeBodyLength, bodyLengthUnit]
        )
        const getLength = useMemoizedFn((length: number) => {
            switch (bodyLengthUnit) {
                case "k":
                    return length * 1024
                case "M":
                    return length * 1024 * 1024
                default:
                    return length
            }
        })
        return (
            <RangeInputNumberTable
                showFooter={showFooter}
                minNumber={afterBodyLength}
                setMinNumber={setAfterBodyLength}
                maxNumber={beforeBodyLength}
                setMaxNumber={setBeforeBodyLength}
                onReset={() => {
                    setQuery({
                        ...query,
                        afterBodyLength,
                        beforeBodyLength,
                        bodyLengthUnit
                    })
                    setBeforeBodyLength(undefined)
                    setAfterBodyLength(undefined)
                    setBodyLengthUnit("B")
                }}
                onSure={() => {
                    setQuery({
                        ...query,
                        afterBodyLength,
                        beforeBodyLength,
                        bodyLengthUnit
                    })
                }}
                extra={
                    <YakitSelect
                        value={bodyLengthUnit}
                        onSelect={(val) => {
                            setBodyLengthUnit(val)
                        }}
                        wrapperClassName={styles["unit-select"]}
                        size='small'
                    >
                        <YakitSelect value='B'>B</YakitSelect>
                        <YakitSelect value='k'>K</YakitSelect>
                        <YakitSelect value='M'>M</YakitSelect>
                    </YakitSelect>
                }
            />
        )
    })
)
