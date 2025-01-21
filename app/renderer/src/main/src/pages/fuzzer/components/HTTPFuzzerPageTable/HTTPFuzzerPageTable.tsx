import {ArrowCircleRightSvgIcon, FilterIcon} from "@/assets/newIcon"
import {DurationMsToColor, RangeInputNumberTable, StatusCodeToColor} from "@/components/HTTPFlowTable/HTTPFlowTable"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {OtherMenuListProps} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {compareAsc, compareDesc} from "@/pages/yakitStore/viewers/base"
import {
    HTTP_PACKET_EDITOR_Response_Info,
    IMonacoEditor,
    NewHTTPPacketEditor,
    RenderTypeOptionVal
} from "@/utils/editors"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {failed, yakitFailed, yakitNotify} from "@/utils/notification"
import {Uint8ArrayToString} from "@/utils/str"
import {formatTimestamp} from "@/utils/timeUtil"
import {useCreation, useDebounceFn, useMemoizedFn, useThrottleEffect, useUpdateEffect} from "ahooks"
import classNames from "classnames"
import React, {useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {analyzeFuzzerResponse, copyAsUrl, FuzzerResponse, onAddOverlayWidget} from "../../HTTPFuzzerPage"
import styles from "./HTTPFuzzerPageTable.module.scss"
import {HollowLightningBoltIcon} from "@/assets/newIcon"
import {Alert, Divider, Tooltip} from "antd"
import {ExtractionResultsContent} from "../../MatcherAndExtractionCard/MatcherAndExtractionCard"
import {showYakitModal} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitRadioButtons} from "@/components/yakitUI/YakitRadioButtons/YakitRadioButtons"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import emiter from "@/utils/eventBus/eventBus"
import {YakitDropdownMenu} from "@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu"
import {openABSFileLocated, openExternalWebsite} from "@/utils/openWebsite"
import ReactResizeDetector from "react-resize-detector"
import {useCampare} from "@/hook/useCompare/useCompare"
import {DefFuzzerTableMaxData} from "@/defaultConstants/HTTPFuzzerPage"
import {CodingPopover} from "@/components/HTTPFlowDetail"
import {OutlineSearchIcon} from "@/assets/icon/outline"
import {FuzzerRemoteGV} from "@/enums/fuzzer"
import {isCellRedSingleColor} from "@/components/TableVirtualResize/utils"

const {ipcRenderer} = window.require("electron")

interface HTTPFuzzerPageTableProps {
    ref?: any
    query?: HTTPFuzzerPageTableQuery
    data: FuzzerResponse[]
    success?: boolean
    onSendToWebFuzzer?: (isHttps: boolean, request: string) => any
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    isRefresh?: boolean
    /**@name 提取的数据 */
    extractedMap: Map<string, string>
    /**@name 数据是否传输完成 */
    isEnd: boolean
    setExportData?: (v: FuzzerResponse[]) => void
    /**@name 是否可以调试匹配器或提取器 */
    isShowDebug?: boolean
    /**点击调试回调 */
    onDebug?: (res: string) => void
    pageId?: string
    /**超过限制数据，alert文案显示 */
    moreLimtAlertMsg?: React.ReactNode
    tableKeyUpDownEnabled?: boolean
    fuzzerTableMaxData?: number
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
    return size
}

export interface HTTPFuzzerPageTableQuery {
    keyWord?: string
    afterBodyLength?: number
    beforeBodyLength?: number
    afterDurationMs?: number
    beforeDurationMs?: number
    StatusCode?: string
    Color?: string[]
    ExtractedResults?: string
    // bodyLengthUnit: "B" | "k" | "M"
}

// 判断数组值是否是数字 字符串类型数字也算
const isNumericArray = (arr) => {
    // 利用正则表达式进行匹配
    var regex = /^\d+$/
    for (var i = 0; i < arr.length; i++) {
        if (!regex.test(arr[i])) {
            return false
        }
    }
    return true
}

export const sorterFunction = (list, sorterTable, defSorter = "Count") => {
    // ------------  排序 开始  ------------
    let newList = list
    // 判断当前排序列是否既有数字又有字母的情况
    const isNumber = isNumericArray(
        list.map((item) => (sorterTable?.orderBy == "" ? item[defSorter] + "" : item[sorterTable?.orderBy] + ""))
    )
    // 重置
    if (sorterTable?.order === "none") {
        newList = list.sort((a, b) => compareAsc(a, b, defSorter, isNumber))
    }
    // 升序
    if (sorterTable?.order === "asc") {
        newList = list.sort((a, b) => compareAsc(a, b, sorterTable?.orderBy, isNumber))
    }
    // 降序
    if (sorterTable?.order === "desc") {
        newList = list.sort((a, b) => compareDesc(a, b, sorterTable?.orderBy, isNumber))
    }
    // ------------  排序 结束  ------------
    return newList
}

