import React, {useEffect, useMemo, useRef, useState} from "react"
import {Space, Pagination, Checkbox, Row, Col} from "antd"
import {LoadingOutlined} from "@ant-design/icons"
import {export_json_to_excel, CellSetting} from "./toExcel"
import {failed} from "../../utils/notification"
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "../../pages/invoker/schema"
import {useMemoizedFn} from "ahooks"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import styles from "./DataExport.module.scss"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitModal} from "../yakitUI/YakitModal/YakitModal"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
interface ExportExcelProps {
    btnProps?: YakitButtonProp
    getData: (query: PaginationSchema) => Promise<any>
    fileName?: string
    pageSize?: number
    showButton?: boolean
    text?: string
    newUIType?: YakitButtonProp["type"]
    getContainer?: HTMLElement
}

interface resProps {
    header: string[]
    exportData: Array<any>
    response: QueryGeneralResponse<any>
    optsSingleCellSetting?: CellSetting
}

interface PaginationProps {
    Page: number
    Limit: number
}

const maxCellNumber = 100000 // 最大单元格10w

/* 校验数组长度是否大于90MB，并在超过90MB时将数组分割成多个小段 */
const splitArrayBySize = (arr, maxSizeInBytes) => {
    // chunkSize用于减少解析次数-性能优化（每chunkSize条判断一次）
    const chunkSize: number = 100
    const chunks: any[] = []
    let currentChunk: any[] = []
    let currentSize: number = 0

    for (let i = 0; i < arr.length; i++) {
        const element: any = arr[i]

        // 将元素添加到当前块
        currentChunk.push(element)

        // 每隔 chunkSize 条数据一起计算一次是否超过指定大小，或者已经到达数组末尾
        if ((i + 1) % chunkSize === 0 || i === arr.length - 1) {
            // 一起计算前20个元素的大小
            const elementsToCalculate = currentChunk.slice(-chunkSize)
            const elementsSize = elementsToCalculate.reduce((size, el) => {
                return size + new TextEncoder().encode(JSON.stringify(el)).length
            }, 0)

            currentSize += elementsSize

            if (currentSize > maxSizeInBytes) {
                // 如果当前块超过了指定大小，将其存储并创建新的块
                chunks.push(currentChunk.slice(0, -chunkSize)) // push 未超过时的数组
                currentChunk = elementsToCalculate
                currentSize = elementsSize
            } else if (i === arr.length - 1) {
                // 最后一次循环，且未超过指定大小，将剩余的 currentChunk 加到 chunks 中
                chunks.push(currentChunk)
            }
        }
    }

    return chunks
}

