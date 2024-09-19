// import React, {useEffect, useRef, useState} from "react"
// import {API} from "@/services/swagger/resposeType"
// import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
// import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
// import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
// import moment from "moment"
// import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
// import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
// import {PencilAltIcon, TrashIcon} from "@/assets/newIcon"
// import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
// import styles from "./NewLicenseAdminPage.module.scss"
// import {NetWorkApi} from "@/services/fetch"
// import {yakitNotify} from "@/utils/notification"
// interface LicenseAdminRequest {
//     keywords: string
//     status: number
//     page: number
//     limit: number
//     OrderBy: string
//     Order: string
// }
// export interface NewLicenseAdminPageProp {}
// export const NewLicenseAdminPage: React.FC<NewLicenseAdminPageProp> = (props) => {
//     const [isRefresh, setIsRefresh] = useState<boolean>(false)
//     const isInitRequestRef = useRef<boolean>(true)
//     const [query, setQuery] = useState<LicenseAdminRequest>({
//         keywords: "",
//         status: 0,
//         page: 1,
//         limit: 20,
//         OrderBy: "updated_at",
//         Order: "desc"
//     })
//     const [loading, setLoading] = useState(false)
//     const [response, setResponse] = useState<API.CompanyLicenseConfigResponse>({
//         data: [],
//         pagemeta: {
//             page: 1,
//             limit: 20,
//             total: 0,
//             total_page: 0
//         }
//     })

//     useEffect(() => {
//         update(1)
//     }, [])

//     const countDay = (now, later) => {
//         // 将时间戳相减获得差值（秒数）
//         const differ = later - now
//         const day = differ / 60 / 60 / 24
//         if (day > 30) {
//             return <YakitTag color='green'>正常使用</YakitTag>
//         } else if (0 < day && day <= 30) {
//             return <YakitTag color='yellow'>即将过期</YakitTag>
//         } else {
//             return <YakitTag color='danger'>已过期</YakitTag>
//         }
//     }

//     const columns: ColumnsTypeProps[] = [
//         {
//             title: "企业名称",
//             dataKey: "company"
//         },
//         {
//             title: "状态",
//             dataKey: "status",
//             render: (text, record) => countDay(record.currentTime, record.durationDate)
//         },
//         {
//             title: "有效期至",
//             dataKey: "durationDate",
//             render: (text) => moment.unix(text).format("YYYY-MM-DD")
//         },
//         {
//             title: "License(已使用/总数)",
//             dataKey: "useActivationNum",
//             render: (text, record) => {
//                 return `${text} / ${record.maxActivationNum}`
//             }
//         },
//         {
//             title: "用户总数",
//             dataKey: "maxUser"
//         },
//         {
//             title: "操作",
//             dataKey: "action",
//             width: 80,
//             fixed: "right",
//             render: (_, record: API.UserList) => (
//                 <div>
//                     <YakitButton type='text' icon={<PencilAltIcon />}></YakitButton>
//                     <YakitPopconfirm title={"确定删除该企业吗？"} onConfirm={() => {}} placement='right'>
//                         <YakitButton type='text' colors='danger' icon={<TrashIcon />}></YakitButton>
//                     </YakitPopconfirm>
//                 </div>
//             )
//         }
//     ]

//     const queyChangeUpdateData = useDebounceFn(
//         () => {
//             // 初次不通过此处请求数据
//             if (!isInitRequestRef.current) {
//                 update(1)
//             }
//         },
//         {wait: 300}
//     ).run

//     useUpdateEffect(() => {
//         queyChangeUpdateData()
//     }, [query])

//     const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
//         const newQuery = {
//             ...query,
//             ...filter
//         }
//         setQuery(newQuery)
//     })

//     const update = useMemoizedFn((page: number) => {
//         const params: LicenseAdminRequest = {
//             ...query,
//             page
//         }
//         const isInit = page === 1
//         isInitRequestRef.current = false
//         setLoading(true)
//         NetWorkApi<LicenseAdminRequest, API.CompanyLicenseConfigResponse>({
//             method: "get",
//             url: "company/license/config",
//             params: params
//         })
//             .then((res) => {
//                 const d = isInit ? res.data : response.data.concat(res.data)
//                 setResponse({
//                     ...res,
//                     data: d
//                 })
//                 if (isInit) {
//                     setIsRefresh(!isRefresh)
//                 }
//             })
//             .catch((e) => {
//                 yakitNotify("error", "查看license失败：" + e)
//             })
//             .finally(() => {
//                 setLoading(false)
//             })
//     })

//     return (
//         <div className={styles["licenseAdminPage"]}>
//             <TableVirtualResize<API.CompanyLicenseConfigList>
//                 loading={loading}
//                 query={query}
//                 isRefresh={isRefresh}
//                 titleHeight={42}
//                 title={
//                     <div className={styles["virtual-table-header-wrap"]}>
//                         <div className={styles["virtual-table-heard-left"]}>
//                             <div className={styles["virtual-table-heard-left-item"]}>
//                                 <span className={styles["virtual-table-heard-left-text"]}>Total</span>
//                                 <span className={styles["virtual-table-heard-left-number"]}>
//                                     {response.pagemeta.total}
//                                 </span>
//                             </div>
//                         </div>
//                     </div>
//                 }
//                 extra={
//                     <div className={styles["licenseAdminPage-table-extra"]}>
//                         <YakitButton size='small' onClick={() => {}}>
//                             添加企业
//                         </YakitButton>
//                         <YakitButton size='small' onClick={() => {}}>
//                             生成License
//                         </YakitButton>
//                     </div>
//                 }
//                 data={response.data}
//                 enableDrag={false}
//                 renderKey='id'
//                 columns={columns}
//                 useUpAndDown
//                 pagination={{
//                     total: response.pagemeta.total,
//                     limit: response.pagemeta.limit,
//                     page: response.pagemeta.page,
//                     onChange: (page) => {
//                         update(page)
//                     }
//                 }}
//                 onChange={onTableChange}
//             ></TableVirtualResize>
//         </div>
//     )
// }
