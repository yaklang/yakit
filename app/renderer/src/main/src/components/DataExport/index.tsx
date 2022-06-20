import React, {useRef, useState} from "react"
import {Button, ButtonProps, Modal, Space, Tag, Pagination} from "antd"
import {export_json_to_excel} from "./toExcel"
import {failed} from "../../utils/notification"
import {genDefaultPagination, PaginationSchema, QueryGeneralResponse} from "../../pages/invoker/schema"
import {useMemoizedFn} from "ahooks"
import "./index.css"

interface ExportExcelProps {
    btnProps?: ButtonProps
    getData: (query: PaginationSchema) => Promise<any>
    fileName?: string
    pageSize?: number
}

interface resProps {
    header: string[]
    exportData: Array<any>
    response: QueryGeneralResponse<any>
}

interface PaginationProps {
    Page: number
    Limit: number
}

const maxCellNumber = 100000 // 最大单元格10w

export const ExportExcel: React.FC<ExportExcelProps> = (props) => {
    const {btnProps, getData, fileName = "端口资产", pageSize = 10000} = props
    const [loading, setLoading] = useState<boolean>(false)
    const [visible, setVisible] = useState<boolean>(false)
    const [frequency, setFrequency] = useState<number>(0)
    const exportDataBatch = useRef<Array<any>>() // 保存导出的数据
    const exportNumber = useRef<number>() // 导出次数
    const headerExcel = useRef<string[]>() // excel的头部
    const [pagination, setPagination] = useState<QueryGeneralResponse<any>>({
        Data: [],
        Pagination: genDefaultPagination(pageSize, 1),
        Total: 0
    })
    const toExcel = useMemoizedFn((query = {Limit: pageSize, Page: 1}) => {
        setLoading(true)
        getData(query)
            .then((res: resProps) => {
                const {header, exportData, response} = res
                setPagination(response)
                const totalCellNumber = header.length * exportData.length
                if (totalCellNumber < maxCellNumber && response.Total <= pageSize) {
                    // 单元格数量小于最大单元格数量，直接导出
                    export_json_to_excel({
                        header: res.header,
                        data: res.exportData,
                        filename: `${fileName}1-${exportData.length}`,
                        autoWidth: true,
                        bookType: "xlsx"
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
        const list = exportDataBatch.current?.slice(firstIndx, lastIndex + 1)
        export_json_to_excel({
            header: headerExcel.current,
            data: list,
            filename: name,
            autoWidth: true,
            bookType: "xlsx"
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
            <Button onClick={() => toExcel()} loading={loading} {...btnProps}>
                导出Excel
            </Button>
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
                <div className='pagination'>
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