export const parseStatusCodes = (statusCode: string) => {
    const result = new Set<number>()
    statusCode.split(",").forEach((part) => {
        // 检查是否是一个范围
        if (part.includes("-")) {
            const [start, end] = part.split("-").map((str) => (str.trim() !== "" ? Number(str) : NaN))
            // 确保 start 和 end 都是有效数字
            if (!isNaN(start) && !isNaN(end) && start <= end && start >= 100 && end <= 599) {
                for (let i = start; i <= end; i++) {
                    result.add(i)
                }
            }
        } else {
            const code = part.trim() !== "" ? Number(part) : NaN
            // 确保 code 是有效数字
            if (!isNaN(code) && code >= 100 && code <= 599) {
                result.add(code)
            }
        }
    })
    return Array.from(result).sort((a, b) => a - b)
}

export const HTTPFuzzerPageTable: React.FC<HTTPFuzzerPageTableProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {
            data,
            success,
            query,
            setQuery,
            isRefresh,
            extractedMap,
            isEnd,
            setExportData,
            isShowDebug,
            onDebug,
            pageId,
            moreLimtAlertMsg,
            tableKeyUpDownEnabled = true,
            fuzzerTableMaxData = DefFuzzerTableMaxData
        } = props
        const [listTable, setListTable] = useState<FuzzerResponse[]>([])
        const listTableRef = useRef<FuzzerResponse[]>([])
        const [loading, setLoading] = useState<boolean>(false)
        const [sorterTable, setSorterTable] = useState<SortProps>()
        const sorterTableRef = useRef<SortProps>()

        const [firstFull, setFirstFull] = useState<boolean>(true) // 表格是否全屏
        const [currentSelectItem, setCurrentSelectItem] = useState<FuzzerResponse>() //选中的表格项
        const [currentSelectShowType, setCurrentSelectShowType] = useState<"request" | "response">("response") //选中的表格项

        const [editor, setEditor] = useState<IMonacoEditor>()
        const [showResponseInfoSecondEditor, setShowResponseInfoSecondEditor] = useState<boolean>(true)

        const bodyLengthRef = useRef<any>()
        const durationMsRef = useRef<any>()
        const tableRef = useRef<any>(null)

        const [scrollToIndex, setScrollToIndex] = useState<number>()
        const [alertClose, setAlertClose] = useState<boolean>(false)
        const [alertHeight, setAlertHeight] = useState<number>(0)

        useEffect(() => {
            sorterTableRef.current = sorterTable
        }, [sorterTable])
        useEffect(() => {
            listTableRef.current = listTable
        }, [listTable])

        // useThrottleEffect(
        //     () => {
        //             setListTable([...data]);
        //             const dataLength = data.length
        //             if(dataLength>0){scrollUpdate(dataLength)}
        //     },
        //     [data],
        //     {
        //       wait: 500,
        //     },
        //   );

        const scrollUpdate = useMemoizedFn((dataLength) => {
            const scrollTop = tableRef.current?.containerRef?.scrollTop
            const clientHeight = tableRef.current?.containerRef?.clientHeight
            const scrollHeight = tableRef.current?.containerRef?.scrollHeight
            let scrollBottom: number | undefined = undefined
            if (typeof scrollTop === "number" && typeof clientHeight === "number" && typeof scrollHeight === "number") {
                scrollBottom = parseInt((scrollHeight - scrollTop - clientHeight).toFixed())
                const isScroll: boolean = scrollHeight > clientHeight
                if (scrollBottom <= 2 && isScroll) {
                    setScrollToIndex(dataLength)
                }
            }
        })

        useImperativeHandle(
            ref,
            () => ({
                // 减少父组件获取的DOM元素属性,只暴露给父组件需要用到的方法
                setCurrentSelectItem,
                setFirstFull
            }),
            []
        )

        const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
            return success
                ? [
                      {
                          title: "请求",
                          dataKey: "Count",
                          render: (v) => {
                              return v + 1
                          },
                          width: 80,
                          sorterProps: {
                              sorter: true
                          },
                          fixed: "left"
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
                          title: "状态",
                          dataKey: "StatusCode",
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !isCellRedSingleColor(rowData.cellClassName)
                                              ? StatusCodeToColor(v)
                                              : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              ),
                          width: 90,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterKey: "StatusCode",
                              filtersType: "input",
                              filterIcon: (
                                  <OutlineSearchIcon
                                      className={classNames(styles["search-icon"], styles["filter-icon"], {
                                          [styles["active-icon"]]: !!query?.StatusCode?.length
                                      })}
                                  />
                              ),
                              filterInputProps: {
                                  placeholder: "支持输入200,200-204格式，多个用逗号分隔",
                                  wrapperStyle: {width: 270},
                                  onRegular: (value) => {
                                      // 只允许输入数字、逗号和连字符，去掉所有其他字符
                                      return value.replace(/[^0-9,-]/g, "")
                                  }
                              }
                          }
                      },
                      {
                          title: "响应大小",
                          dataKey: "BodyLength",
                          width: 120,
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
                          title: "延迟(ms)",
                          dataKey: "DurationMs",
                          width: 120,
                          sorterProps: {
                              sorter: true
                          },
                          filterProps: {
                              filterKey: "durationMs",
                              filterIcon: (
                                  <FilterIcon
                                      className={classNames(styles["filter-icon"], {
                                          [styles["active-icon"]]: query?.afterDurationMs || query?.beforeDurationMs
                                      })}
                                  />
                              ),
                              filterRender: () => (
                                  <DurationMsInputNumber
                                      ref={durationMsRef}
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
                          },
                          render: (v, rowData) =>
                              v ? (
                                  <div
                                      style={{
                                          color: !isCellRedSingleColor(rowData.cellClassName)
                                              ? DurationMsToColor(v)
                                              : ""
                                      }}
                                  >{`${v}`}</div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          width: 300,
                          sorterProps: {
                              sorter: true
                          },
                          render: (v) => {
                              return v ? v.join(",") : "-"
                          }
                      },
                      {
                          title: "提取数据",
                          dataKey: "ExtractedResults",
                          width: 300,
                          filterProps: {
                              filterKey: "ExtractedResults",
                              filtersType: "input",
                              filterIcon: (
                                  <OutlineSearchIcon
                                      className={classNames(styles["search-icon"], styles["filter-icon"], {
                                          [styles["active-icon"]]: !!query?.ExtractedResults?.length
                                      })}
                                  />
                              ),
                              filterInputProps: {
                                  placeholder: "请输入关键字进行搜索"
                              }
                          },
                          render: (item, record) =>
                              extractedMap.size > 0 ? (
                                  extractedMap.get(record["UUID"]) || "-"
                              ) : item?.length > 0 ? (
                                  <div className={styles["table-item-extracted-results"]}>
                                      <span className={styles["extracted-results-text"]}>
                                          {item.map((i) => `${i.Key}: ${i.Value} `)}
                                      </span>
                                      {item?.length > 1 && (
                                          <YakitButton
                                              type='text'
                                              size='small'
                                              onClick={(e) => {
                                                  e.stopPropagation()
                                                  onViewExecResults(item)
                                              }}
                                              style={{
                                                  color: !isCellRedSingleColor(record.cellClassName)
                                                      ? undefined
                                                      : "#fff"
                                              }}
                                          >
                                              详情
                                          </YakitButton>
                                      )}
                                  </div>
                              ) : (
                                  "-"
                              )
                      },
                      {
                          title: "响应相似度",
                          dataKey: "BodySimilarity",
                          width: 120,
                          render: (v, rowData) => {
                              const text = parseFloat(`${v}`).toFixed(3)
                              return text ? (
                                  <div
                                      style={{
                                          color:
                                              !isCellRedSingleColor(rowData.cellClassName) && text.startsWith("1.00")
                                                  ? "var(--yakit-success-5)"
                                                  : undefined
                                      }}
                                  >
                                      {text}
                                  </div>
                              ) : (
                                  "-"
                              )
                          },
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "HTTP头相似度",
                          dataKey: "HeaderSimilarity",
                          render: (v) => (v ? parseFloat(`${v}`).toFixed(3) : "-"),
                          width: 120,
                          sorterProps: {
                              sorter: true
                          }
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
                          render: (text) => (text ? formatTimestamp(text) : "-"),
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "操作",
                          dataKey: "UUID",
                          fixed: "right",
                          width: isShowDebug !== false ? 85 : 60,
                          render: (_, record, index: number) => {
                              return (
                                  <div className={styles["operate-icons"]}>
                                      {isShowDebug !== false && (
                                          <>
                                              <Tooltip title='调试'>
                                                  <HollowLightningBoltIcon
                                                      onClick={(e) => {
                                                          e.stopPropagation()
                                                          if (onDebug) {
                                                              onDebug(Uint8ArrayToString(record.ResponseRaw))
                                                          } else {
                                                              const value = {
                                                                  httpResponseCode: Uint8ArrayToString(
                                                                      record.ResponseRaw
                                                                  )
                                                              }
                                                              emiter.emit(
                                                                  "openMatcherAndExtraction",
                                                                  JSON.stringify(value)
                                                              )
                                                          }
                                                      }}
                                                      style={{
                                                          color: !isCellRedSingleColor(record.cellClassName)
                                                              ? ""
                                                              : "#fff"
                                                      }}
                                                  />
                                              </Tooltip>
                                              <Divider type='vertical' style={{margin: 0}} />
                                          </>
                                      )}

                                      <ArrowCircleRightSvgIcon
                                          style={{
                                              color: !isCellRedSingleColor(record.cellClassName) ? "" : "#fff"
                                          }}
                                          onClick={(e) => {
                                              e.stopPropagation()
                                              onDetails(record, index)
                                          }}
                                      />
                                  </div>
                              )
                          }
                      }
                  ]
                : [
                      {
                          title: "Method",
                          dataKey: "Method",
                          width: 100,
                          sorterProps: {
                              sorter: true
                          }
                      },
                      {
                          title: "失败原因",
                          dataKey: "Reason",
                          render: (v) => {
                              return v ? (
                                  <YakitTag color='danger' style={{maxWidth: "100%"}}>
                                      <span className={styles["fail-reason"]}>{v}</span>
                                      <CopyComponents copyText={v} />
                                  </YakitTag>
                              ) : (
                                  "-"
                              )
                          }
                      },
                      {
                          title: "Payloads",
                          dataKey: "Payloads",
                          sorterProps: {
                              sorter: true
                          },
                          render: (v) => {
                              return v ? v.join(",") : "-"
                          }
                      }
                  ]
        }, [
            success,
            query?.StatusCode,
            query?.afterBodyLength,
            query?.beforeBodyLength,
            query?.afterDurationMs,
            query?.beforeDurationMs,
            extractedMap,
            query?.ExtractedResults,
            isShowDebug
        ])

        const compareSorterTable = useCampare(sorterTable)
        useThrottleEffect(
            () => {
                queryData()
            },
            [data, isEnd, compareSorterTable],
            {wait: 500}
        )

        const compareQuery = useCampare(query)
        useEffect(() => {
            update()
        }, [isRefresh])
        useUpdateEffect(() => {
            update()
        }, [compareQuery])
        useEffect(() => {
            getRemoteValue(HTTP_PACKET_EDITOR_Response_Info)
                .then((data) => {
                    setShowResponseInfoSecondEditor(data === "false" ? false : true)
                })
                .catch(() => {
                    setShowResponseInfoSecondEditor(true)
                })
        }, [])
        const onViewExecResults = useMemoizedFn((list) => {
            showYakitModal({
                title: "提取结果",
                width: "60%",
                footer: <></>,
                content: <ExtractionResultsContent list={list} />
            })
        })
        const onDetails = useMemoizedFn((record, index: number) => {
            analyzeFuzzerResponse(record, index, data)
        })
        const onTableChange = useMemoizedFn(
            (page: number, limit: number, sorter: SortProps, filters: any, extra?: any) => {
                const l = bodyLengthRef?.current?.getValue() || {}
                const d = durationMsRef?.current?.getValue() || {}
                setQuery({
                    ...query,
                    ...filters,
                    ...l,
                    ...d
                })
                setSorterTable(sorter)
            }
        )

        const update = useDebounceFn(
            () => {
                setLoading(true)
                new Promise((resolve, reject) => {
                    try {
                        queryData()
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

        /**
         * @description 前端搜索
         */
        const queryData = useMemoizedFn(() => {
            try {
                // ------------  搜索 开始  ------------
                // 有搜索条件才循环
                if (
                    query?.keyWord ||
                    (query?.StatusCode && query?.StatusCode?.length > 0) ||
                    (query?.Color && query?.Color?.length > 0) ||
                    query?.afterBodyLength ||
                    query?.beforeBodyLength ||
                    query?.afterDurationMs ||
                    query?.beforeDurationMs ||
                    (query?.ExtractedResults && query?.ExtractedResults?.length > 0)
                ) {
                    const newDataTable = sorterFunction(data, sorterTable) || []
                    const l = newDataTable.length
                    const searchList: FuzzerResponse[] = []
                    for (let index = 0; index < l; index++) {
                        const record = newDataTable[index]
                        // 关键字搜索是否满足，默认 满足，以下同理,搜索同时为true时，push新数组
                        let keyWordIsPush = true
                        let statusCodeIsPush = true
                        let bodyLengthMinIsPush = true
                        let bodyLengthMaxIsPush = true
                        let durationMsMinIsPush = true
                        let durationMsMaxIsPush = true
                        let isHaveDataIsPush = true
                        let colorIsPush = true
                        // 搜索满足条件 交集
                        // 颜色搜索
                        if (record.MatchedByMatcher && query?.Color && query?.Color?.length > 0) {
                            const cLength = query.Color
                            let colorFlag = false
                            for (let index = 0; index < cLength.length; index++) {
                                const element = query.Color[index]
                                if (record.HitColor.toUpperCase().indexOf(element) > -1) {
                                    colorFlag = true
                                    break
                                }
                            }
                            colorIsPush = colorFlag
                        }
                        // 关键字搜索
                        if (query?.keyWord) {
                            const responseString = Uint8ArrayToString(record.ResponseRaw)
                            const payloadsString = (record.Payloads || []).join("")
                            let extractedResultsString = ""
                            if (extractedMap.size > 0) {
                                extractedResultsString = extractedMap.get(record["UUID"]) || ""
                            } else {
                                extractedResultsString = (record.ExtractedResults || [])
                                    .map((item) => `${item.Key}: ${item.Value}`)
                                    .join("")
                            }
                            keyWordIsPush = (responseString + payloadsString + extractedResultsString).includes(
                                query.keyWord
                            )
                        }
                        // 状态码搜索
                        if (query?.StatusCode && query?.StatusCode?.length > 0) {
                            const statusCodes = parseStatusCodes(query.StatusCode)
                            const codeIsPushArr: boolean[] = []
                            for (let index = 0; index < statusCodes.length; index++) {
                                const element = statusCodes[index]
                                if (record.StatusCode === element) {
                                    codeIsPushArr.push(true)
                                } else {
                                    codeIsPushArr.push(false)
                                }
                            }
                            statusCodeIsPush = codeIsPushArr.includes(true)
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
                        // 延迟搜索
                        if (query?.afterDurationMs) {
                            // 最小
                            durationMsMinIsPush = Number(record.DurationMs) >= query.afterDurationMs
                        }
                        if (query?.beforeDurationMs) {
                            // 最大
                            durationMsMaxIsPush = Number(record.DurationMs) <= query.beforeDurationMs
                        }
                        // 是否有提取数据
                        if (query?.ExtractedResults) {
                            let extractedResultsString = ""
                            if (extractedMap.size > 0) {
                                extractedResultsString = extractedMap.get(record["UUID"]) || ""
                            } else {
                                extractedResultsString = (record.ExtractedResults || [])
                                    .map((item) => `${item.Key}: ${item.Value}`)
                                    .join("")
                            }
                            isHaveDataIsPush = extractedResultsString
                                .toLocaleLowerCase()
                                .includes(query.ExtractedResults.trim().toLocaleLowerCase())
                        }
                        // 搜索同时为true时，push新数组
                        if (
                            colorIsPush &&
                            keyWordIsPush &&
                            statusCodeIsPush &&
                            bodyLengthMinIsPush &&
                            bodyLengthMaxIsPush &&
                            durationMsMinIsPush &&
                            durationMsMaxIsPush &&
                            isHaveDataIsPush
                        ) {
                            searchList.push(record)
                        }
                    }
                    setExportData && setExportData([...searchList])
                    setListTable([...searchList])
                    if (searchList.length > 0) {
                        scrollUpdate(searchList.length)
                    }
                } else {
                    const newData = sorterFunction(data, sorterTable) || []
                    setExportData && setExportData([...newData])
                    setListTable([...newData])
                    if (newData.length > 0) {
                        scrollUpdate(newData.length)
                    }
                }
                // ------------  搜索 结束  ------------
            } catch (error) {
                yakitFailed("搜索失败:" + error)
            }
        })

        const onGetExportFuzzerEvent = useMemoizedFn((v: string) => {
            try {
                const obj: {pageId: string; type: "all" | "payload"} = JSON.parse(v)
                if (pageId === obj.pageId) {
                    // 处理Uint8Array经过JSON.parse(JSON.stringify())导致数据损失和变形
                    const newListTable = listTable.map((item) => ({
                        ...item,
                        RequestRaw: Uint8ArrayToString(item.RequestRaw),
                        ResponseRaw: Uint8ArrayToString(item.ResponseRaw)
                    }))
                    emiter.emit(
                        "onGetExportFuzzerCallBack",
                        JSON.stringify({listTable: newListTable, type: obj.type, pageId})
                    )
                }
            } catch (error) {}
        })

        // 获取最新table值 用于筛选
        useEffect(() => {
            emiter.on("onGetExportFuzzer", onGetExportFuzzerEvent)
            return () => {
                emiter.off("onGetExportFuzzer", onGetExportFuzzerEvent)
            }
        }, [])

        const onRowClick = useMemoizedFn((val) => {
            if (val) {
                setCurrentSelectItem(val)
                setFirstFull(false)
            } else {
                setCurrentSelectItem(undefined)
                setFirstFull(true)
            }
        })

        const onSetCurrentRow = useDebounceFn(
            (rowDate?: FuzzerResponse) => {
                onRowClick(rowDate)
            },
            {wait: 200}
        ).run

        const ResizeBoxProps = useCreation(() => {
            let p = {
                firstRatio: "50%",
                secondRatio: "50%"
            }
            if (firstFull) {
                p.secondRatio = "0%"
                p.firstRatio = "100%"
            }
            return p
        }, [firstFull])

        const responseEditorRightMenu: OtherMenuListProps = useMemo(() => {
            return {
                overlayWidgetv: {
                    menu: [
                        {
                            key: "is-show-add-overlay-widgetv",
                            label: showResponseInfoSecondEditor ? "隐藏响应信息" : "显示响应信息"
                        }
                    ],
                    onRun: () => {
                        setRemoteValue(HTTP_PACKET_EDITOR_Response_Info, `${!showResponseInfoSecondEditor}`)
                        setShowResponseInfoSecondEditor(!showResponseInfoSecondEditor)
                    }
                }
            }
        }, [showResponseInfoSecondEditor])
        useEffect(() => {
            if (!editor || !currentSelectItem) return
            onAddOverlayWidget(editor, currentSelectItem, showResponseInfoSecondEditor)
        }, [currentSelectItem, showResponseInfoSecondEditor])
        const onExecResults = useMemoizedFn(() => {
            if (currentSelectItem) {
                onViewExecResults(currentSelectItem.ExtractedResults)
            }
        })

        const [typeOptionVal, setTypeOptionVal] = useState<RenderTypeOptionVal>()
        // 编辑器编码
        const [codeKey, setCodeKey] = useState<string>("utf-8")
        const [codeLoading, setCodeLoading] = useState<boolean>(false)
        const [codeValue, setCodeValue] = useState<string>("")
        useEffect(() => {
            if (currentSelectItem) {
                setCodeKey("utf-8")
                getRemoteValue(FuzzerRemoteGV.WebFuzzerEditorBeautify).then((res) => {
                    if (!!res) {
                        setTypeOptionVal(res)
                    } else {
                        setTypeOptionVal(undefined)
                    }
                })
            }
        }, [currentSelectItem, currentSelectShowType])

        const originReqOrResValue = useMemo(() => {
            const value =
                currentSelectShowType === "request" ? currentSelectItem?.RequestRaw : currentSelectItem?.ResponseRaw
            return (value && Uint8ArrayToString(value)) || ""
        }, [currentSelectShowType, currentSelectItem])

        const copyUrl = useMemoizedFn(() => {
            if (currentSelectItem?.RequestRaw) {
                copyAsUrl({
                    Request: Uint8ArrayToString(currentSelectItem?.RequestRaw),
                    IsHTTPS: !!currentSelectItem?.IsHTTPS
                })
            }
        })
        const onClickOpenBrowserMenu = useMemoizedFn(() => {
            if (currentSelectItem?.RequestRaw) {
                ipcRenderer
                    .invoke("ExtractUrl", {
                        Request: Uint8ArrayToString(currentSelectItem?.RequestRaw),
                        IsHTTPS: !!currentSelectItem?.IsHTTPS
                    })
                    .then((data: {Url: string}) => {
                        openExternalWebsite(data.Url)
                    })
                    .catch((e) => {
                        yakitNotify("error", "复制 URL 失败：包含 Fuzz 标签可能会导致 URL 不完整")
                    })
            }
        })

        return (
            <div className={styles["http-fuzzer-page-table"]} style={{overflowY: "hidden", height: "100%"}}>
                <YakitResizeBox
                    isVer={true}
                    lineDirection='bottom'
                    lineStyle={{display: firstFull ? "none" : ""}}
                    secondNodeStyle={{padding: firstFull ? 0 : undefined, display: firstFull ? "none" : ""}}
                    firstNode={
                        <div className={styles["fuzzer-page-table-wrap"]}>
                            {moreLimtAlertMsg && data.length >= fuzzerTableMaxData && (
                                <div style={{padding: "0 2px"}}>
                                    <ReactResizeDetector
                                        onResize={(w, h) => {
                                            if (!w || !h) {
                                                return
                                            }
                                            setAlertHeight(h)
                                        }}
                                        handleHeight={true}
                                        refreshMode={"debounce"}
                                        refreshRate={50}
                                    />
                                    <Alert
                                        message={moreLimtAlertMsg}
                                        type='warning'
                                        // closable
                                        // closeIcon={
                                        //     <YakitButton
                                        //         style={{float: "right"}}
                                        //         type='text2'
                                        //         size={"middle"}
                                        //         icon={<OutlineXIcon />}
                                        //     />
                                        // }
                                        style={{margin: "2px 0"}}
                                        // onClose={(e) => {
                                        //     setAlertClose(true)
                                        // }}
                                    />
                                </div>
                            )}
                            <div
                                style={{
                                    height:
                                        moreLimtAlertMsg && data.length >= fuzzerTableMaxData && !alertClose
                                            ? `calc(100% - ${alertHeight + 10}px)`
                                            : "100%"
                                }}
                            >
                                <TableVirtualResize<FuzzerResponse>
                                    ref={tableRef}
                                    query={query}
                                    isRefresh={isRefresh || loading}
                                    titleHeight={0.01}
                                    renderTitle={<></>}
                                    renderKey='UUID'
                                    data={listTable}
                                    loading={loading}
                                    enableDrag={true}
                                    columns={columns}
                                    onChange={onTableChange}
                                    containerClassName={classNames(styles["table-container"], {
                                        [styles["table-container-border"]]: currentSelectItem?.ResponseRaw
                                    })}
                                    currentSelectItem={currentSelectItem}
                                    onSetCurrentRow={onSetCurrentRow}
                                    useUpAndDown={tableKeyUpDownEnabled}
                                    scrollToIndex={scrollToIndex}
                                />
                            </div>
                        </div>
                    }
                    secondNode={
                        <NewHTTPPacketEditor
                            language={currentSelectItem?.DisableRenderStyles ? "text" : undefined}
                            isShowBeautifyRender={!currentSelectItem?.IsTooLargeResponse}
                            title={
                                <div className={styles["second-node-title-wrapper"]}>
                                    <span className={styles["second-node-title-text"]}>快速预览</span>
                                    <div className={styles["second-node-title-btns"]}>
                                        <YakitRadioButtons
                                            size='small'
                                            value={currentSelectShowType}
                                            onChange={(e) => {
                                                setCurrentSelectShowType(e.target.value)
                                            }}
                                            buttonStyle='solid'
                                            options={[
                                                {
                                                    value: "request",
                                                    label: "请求"
                                                },
                                                {
                                                    value: "response",
                                                    label: "响应"
                                                }
                                            ]}
                                        />
                                        {currentSelectItem?.IsTooLargeResponse && (
                                            <YakitTag style={{marginLeft: 8}} color='danger'>
                                                超大响应
                                            </YakitTag>
                                        )}
                                    </div>
                                </div>
                            }
                            defaultHttps={currentSelectItem?.IsHTTPS}
                            isResponse={true}
                            readOnly={true}
                            hideSearch={true}
                            noHex={true}
                            loading={codeLoading}
                            // noHeader={true}
                            originValue={codeKey === "utf-8" ? originReqOrResValue : codeValue}
                            originalPackage={
                                currentSelectShowType === "request"
                                    ? currentSelectItem?.RequestRaw
                                    : currentSelectItem?.ResponseRaw
                            }
                            onAddOverlayWidget={(editor) => {
                                setEditor(editor)
                            }}
                            isAddOverlayWidget={showResponseInfoSecondEditor}
                            contextMenu={responseEditorRightMenu}
                            webFuzzerValue={Uint8ArrayToString(currentSelectItem?.RequestRaw || new Uint8Array())}
                            extraEditorProps={{
                                isShowSelectRangeMenu: true
                            }}
                            extra={[
                                currentSelectItem?.IsTooLargeResponse && (
                                    <YakitDropdownMenu
                                        key='allRes'
                                        menu={{
                                            data: [
                                                {key: "tooLargeResponseHeaderFile", label: "查看Header"},
                                                {key: "tooLargeResponseBodyFile", label: "查看Body"}
                                            ],
                                            onClick: ({key}) => {
                                                switch (key) {
                                                    case "tooLargeResponseHeaderFile":
                                                        ipcRenderer
                                                            .invoke(
                                                                "is-file-exists",
                                                                currentSelectItem.TooLargeResponseHeaderFile
                                                            )
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(
                                                                        currentSelectItem.TooLargeResponseHeaderFile
                                                                    )
                                                                } else {
                                                                    failed("目标文件已不存在!")
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    case "tooLargeResponseBodyFile":
                                                        ipcRenderer
                                                            .invoke(
                                                                "is-file-exists",
                                                                currentSelectItem.TooLargeResponseBodyFile
                                                            )
                                                            .then((flag: boolean) => {
                                                                if (flag) {
                                                                    openABSFileLocated(
                                                                        currentSelectItem.TooLargeResponseBodyFile
                                                                    )
                                                                } else {
                                                                    failed("目标文件已不存在!")
                                                                }
                                                            })
                                                            .catch(() => {})
                                                        break
                                                    default:
                                                        break
                                                }
                                            }
                                        }}
                                        dropdown={{
                                            trigger: ["click"],
                                            placement: "bottom"
                                        }}
                                    >
                                        <YakitButton type='primary' size='small'>
                                            完整响应
                                        </YakitButton>
                                    </YakitDropdownMenu>
                                ),
                                <YakitButton size='small' onClick={onExecResults} key='extractData'>
                                    提取数据
                                </YakitButton>
                            ]}
                            AfterBeautifyRenderBtn={
                                <CodingPopover
                                    key='coding'
                                    originValue={
                                        (currentSelectShowType === "request"
                                            ? currentSelectItem?.RequestRaw
                                            : currentSelectItem?.ResponseRaw) || new Uint8Array()
                                    }
                                    onSetCodeLoading={setCodeLoading}
                                    codeKey={codeKey}
                                    onSetCodeKey={(codeKey) => {
                                        setCodeKey(codeKey)
                                    }}
                                    onSetCodeValue={setCodeValue}
                                />
                            }
                            typeOptionVal={typeOptionVal}
                            onTypeOptionVal={(typeOptionVal) => {
                                if (typeOptionVal !== undefined) {
                                    setTypeOptionVal(typeOptionVal)
                                    setRemoteValue(FuzzerRemoteGV.WebFuzzerEditorBeautify, typeOptionVal)
                                } else {
                                    setTypeOptionVal(undefined)
                                    setRemoteValue(FuzzerRemoteGV.WebFuzzerEditorBeautify, "")
                                }
                            }}
                            onClickUrlMenu={copyUrl}
                            onClickOpenBrowserMenu={onClickOpenBrowserMenu}
                            downbodyParams={{
                                RuntimeId: currentSelectItem?.RuntimeID,
                                IsRequest: currentSelectShowType === "request"
                            }}
                        />
                    }
                    {...ResizeBoxProps}
                />
            </div>
        )
    })
)

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
        useEffect(() => {
            setAfterBodyLength(query?.afterBodyLength)
            setBeforeBodyLength(query?.beforeBodyLength)
        }, [query])
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const objLength = {
                        afterBodyLength,
                        beforeBodyLength
                    }
                    return objLength
                }
            }),
            [afterBodyLength, beforeBodyLength]
        )
        return (
            <div className={styles["range-input-number"]}>
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
                            beforeBodyLength
                        })
                        setBeforeBodyLength(undefined)
                        setAfterBodyLength(undefined)
                    }}
                    onSure={() => {
                        setQuery({
                            ...query,
                            afterBodyLength,
                            beforeBodyLength
                        })
                    }}
                />
            </div>
        )
    })
)

