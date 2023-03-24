import React, { useEffect, useMemo, useState } from "react";
import { AutoCard } from "@/components/AutoCard";
import { Divider, Empty, Space, Table, Tag } from "antd";
import { QueryCVERequest } from "@/pages/cve/CVEViewer";
import { useDebounceEffect, useDebounceFn, useKeyPress, useMemoizedFn } from "ahooks";
import { genDefaultPagination, PaginationSchema, QueryGeneralResponse } from "@/pages/invoker/schema";
import { ResizeBox } from "@/components/ResizeBox";
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton";
import { OneLine } from "@/utils/inputUtil";
import { CVEDetail } from "@/pages/cve/models";
import { CVEInspect } from "@/pages/cve/CVEInspect";
import { showDrawer } from "@/utils/showModal";
import { CVEDownloader } from "@/pages/cve/Downloader";
import styles from "./CVETable.module.scss";
import { TableVirtualResize } from "@/components/TableVirtualResize/TableVirtualResize";
import { ColumnsTypeProps } from "@/components/TableVirtualResize/TableVirtualResizeType";
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag";
import { YakitCombinationSearch } from "@/components/YakitCombinationSearch/YakitCombinationSearch";
import { RefreshIcon } from "@/assets/newIcon";
import classNames from "classnames";

export interface CVETableProp {
    filter: QueryCVERequest
}

const { ipcRenderer } = window.require("electron");

export const CVETable: React.FC<CVETableProp> = (props) => {
    const [selected, setSelected] = useState<string>();
    return <>
        <ResizeBox
            isVer={true}
            firstMinSize="200px"
            secondMinSize="200px"
            firstNode={<CVETableList filter={props.filter} setSelected={setSelected} />}
            secondNode={<CVEInspect CVE={selected} />}
        />
    </>
};

interface CVETableListProps {
    filter: QueryCVERequest
    setSelected: (s: string) => void
}
const CVETableList: React.FC<CVETableListProps> = React.memo((props) => {
    const { setSelected } = props
    const [params, setParams] = useState<QueryCVERequest>({ ...props.filter });
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState<PaginationSchema>(genDefaultPagination(50, 1));
    const [data, setData] = useState<CVEDetail[]>([]);
    const [total, setTotal] = useState(0);
    const [isRefresh, setIsRefresh] = useState<boolean>(false) // 刷新表格，滚动至0

    const [searchType, setSearchType] = useState<string>('CVE');



    useDebounceEffect(() => {
        setParams({
            ...props.filter,
            CVE: params.CVE,
            CWE: params.CWE
        })
        update(1)
    }, [props.filter], { wait: 1000 })
    const update = useMemoizedFn((page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
        const paginationProps = {
            Page: page || 1,
            Limit: limit || pagination.Limit,
        };
        setLoading(true)
        const finalParams = {
            ...params, ...extraParam ? extraParam : {}, Pagination: paginationProps,
        };
        // console.info('finalParams', finalParams)
        ipcRenderer.invoke("QueryCVE", finalParams).then((r: QueryGeneralResponse<CVEDetail>) => {
            console.info('QueryCVE', r)
            const d = Number(paginationProps.Page) === 1 ? r.Data : data.concat(r.Data)
            setData(d);
            setPagination(r.Pagination)
            setTotal(r.Total)
            if (Number(paginationProps.Page) === 1) {
                setIsRefresh(!isRefresh)
            }
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        update(1)
    }, [])
    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "CVE编号", dataKey: 'CVE', width: 160
            },
            {
                title: "概述",
                dataKey: 'Title',
                render: (_, i: CVEDetail) => i.Title || i.DescriptionZh || i.DescriptionOrigin
            },
            { title: "CWE 编号", dataKey: 'CWE', width: 160, render: (text) => text ? <YakitTag color="bluePurple">{text}</YakitTag> : '' },
            {
                title: "影响产品", dataKey: 'Product', width: 200,
            },
            {
                title: "漏洞级别",
                dataKey: 'Product',
                width: 120,
                render: (_, i: CVEDetail) => {
                    let color = "success";
                    if (i.BaseCVSSv2Score > 8.0 || i.Severity === "CRITICAL" || i.Severity == "HIGH") {
                        color = "danger"
                    } else if (i.BaseCVSSv2Score > 6.0) {
                        color = "warning"
                    }
                    return <div className={classNames(styles['cve-list-product-success'], {
                        [styles['cve-list-product-warning']]: color === "warning",
                        [styles['cve-list-product-danger']]: color === "danger",
                    })}>
                        <div className={classNames(styles['cve-list-severity'])}>{i.Severity}</div>
                        <span className={classNames(styles['cve-list-baseCVSSv2Score'])}>{i.BaseCVSSv2Score}</span>
                    </div>
                }
            },
        ]
    }, [])
    const onRowClick = useMemoizedFn((record: CVEDetail) => {
        setSelected(record.CVE); // 更新当前选中的行
    })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, _, filter: any) => {
            setParams({
                ...params,
                ...filter,
            })
            setTimeout(() => {
                update(1, limit)
            }, 10)
        },
        { wait: 500 }
    ).run
    const dataBaseUpdate = useMemoizedFn(() => {
        showDrawer({
            title: "下载/更新 CVE 漏洞库基础信息",
            width: 800,
            content: (
                <div style={{ width: 780 }}>
                    <CVEDownloader />
                </div>
            )
        })
    })
    return <div className={styles['cve-list']}>
        <TableVirtualResize<CVEDetail>
            query={params}
            titleHeight={36}
            size="middle"
            renderTitle={
                <div className={styles["cve-list-title-body"]}>
                    <div className={styles["cve-list-title"]}>CVE 数据库管理</div>
                    <div className={styles["cve-list-title-extra"]}>
                        <YakitCombinationSearch
                            selectProps={{
                                size: "small",
                            }}
                            beforeOptionWidth={68}
                            valueBeforeOption={searchType}
                            afterModuleType="input"
                            onSelectBeforeOption={(o) => {
                                if (o === "CVE") {
                                    setParams({
                                        ...params,
                                        CWE: ''
                                    })
                                }
                                if (o === "CWE") {
                                    setParams({
                                        ...params,
                                        CVE: ''
                                    })
                                }
                                setSearchType(o)
                            }}
                            addonBeforeOption={[
                                {
                                    label: "CVE",
                                    value: "CVE"
                                },
                                {
                                    label: "CWE",
                                    value: "CWE"
                                }
                            ]}
                            inputSearchModuleTypeProps={{
                                size: "middle",
                                value: params[searchType],
                                onChange: (e) => {
                                    setParams({
                                        ...params,
                                        [searchType]: e.target.value
                                    })
                                },
                                onSearch: () => update(1)
                            }}
                        />
                        <Divider type='vertical' />
                        <YakitButton type="primary" onClick={dataBaseUpdate}><RefreshIcon />数据库更新</YakitButton>
                    </div>
                </div>
            }
            isRefresh={isRefresh}
            renderKey='CVE'
            data={data}
            loading={loading}
            enableDrag={true}
            columns={columns}
            onRowClick={onRowClick}
            pagination={{
                page: pagination.Page,
                limit: pagination.Limit,
                total,
                onChange: update
            }}
            onChange={onTableChange}
        />
    </div>
})
