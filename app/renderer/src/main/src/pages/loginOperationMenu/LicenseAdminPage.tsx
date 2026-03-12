import React, {useEffect, useRef, useState} from "react"
import {API} from "@/services/swagger/resposeType"
import {useDebounceFn, useMemoizedFn, useUpdateEffect} from "ahooks"
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import moment from "moment"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize"
import {NetWorkApi} from "@/services/fetch"
import {yakitNotify} from "@/utils/notification"
import {
    OutlineInformationcircleIcon,
    OutlinePencilaltIcon,
    OutlinePluscircleIcon,
    OutlineSearchIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {Form, Space, Tooltip, Typography} from "antd"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitInputNumber} from "@/components/yakitUI/YakitInputNumber/YakitInputNumber"
import locale from "antd/es/date-picker/locale/zh_CN"
import {YakitDatePicker} from "@/components/yakitUI/YakitDatePicker/YakitDatePicker"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {ExclamationCircleOutlined} from "@ant-design/icons"
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import styles from "./LicenseAdminPage.module.scss"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
const {Paragraph} = Typography
interface LicenseAdminRequest {
    keywords: string
    status: number
    page: number
    limit: number
    orderBy: string
    order: string
}
export interface LicenseAdminPageProp {}
export const LicenseAdminPage: React.FC<LicenseAdminPageProp> = (props) => {
    const {t} = useI18nNamespaces(["admin", "yakitUi"])
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const isInitRequestRef = useRef<boolean>(true)
    const [query, setQuery] = useState<LicenseAdminRequest>({
        keywords: "",
        status: 0,
        page: 1,
        limit: 20,
        orderBy: "updated_at",
        order: "desc"
    })
    const [loading, setLoading] = useState(false)
    const [response, setResponse] = useState<API.CompanyLicenseConfigResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const [enterprisesPopShow, setEnterprisesPopShow] = useState<boolean>(false)
    const editInfoRef = useRef<API.CompanyLicenseConfigList>()
    const [createLicensePopShow, setCreateLicensePopShow] = useState<boolean>(false)
    const companyRef = useRef<API.CompanyLicenseConfigList>()

    useEffect(() => {
        update(1)
    }, [])

    const countDay = (now, later) => {
        // 将时间戳相减获得差值（秒数）
        const differ = later - now
        const day = differ / 60 / 60 / 24
        if (day > 30) {
            return <YakitTag color='green'>{t("LicenseAdminPage.normalUse")}</YakitTag>
        } else if (0 < day && day <= 30) {
            return <YakitTag color='yellow'>{t("LicenseAdminPage.expiringSoon")}</YakitTag>
        } else {
            return <YakitTag color='danger'>{t("LicenseAdminPage.expired")}</YakitTag>
        }
    }

    const columns: ColumnsTypeProps[] = [
        {
            title: t("LicenseAdminPage.companyName"),
            dataKey: "company",
            filterProps: {
                filterKey: "keywords",
                filtersType: "input",
                filterIcon: <OutlineSearchIcon className={styles["filter-icon"]} />
            },
            fixed: "left"
        },
        {
            title: t("LicenseAdminPage.status"),
            dataKey: "status",
            render: (text, record) => countDay(record.currentTime, record.durationDate),
            filterProps: {
                filterKey: "status",
                filtersType: "select",
                filtersSelectAll: {
                    isAll: true,
                    textAll: t("LicenseAdminPage.all")
                },
                filters: [
                    {
                        label: t("LicenseAdminPage.expired"),
                        value: "1"
                    },
                    {
                        label: t("LicenseAdminPage.expiringSoon"),
                        value: "2"
                    },
                    {
                        label: t("LicenseAdminPage.normalUse"),
                        value: "3"
                    }
                ]
            }
        },
        {
            title: t("LicenseAdminPage.validUntil"),
            dataKey: "durationDate",
            render: (text) => moment.unix(text).format("YYYY-MM-DD")
        },
        {
            title: t("LicenseAdminPage.licenseUsedTotal"),
            dataKey: "useActivationNum",
            render: (text, record) => {
                return `${text} / ${record.maxActivationNum}`
            }
        },
        {
            title: t("LicenseAdminPage.totalUsers"),
            dataKey: "maxUser"
        },
        {
            title: t("YakitTable.action"),
            dataKey: "action",
            width: 130,
            fixed: "right",
            render: (_, record: API.CompanyLicenseConfigList) => (
                <div className={styles["table-action-icon"]}>
                    <Tooltip title={t("LicenseAdminPage.generateLicense")} align={{offset: [-5, 10]}}>
                        <OutlinePluscircleIcon
                            className={styles["action-icon"]}
                            onClick={() => {
                                companyRef.current = record
                                setCreateLicensePopShow(true)
                            }}
                        />
                    </Tooltip>
                    <OutlinePencilaltIcon
                        className={styles["action-icon"]}
                        onClick={() => {
                            editInfoRef.current = record
                            setEnterprisesPopShow(true)
                        }}
                    />
                    <YakitPopconfirm
                        title={t("LicenseAdminPage.confirmDeleteCompany")}
                        onConfirm={() => onRemoveSingle(record.id)}
                        placement='right'
                    >
                        <OutlineTrashIcon className={styles["del-icon"]} />
                    </YakitPopconfirm>
                </div>
            )
        }
    ]

    const queyChangeUpdateData = useDebounceFn(
        () => {
            // 初次不通过此处请求数据
            if (!isInitRequestRef.current) {
                update(1)
            }
        },
        {wait: 300}
    ).run

    useUpdateEffect(() => {
        queyChangeUpdateData()
    }, [query])

    const onTableChange = useMemoizedFn((page: number, limit: number, newSort: SortProps, filter: any) => {
        setQuery((prevQuery) => ({...prevQuery, ...filter}))
    })

    const update = useMemoizedFn((page: number) => {
        const params: LicenseAdminRequest = {
            ...query,
            page
        }
        const isInit = page === 1
        isInitRequestRef.current = false
        if (isInit) {
            setLoading(true)
        }
        NetWorkApi<LicenseAdminRequest, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: params
        })
            .then((res) => {
                const data = res.data || []
                const d = isInit ? data : response.data.concat(data)
                setResponse({
                    ...res,
                    data: d
                })
                if (isInit) {
                    setIsRefresh((prevIsRefresh) => !prevIsRefresh)
                }
            })
            .catch((e) => {
                yakitNotify("error", t("LicenseAdminPage.viewLicenseFailed", {error: e}))
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const onRemoveSingle = (id: number) => {
        NetWorkApi<any, API.NewUrmResponse>({
            method: "delete",
            url: "company/license/config",
            data: {
                id
            }
        })
            .then((res) => {
                yakitNotify("success", t("LicenseAdminPage.deleteCompanySuccess"))
                setResponse((prevResponse) => {
                    return {
                        ...prevResponse,
                        data: prevResponse.data.filter((item) => item.id !== id),
                        pagemeta: {
                            ...prevResponse.pagemeta,
                            total: prevResponse.pagemeta.total - 1 > 0 ? prevResponse.pagemeta.total - 1 : 0
                        }
                    }
                })
            })
            .catch((err) => {
                yakitNotify("error", t("LicenseAdminPage.deleteCompanyFailed", {error: err}))
            })
    }

    return (
        <div className={styles["licenseAdminPage"]}>
            <TableVirtualResize<API.CompanyLicenseConfigList>
                loading={loading}
                query={query}
                isRefresh={isRefresh}
                titleHeight={42}
                title={
                    <div className={styles["virtual-table-header-wrap"]}>
                        <div className={styles["virtual-table-heard-left"]}>
                            <div className={styles["virtual-table-heard-left-item"]}>
                                <span className={styles["virtual-table-heard-left-text"]}>Total</span>
                                <span className={styles["virtual-table-heard-left-number"]}>
                                    {response.pagemeta.total}
                                </span>
                            </div>
                        </div>
                    </div>
                }
                extra={
                    <div className={styles["licenseAdminPage-table-extra"]}>
                        <YakitButton size='small' onClick={() => setEnterprisesPopShow(true)}>
                            {t("LicenseAdminPage.addCompany")}
                        </YakitButton>
                        <YakitButton size='small' onClick={() => setCreateLicensePopShow(true)}>
                            {t("LicenseAdminPage.generateLicense")}
                        </YakitButton>
                    </div>
                }
                data={response.data}
                enableDrag={false}
                renderKey='id'
                columns={columns}
                useUpAndDown
                pagination={{
                    total: response.pagemeta.total,
                    limit: response.pagemeta.limit,
                    page: response.pagemeta.page,
                    onChange: (page) => {
                        update(page)
                    }
                }}
                onChange={onTableChange}
            ></TableVirtualResize>
            <YakitModal
                visible={enterprisesPopShow}
                title={editInfoRef.current ? t("LicenseAdminPage.editCompany") : t("LicenseAdminPage.createCompany")}
                destroyOnClose={true}
                maskClosable={false}
                width={600}
                onCancel={() => {
                    setEnterprisesPopShow(false)
                    editInfoRef.current = undefined
                }}
                footer={null}
            >
                <LicenseForm
                    editInfo={editInfoRef.current}
                    onCancel={() => {
                        setEnterprisesPopShow(false)
                        editInfoRef.current = undefined
                    }}
                    refresh={() => {
                        update(1)
                    }}
                />
            </YakitModal>
            <YakitModal
                visible={createLicensePopShow}
                title={t("LicenseAdminPage.generateLicense")}
                destroyOnClose={true}
                maskClosable={false}
                width={600}
                onCancel={() => {
                    setCreateLicensePopShow(false)
                    companyRef.current = undefined
                }}
                footer={null}
            >
                <CreateLicense
                    company={companyRef.current}
                    onCancel={() => {
                        setCreateLicensePopShow(false)
                        companyRef.current = undefined
                    }}
                    refresh={() => update(1)}
                />
            </YakitModal>
        </div>
    )
}

interface NewUrmRequest {
    id?: number
    company: string
    maxActivationNum: number
    maxUser: number
    durationDate: number
}
interface LicenseFormProps {
    onCancel: () => void
    refresh: () => void
    editInfo?: API.CompanyLicenseConfigList
}
const LicenseForm: React.FC<LicenseFormProps> = (props) => {
    const {t} = useI18nNamespaces(["admin", "yakitUi"])
    const {onCancel, refresh, editInfo} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [disabledSubmit, setDisabledSubmit] = useState<boolean>(!!editInfo)

    useEffect(() => {
        if (editInfo) {
            form.setFieldsValue({
                company: editInfo.company,
                maxActivationNum: editInfo.maxActivationNum,
                maxUser: editInfo.maxUser,
                durationDate: moment.unix(editInfo.durationDate)
            })
        }
    }, [])

    const requestFun = (params: NewUrmRequest) => {
        setLoading(true)
        NetWorkApi<NewUrmRequest, API.ActionSucceeded>({
            method: "post",
            url: "company/license/config",
            data: params
        })
            .then((res) => {
                onCancel()
                refresh()
            })
            .catch((err) => {
                yakitNotify("error", t("LicenseForm.companyOperationFailed", {error: err}))
            })
            .finally(() => {
                setLoading(false)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        let params: NewUrmRequest = {
            ...values,
            durationDate: values.durationDate.unix()
        }
        if (editInfo?.id) params.id = editInfo.id
        if (editInfo && values.maxUser > editInfo.maxUser) {
            params.maxActivationNum = values.maxActivationNum + 1
            let m = YakitModalConfirm({
                width: 420,
                type: "white",
                onCancelText: "取消",
                onOkText: "确认",
                icon: <ExclamationCircleOutlined />,
                onOk: () => {
                    requestFun(params)
                    m.destroy()
                },
                content: t("LicenseForm.changeUserCountWarning")
            })
        } else {
            requestFun(params)
        }
    })

    return (
        <div style={{marginTop: 24}}>
            <Form labelCol={{span: 5}} wrapperCol={{span: 16}} form={form} onFinish={onFinish}>
                <Form.Item
                    name='company'
                    label={t("LicenseAdminPage.companyName")}
                    rules={[{required: true, message: t("YakitForm.requiredField")}]}
                >
                    <YakitInput placeholder={t("LicenseForm.inputCompanyName")} allowClear disabled={!!editInfo} />
                </Form.Item>
                <Form.Item
                    name='maxActivationNum'
                    label={t("LicenseForm.totalLicenses")}
                    rules={[
                        {required: true, message: t("YakitForm.requiredField")},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value < editInfo.maxActivationNum) {
                                    return Promise.reject(t("LicenseForm.licenseCannotDecrease"))
                                } else {
                                    setDisabledSubmit(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <YakitInputNumber placeholder={t("LicenseForm.inputTotalLicenses")} min={0} />
                </Form.Item>
                <Form.Item
                    name='maxUser'
                    label={t("LicenseAdminPage.totalUsers")}
                    tooltip={
                        editInfo
                            ? {
                                  icon: <OutlineInformationcircleIcon />,
                                  title: t("LicenseForm.changeUserCountTooltip")
                              }
                            : null
                    }
                    rules={[
                        {required: true, message: t("YakitForm.requiredField")},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value < editInfo.maxUser) {
                                    return Promise.reject(t("LicenseForm.userCountCannotDecrease"))
                                } else {
                                    setDisabledSubmit(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <YakitInputNumber placeholder={t("LicenseForm.inputTotalUsers")} min={0} />
                </Form.Item>
                <Form.Item
                    name='durationDate'
                    label={t("LicenseForm.validityPeriod")}
                    tooltip={
                        editInfo
                            ? {
                                  icon: <OutlineInformationcircleIcon />,
                                  title: t("LicenseForm.changeValidityPeriodTooltip")
                              }
                            : null
                    }
                    rules={[
                        {required: true, message: t("YakitForm.requiredField")},
                        {
                            validator: (rule, value) => {
                                if (editInfo && value && value.unix() < editInfo.durationDate) {
                                    return Promise.reject(t("LicenseForm.validityPeriodCannotShorten"))
                                } else {
                                    setDisabledSubmit(false)
                                    return Promise.resolve()
                                }
                            }
                        }
                    ]}
                >
                    <YakitDatePicker
                        locale={locale}
                        format='YYYY-MM-DD'
                        placeholder={t("LicenseForm.clickToSetValidityPeriod")}
                        style={{width: "100%"}}
                    />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <YakitButton
                        disabled={disabledSubmit}
                        style={{width: 200}}
                        type='primary'
                        htmlType='submit'
                        loading={loading}
                    >
                        {t("YakitButton.confirm")}
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
}

interface SelectDataProps {
    value: number
    label: string
}
interface LicenseCreatRequest {
    company: string
    license: string
    maxUser: number
    company_version: string
}
interface CreateLicenseProps {
    company?: API.CompanyLicenseConfigList
    onCancel: () => void
    refresh: () => void
}
const CreateLicense: React.FC<CreateLicenseProps> = (props) => {
    const {t} = useI18nNamespaces(["admin", "yakitUi"])
    const {company, onCancel, refresh} = props
    const [form] = Form.useForm()
    const [loading, setLoading] = useState<boolean>(false)
    const [selectLoading, setSelectLoading] = useState<boolean>(true)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        order: "desc",
        orderBy: "updated_at"
    })
    const [response, setResponse] = useState<API.CompanyLicenseConfigResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit: 20,
            total: 0,
            total_page: 0
        }
    })
    const [selectData, setSelectData] = useState<SelectDataProps[]>([])
    const keywordsRef = useRef<string>(company?.company || "")

    useEffect(() => {
        if (company) {
            form.setFieldsValue({
                id: company.id
            })
        }
        update(1)
    }, [])

    const update = (page: number) => {
        setSelectLoading(true)
        const paginationProps = {
            ...pagination,
            page: page,
            limit: pagination.limit
        }
        const isInit = page === 1
        NetWorkApi<LicenseAdminRequest, API.CompanyLicenseConfigResponse>({
            method: "get",
            url: "company/license/config",
            params: {
                keywords: keywordsRef.current,
                status: 0,
                ...paginationProps
            }
        })
            .then((res) => {
                let data = res.data || []
                if (data.length > 0) {
                    setPagination((v) => ({...v, page: paginationProps.page}))
                }
                const newData = data.map((item) => ({
                    value: item.id,
                    label: item.company
                }))
                const d = isInit ? data : response.data.concat(data)
                const opsd = isInit ? newData : selectData.concat(newData)
                setResponse({
                    ...res,
                    data: d
                })
                setSelectData(opsd)
            })
            .catch((err) => {
                yakitNotify("error", t("LicenseAdminPage.viewLicenseFailed", {error: err}))
            })
            .finally(() => {
                setSelectLoading(false)
            })
    }

    const onFinish = useMemoizedFn((values) => {
        setLoading(true)
        const {id, license, company_version} = values
        const selectDate = response.data.filter((item) => item.id === id)[0]
        const {company, maxUser} = selectDate
        let params: LicenseCreatRequest = {
            license,
            company,
            maxUser,
            company_version
        }
        NetWorkApi<LicenseCreatRequest, string>({
            method: "post",
            url: "license/activation",
            data: params
        })
            .then((text) => {
                onCancel()
                refresh()
                const m = showYakitModal({
                    title: t("CreateLicense.generateSuccess"),
                    content: (
                        <div style={{padding: 15}}>
                            <Paragraph>
                                {text}
                                <CopyComponents copyText={text} />
                            </Paragraph>
                        </div>
                    ),
                    maskClosable: false,
                    footer: null
                })
            })
            .catch((err) => {
                yakitNotify("error", t("LicenseForm.companyOperationFailed", {error: err}))
            })
            .finally(() => {
                setLoading(false)
            })
    })

    const selectDropdown = useMemoizedFn((originNode: React.ReactNode) => {
        return (
            <div>
                <YakitSpin spinning={selectLoading}>{originNode}</YakitSpin>
            </div>
        )
    })

    return (
        <div style={{marginTop: 24}}>
            <Form labelCol={{span: 5}} wrapperCol={{span: 16}} form={form} onFinish={onFinish}>
                <Form.Item
                    name='id'
                    label={t("LicenseAdminPage.companyName")}
                    rules={[{required: true, message: t("YakitForm.requiredField")}]}
                >
                    <YakitSelect
                        disabled={!!company}
                        showSearch
                        optionFilterProp='children'
                        placeholder={t("CreateLicense.selectCompanyName")}
                        filterOption={(input, option) => {
                            const val = (option?.label ?? "") + ""
                            return val.toLowerCase().includes(input.toLowerCase())
                        }}
                        options={selectData}
                        onSearch={(value) => {
                            keywordsRef.current = value
                            update(1)
                        }}
                        onPopupScroll={(e) => {
                            const {target} = e
                            const ref: HTMLDivElement = target as unknown as HTMLDivElement
                            if (ref.scrollTop + ref.offsetHeight + 20 >= ref.scrollHeight && !selectLoading) {
                                update(pagination.page + 1)
                            }
                        }}
                        dropdownRender={(originNode: React.ReactNode) => selectDropdown(originNode)}
                        notFoundContent={<YakitEmpty />}
                    />
                </Form.Item>
                <Form.Item
                    name='company_version'
                    label={t("CreateLicense.version")}
                    rules={[{required: true, message: t("YakitForm.requiredField")}]}
                >
                    <YakitSelect placeholder={t("CreateLicense.selectVersion")} allowClear>
                        <YakitSelect.Option value='EnpriTrace'>
                            {t("CreateLicense.enterpriseEdition")}
                        </YakitSelect.Option>
                        <YakitSelect.Option value='EnpriTraceAgent'>
                            {t("CreateLicense.portableEdition")}
                        </YakitSelect.Option>
                    </YakitSelect>
                </Form.Item>
                <Form.Item
                    name='license'
                    label={t("CreateLicense.applicationCode")}
                    rules={[{required: true, message: t("YakitForm.requiredField")}]}
                >
                    <YakitInput.TextArea placeholder={t("CreateLicense.inputApplicationCode")} allowClear rows={13} />
                </Form.Item>
                <div style={{textAlign: "center"}}>
                    <YakitButton style={{width: 200}} type='primary' htmlType='submit' loading={loading}>
                        {t("YakitButton.confirm")}
                    </YakitButton>
                </div>
            </Form>
        </div>
    )
}