export const ExportExcel: React.FC<ExportExcelProps> = (props) => {
    const {
        btnProps,
        getData,
        fileName,
        pageSize = 100000,
        showButton = true,
        text,
        newUIType = "outline2",
        getContainer
    } = props
    const {t, i18n} = useI18nNamespaces(["yakitUi", "yakitRoute", "components"])
    const [loading, setLoading] = useState<boolean>(false)
    const [selectItem, setSelectItem] = useState<number>()
    const [visible, setVisible] = useState<boolean>(false)
    const [frequency, setFrequency] = useState<number>(0)
    const exportDataBatch = useRef<Array<string[]>>([]) // 保存导出的数据
    const exportNumber = useRef<number>() // 导出次数
    const headerExcel = useRef<string[]>([]) // excel的头部
    const optsCell = useRef<CellSetting>() // excel的头部
    const [pagination, setPagination] = useState<QueryGeneralResponse<any>>({
        Data: [],
        Pagination: genDefaultPagination(pageSize, 1),
        Total: 0
    })
    const [splitVisible, setSplitVisible] = useState<boolean>(false)
    const [chunksData, setChunksData] = useState<any[]>([])
    const beginNumberRef = useRef<number>(0)
    const fileNameMemo = useMemo(() => {
        return fileName || t("YakitRoute.portAssets")
    }, [i18n.language, fileName])

    const toExcel = useMemoizedFn((query = {Limit: pageSize, Page: 1}) => {
        setLoading(true)
        getData(query as any)
            .then((res: resProps) => {
                if (res) {
                    const {header, exportData, response, optsSingleCellSetting} = res
                    const totalCellNumber = header.length * exportData.length

                    const maxSizeInBytes = 90 * 1024 * 1024 // 90MB
                    const chunks: any[] = splitArrayBySize(exportData, maxSizeInBytes)

                    if (totalCellNumber < maxCellNumber && response.Total <= pageSize && chunks.length === 1) {
                        // 单元格数量小于最大单元格数量 或者导出内容小于90M，直接导出
                        export_json_to_excel({
                            header: header,
                            data: exportData,
                            filename: `${fileNameMemo} 1-${exportData.length}`,
                            autoWidth: true,
                            bookType: "xlsx",
                            optsSingleCellSetting
                        })
                    } else if (!(totalCellNumber < maxCellNumber && response.Total <= pageSize)) {
                        // 分批导出
                        const frequency = Math.ceil(totalCellNumber / maxCellNumber) // 导出次数
                        exportNumber.current = Math.floor(maxCellNumber / header.length) //每次导出的数量
                        exportDataBatch.current = exportData
                        headerExcel.current = header
                        optsCell.current = optsSingleCellSetting
                        setFrequency(frequency)
                        setVisible(true)
                    } else {
                        // 分割导出
                        headerExcel.current = header
                        optsCell.current = optsSingleCellSetting
                        setSplitVisible(true)
                        setChunksData(chunks)
                        // let begin:number = 0
                        // for (let i = 0; i < chunks.length; i++) {
                        //     let filename = `${fileNameMemo} ${begin||1}-${begin+chunks[i].length}`
                        //     begin += chunks[i].length
                        //     export_json_to_excel({
                        //         header: header,
                        //         data: chunks[i],
                        //         filename,
                        //         autoWidth: true,
                        //         bookType: "xlsx",
                        //         optsSingleCellSetting
                        //     })
                        // }
                    }

                    setPagination(response)
                }
            })
            .catch((e: any) => {
                failed(t("YakitNotification.exportFailed", {colon: true}) + `${e}`)
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    })

    // 分批导出
    const inBatchExport = (index: number) => {
        if (!exportNumber.current) return
        const firstIndx = exportNumber.current * index
        const lastIndex =
            (index === frequency - 1 && exportDataBatch.current?.length) ||
            (exportNumber.current && exportNumber.current * (index + 1))
        const name = `${fileNameMemo} ${t("ExportExcel.pageNumber", {
            page: pagination.Pagination.Page
        })} ${exportNumber.current && firstIndx + 1}-${lastIndex})`
        const list: Array<string[]> = exportDataBatch.current?.slice(firstIndx, lastIndex + 1)
        export_json_to_excel({
            header: headerExcel.current,
            data: list,
            filename: name,
            autoWidth: true,
            bookType: "xlsx",
            optsSingleCellSetting: optsCell.current
        })
        setSelectItem(undefined)
    }

    const onChange = (page, pageSize) => {
        const query: PaginationProps = {
            Page: page,
            Limit: pageSize
        }
        toExcel(query)
    }

    const onSplitExport = useMemoizedFn((data, start, end) => {
        export_json_to_excel({
            header: headerExcel.current,
            data: data,
            filename: `${fileNameMemo} ${start}-${end}`,
            autoWidth: true,
            bookType: "xlsx",
            optsSingleCellSetting: optsCell.current
        })
        setSelectItem(undefined)
    })
    return (
        <>
            {showButton ? (
                <>
                    <YakitButton loading={loading} type={newUIType} onClick={() => toExcel()} {...btnProps}>
                        {text || t("YakitButton.exportExcel")}
                    </YakitButton>
                </>
            ) : (
                <>
                    <span onClick={() => toExcel()}>{text || t("YakitButton.exportExcel")}</span>
                    {loading && <LoadingOutlined spin={loading} style={{marginLeft: 5}} />}
                </>
            )}
            <YakitModal
                title={t("ExportExcel.dataExport")}
                closable={true}
                visible={visible}
                onCancel={() => setVisible(false)}
                footer={null}
                getContainer={getContainer}
            >
                <div style={{padding: 24}}>
                    <Space wrap>
                        {Array.from({length: frequency}).map((_, index) => (
                            <YakitButton
                                type='outline2'
                                loading={selectItem === index}
                                disabled={typeof selectItem === "number"}
                                key={index}
                                onClick={() => {
                                    setSelectItem(index)
                                    setTimeout(() => {
                                        inBatchExport(index)
                                    }, 500)
                                }}
                            >
                                {t("ExportExcel.pageNumber", {page: pagination.Pagination.Page})}
                                {exportNumber.current && exportNumber.current * index + 1}-
                                {(index === frequency - 1 && exportDataBatch.current?.length) ||
                                    (exportNumber.current && exportNumber.current * (index + 1))}
                            </YakitButton>
                        ))}
                    </Space>
                    <div className={styles["pagination"]}>
                        <Pagination
                            size='small'
                            total={pagination.Total}
                            current={Number(pagination.Pagination.Page)}
                            pageSize={pageSize}
                            showTotal={(total) => (
                                <div style={{color: "var(--Colors-Use-Neutral-Text-1-Title)"}}>
                                    {t("ExportExcel.totalItems", {total})}
                                </div>
                            )}
                            hideOnSinglePage={true}
                            onChange={onChange}
                        />
                    </div>
                </div>
            </YakitModal>
            <YakitModal
                title={t("ExportExcel.dataExport")}
                closable={true}
                visible={splitVisible}
                onCancel={() => setSplitVisible(false)}
                footer={null}
                getContainer={getContainer}
            >
                <div style={{padding: 24}}>
                    <Space wrap>
                        {chunksData.map((item, index) => {
                            if (index === 0) {
                                beginNumberRef.current = 1
                            }
                            const start = beginNumberRef.current
                            const end = start + item.length - 1
                            beginNumberRef.current = end + 1
                            return (
                                <YakitButton
                                    loading={selectItem === index}
                                    disabled={typeof selectItem === "number"}
                                    key={index}
                                    type='outline2'
                                    onClick={() => {
                                        setSelectItem(index)
                                        setTimeout(() => {
                                            onSplitExport(item, start, end)
                                        }, 500)
                                    }}
                                >
                                    {start}-{end}
                                </YakitButton>
                            )
                        })}
                    </Space>
                </div>
            </YakitModal>
        </>
    )
}

type ExportValue = string | {title: string; key: string}
interface ExportSelectProps {
    /* 导出字段 */
    exportValue: ExportValue[]
    /* 传出导出字段 */
    setExportTitle: (v: string[]) => void
    /* 导出Key 用于缓存 */
    exportKey: string
    /* 导出数据方法 */
    getData: (query: PaginationSchema) => Promise<any>
    /* 导出文件名称 */
    fileName?: string
    /* limit */
    pageSize?: number
    initCheckValue?: ExportValue[]
    /**关闭 */
    onClose: () => void
    getContainer?: HTMLElement
}
// 导出字段选择
export const ExportSelect: React.FC<ExportSelectProps> = (props) => {
    const {exportValue, fileName, setExportTitle, exportKey, getData, pageSize, initCheckValue, onClose, getContainer} =
        props
    const {t, i18n} = useI18nNamespaces(["yakitUi"])
    const [checkValue, setCheckValue] = useState<CheckboxValueType[]>([])

    const handleExportVal = useMemoizedFn((arr?: ExportValue[]) => {
        return arr
            ? arr.map((item) => {
                  if (typeof item === "string") {
                      return item
                  } else {
                      return item.key
                  }
              })
            : []
    })
    useEffect(() => {
        getRemoteValue(exportKey).then((setting) => {
            if (!setting) {
                // 第一次进入 默认勾选所有导出字段
                setExportTitle(handleExportVal(initCheckValue || exportValue))
                setCheckValue(handleExportVal(initCheckValue || exportValue))
            } else {
                const values = JSON.parse(setting)
                setCheckValue(values?.checkedValues)
                setExportTitle(values?.checkedValues)
            }
        })
    }, [])
    const onChange = (checkedValues: CheckboxValueType[]) => {
        const orderCheckedValues = exportValue.filter((item) =>
            checkedValues.includes(typeof item === "string" ? item : item.key)
        )
        setExportTitle(handleExportVal(orderCheckedValues))
        setCheckValue(handleExportVal(orderCheckedValues))
        setRemoteValue(exportKey, JSON.stringify({checkedValues: handleExportVal(orderCheckedValues)}))
    }
    return (
        <div className={styles["export-select"]}>
            <Checkbox.Group style={{width: "100%", padding: 24}} value={checkValue} onChange={onChange}>
                <Row>
                    {exportValue.map((item) => (
                        <Col span={6} className={styles["item"]} key={typeof item === "string" ? item : item.key}>
                            <YakitCheckbox value={typeof item === "string" ? item : item.key}>
                                {typeof item === "string" ? item : item.title}
                            </YakitCheckbox>
                        </Col>
                    ))}
                </Row>
            </Checkbox.Group>
            <div className={styles["button-box"]}>
                <YakitButton type='outline2' onClick={() => onClose()}>
                    {t("YakitButton.cancel")}
                </YakitButton>
                <ExportExcel
                    newUIType='primary'
                    getData={getData}
                    fileName={fileName}
                    text={t("YakitButton.export")}
                    pageSize={pageSize}
                    getContainer={getContainer}
                />
            </div>
        </div>
    )
}
