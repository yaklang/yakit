import React, {useEffect, useRef, useState} from "react"
import {Button, ButtonProps, Modal, Space, Tag, Pagination, Checkbox, Row, Col} from "antd"
import {export_json_to_excel, CellSetting} from "./toExcel"
import {failed} from "../../utils/notification"
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "../../pages/invoker/schema"
import {useMemoizedFn} from "ahooks"
import {YakitButton, YakitButtonProp} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitCheckbox} from "../yakitUI/YakitCheckbox/YakitCheckbox"
import {CheckboxValueType} from "antd/lib/checkbox/Group"
import styles from "./DataExport.module.scss"
import classNames from "classnames"
import { getRemoteValue, setRemoteValue } from "@/utils/kv"
interface ExportExcelProps {
    btnProps?: ButtonProps
    newBtnProps?: YakitButtonProp
    getData: (query: PaginationSchema) => Promise<any>
    fileName?: string
    pageSize?: number
    showButton?: boolean
    text?: string
    openModal?: boolean
    newUI?: boolean
    newUIType?:
        | "outline1"
        | "outline2"
        | "text"
        | "primary"
        | "secondary1"
        | "secondary2"
        | "success"
        | "warning"
        | "danger"
        | "serious"
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

export const ExportExcel: React.FC<ExportExcelProps> = (props) => {
    const {
        btnProps,
        newBtnProps,
        getData,
        fileName = "端口资产",
        pageSize = 100000,
        showButton = true,
        text,
        openModal = false,
        newUI = false,
        newUIType = "outline2"
    } = props
    const [loading, setLoading] = useState<boolean>(false)
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
    const toExcel = useMemoizedFn((query = {Limit: pageSize, Page: 1}) => {
        setLoading(true)
        getData(query as any)
            .then((res: resProps) => {
                if (res) {
                    const {header, exportData, response, optsSingleCellSetting} = res
                    const totalCellNumber = header.length * exportData.length
                    if (totalCellNumber < maxCellNumber && response.Total <= pageSize) {
                        // 单元格数量小于最大单元格数量，直接导出
                        export_json_to_excel({
                            header: res.header,
                            data: res.exportData,
                            filename: `${fileName}1-${exportData.length}`,
                            autoWidth: true,
                            bookType: "xlsx",
                            optsSingleCellSetting
                        })
                    } else {
                        // 分批导出
                        const frequency = Math.ceil(totalCellNumber / maxCellNumber) // 导出次数
                        exportNumber.current = Math.floor(maxCellNumber / header.length) //每次导出的数量
                        exportDataBatch.current = exportData
                        headerExcel.current = header
                        setFrequency(frequency)
                        setVisible(true)
                    }
                    optsCell.current = optsSingleCellSetting
                    setPagination(response)
                }
            })
            .catch((e: any) => {
                failed("数据导出失败: " + `${e}`)
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
        const name = `${fileName}(第${pagination.Pagination.Page}页${
            exportNumber.current && firstIndx + 1
        }-${lastIndex})`
        const list: Array<string[]> = exportDataBatch.current?.slice(firstIndx, lastIndex + 1)
        export_json_to_excel({
            header: headerExcel.current,
            data: list,
            filename: name,
            autoWidth: true,
            bookType: "xlsx",
            optsSingleCellSetting: optsCell.current
        })
    }

    const onChange = (page, pageSize) => {
        const query: PaginationProps = {
            Page: page,
            Limit: pageSize
        }
        toExcel(query)
    }
    return (
        <>
            {showButton ? (
                <>
                    {newUI ? (
                        <YakitButton loading={loading} type={newUIType} onClick={() => toExcel()} {...newBtnProps}>
                            {text || "导出Excel"}
                        </YakitButton>
                    ) : (
                        <Button onClick={() => toExcel()} loading={loading} {...btnProps}>
                            {text || "导出Excel"}
                        </Button>
                    )}
                </>
            ) : newUI ? (
                <YakitButton loading={loading} type={newUIType} onClick={() => toExcel()} {...newBtnProps}>
                    {text || "导出Excel"}
                </YakitButton>
            ) : (
                <span onClick={() => toExcel()}>{text || "导出Excel"}</span>
            )}
            <Modal title='数据导出' visible={visible} onCancel={() => setVisible(false)} footer={null}>
                {/* <p>
                    共&nbsp;&nbsp;<Tag>{exportDataBatch.current?.length || 0}</Tag>条记录
                </p> */}
                <Space wrap>
                    {Array.from({length: frequency}).map((_, index) => (
                        <Button onClick={() => inBatchExport(index)}>
                            第{pagination.Pagination.Page}页{exportNumber.current && exportNumber.current * index + 1}-
                            {(index === frequency - 1 && exportDataBatch.current?.length) ||
                                (exportNumber.current && exportNumber.current * (index + 1))}
                        </Button>
                    ))}
                </Space>
                <div className={styles["pagination"]}>
                    <Pagination
                        size='small'
                        total={pagination.Total}
                        current={Number(pagination.Pagination.Page)}
                        pageSize={pageSize}
                        showTotal={(total) => `共 ${total} 条`}
                        hideOnSinglePage={true}
                        onChange={onChange}
                    />
                </div>
            </Modal>
        </>
    )
}

interface ExportSelectProps {
    /* 导出字段 */
    exportValue: string[]
    /* 传出导出字段 */
    setExportTitle:(v:string[])=>void
    /* 导出Key 用于缓存 */
    exportKey: string
    /* 导出数据方法 */
    getData: (query: PaginationSchema) => Promise<any>
    /* 导出文件名称 */
    fileName?: string
}
// 导出字段选择
export const ExportSelect: React.FC<ExportSelectProps> = (props) => {
    const {exportValue,fileName,setExportTitle,exportKey,getData} = props
    const [checkValue,setCheckValue] = useState<CheckboxValueType[]>([])
    useEffect(()=>{
        getRemoteValue(exportKey).then((setting) => {
            if (!setting) {
                // 第一次进入 默认勾选所有导出字段
                setExportTitle(exportValue as string[])
                setCheckValue(exportValue)
            }
            else{
                const values = JSON.parse(setting)
                setCheckValue(values?.checkedValues)
                setExportTitle(values?.checkedValues as string[])  
            }
            
        })
    },[])
    const onChange = (checkedValues: CheckboxValueType[]) => {
        const orderCheckedValues = exportValue.filter((item)=>checkedValues.includes(item))
        setExportTitle(orderCheckedValues)
        setCheckValue(orderCheckedValues)
        setRemoteValue(exportKey, JSON.stringify({checkedValues:orderCheckedValues}))
    }
    return (
        <div className={styles["export-select"]}>
            <Checkbox.Group style={{width: "100%"}} value={checkValue} onChange={onChange}>
                <Row>
                    {exportValue.map((item) => (
                        <Col span={6} className={styles["item"]}>
                            <YakitCheckbox value={item}>{item}</YakitCheckbox>
                        </Col>
                    ))}
                </Row>
            </Checkbox.Group>
            <div className={styles["button-box"]}>
                <ExportExcel
                    newBtnProps={{
                        className:"button"
                    }}
                    newUI={true}
                    newUIType='primary'
                    getData={getData}
                    fileName={fileName}
                    text="导出"
                />
            </div>
        </div>
    )
}