interface DurationMsInputNumberProps {
    query?: HTTPFuzzerPageTableQuery
    setQuery: (h: HTTPFuzzerPageTableQuery) => void
    onSure?: () => void
    showFooter?: boolean
    ref?: any
}
export const DurationMsInputNumber: React.FC<DurationMsInputNumberProps> = React.memo(
    React.forwardRef((props, ref) => {
        const {query, setQuery, showFooter} = props
        // 响应大小
        const [afterDurationMs, setAfterDurationMs] = useState<number>()
        const [beforeDurationMs, setBeforeDurationMs] = useState<number>()
        useEffect(() => {
            setAfterDurationMs(query?.afterDurationMs)
            setBeforeDurationMs(query?.beforeDurationMs)
        }, [query])
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => {
                    const objLength = {
                        afterDurationMs,
                        beforeDurationMs
                    }
                    return objLength
                }
            }),
            [afterDurationMs, beforeDurationMs]
        )
        return (
            <div className={styles["range-input-number"]}>
                <RangeInputNumberTable
                    showFooter={showFooter}
                    minNumber={afterDurationMs}
                    setMinNumber={setAfterDurationMs}
                    maxNumber={beforeDurationMs}
                    setMaxNumber={setBeforeDurationMs}
                    onReset={() => {
                        setQuery({
                            ...query,
                            afterDurationMs,
                            beforeDurationMs
                        })
                        setBeforeDurationMs(undefined)
                        setAfterDurationMs(undefined)
                    }}
                    onSure={() => {
                        setQuery({
                            ...query,
                            afterDurationMs,
                            beforeDurationMs
                        })
                    }}
                />
            </div>
        )
    })
)
