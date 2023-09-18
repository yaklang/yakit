import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {PluginsContainer, PluginsLayout, statusTag} from "../baseTemplate"
import {
    AuthorImg,
    FuncBtn,
    FuncFilterPopver,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    PluginsList,
    TypeSelect
} from "../funcTemplate"
import {TypeSelectOpt} from "../funcTemplateType"
import {SolidBadgecheckIcon, SolidBanIcon, SolidFlagIcon} from "@/assets/icon/solid"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlinePencilaltIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {SolidOfficialpluginIcon} from "@/assets/icon/colors"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "../pluginsType"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {apiFetchList, ssfilters} from "../test"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PluginManageDetail} from "./PluginManageDetail"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const defaultFilter: PluginFilterParams = {
    type: ["yak", "mitm", "codec", "packet-hack", "port-scan"],
    status: ["0"]
}
const defaultSearch: PluginSearchParams = {
    keyword: "",
    userName: ""
}
const defaultPagemeta: PluginListPageMeta = {page: 1, limit: 20}
const defaultResponse: API.YakitPluginListResponse = {
    data: [],
    pagemeta: {
        limit: 20,
        page: 1,
        total: 0,
        total_page: 1
    }
}

const StatusType: TypeSelectOpt[] = [
    {key: "0", name: "待审核", icon: <SolidFlagIcon className='flag-icon-color' />},
    {key: "1", name: "已通过", icon: <SolidBadgecheckIcon className='badge-check-icon-color' />},
    {key: "2", name: "未通过", icon: <SolidBanIcon className='ban-icon-color' />}
]

interface PluginManageProps {}

export const PluginManage: React.FC<PluginManageProps> = (props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [filters, setFilters, getFilters] = useGetState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [searchs, setSearchs, getSearchs] = useGetState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, setResponse, getResponse] = useGetState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [hasMore, setHasMore] = useState<boolean>(true)

    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (loading) return

        setLoading(true)

        const params: PluginListPageMeta = !!reset
            ? {...defaultPagemeta}
            : {
                  page: response.pagemeta.page + 1,
                  limit: response.pagemeta.limit || 20
              }

        apiFetchList(params)
            .then((res: API.YakitPluginListResponse) => {
                if (!res.data) res.data = []

                const data = false && res.pagemeta.page === 1 ? res.data : getResponse().data.concat(res.data)
                // const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                // setHasMore(!isMore)
                // console.log(data)

                setResponse({
                    ...res,
                    data: [...data]
                })
                isLoadingRef.current = false
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])
    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })

    const [allCheck, setAllcheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<string[]>([])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)
    /** 批量修改插件作者 */
    const [showModifyAuthor, setShowModifyAuthor] = useState<boolean>(false)
    // 原因窗口
    const [showReason, setShowReason] = useState<{visible: boolean; type: string}>({visible: false, type: "nopass"})
    // 单项插件删除
    const [activeDelPlugin, setActiveDelPlugin] = useState<API.YakitPluginDetail | undefined>()

    // 全选
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllcheck(value)
    })
    // 修改作者
    const onModifyAuthor = useMemoizedFn(() => {})
    // 下载
    const onDownload = useMemoizedFn((value?: API.YakitPluginDetail) => {})
    // 删除
    const onDelPlugin = useMemoizedFn(() => {})

    const onDelTag = useMemoizedFn((value?: string) => {
        if (!value) setFilters({...getFilters(), tags: []})
        else setFilters({...getFilters(), tags: (getFilters().tags || []).filter((item) => item !== value)})
    })
    // 关键词/作者搜索
    const onKeywordAndUser = useMemoizedFn((type: string | null, value: string) => {
        if (!type) setSearchs(cloneDeep(defaultSearch))
        else {
            if (type === "keyword") setSearchs({...getSearchs(), keyword: value})
            if (type === "user") setSearchs({...getSearchs(), userName: value})
        }
    })

    const [plugin, setPlugin] = useState<API.YakitPluginDetail | undefined>()
    const pluginInfoTags = useMemo(() => {
        let arr: string[] = []
        try {
            arr = JSON.parse(plugin?.tags || "") || []
        } catch (error) {}
        return arr
    }, [plugin])

    // 单项组件-相关操作和展示组件逻辑
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: API.YakitPluginDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data.uuid])
        else setSelectList(getSelectList().filter((item) => item !== data.uuid))
    })
    /** 单项副标题组件 */
    const optSubTitle = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <>
                {/* {data.official && (
                    <div className='official-plugin-icon'>
                        <SolidOfficialpluginIcon />
                    </div>
                )} */}
                {statusTag[`${1 % 3}`]}
            </>
        )
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <FuncFilterPopver
                icon={<OutlineDotshorizontalIcon />}
                name={""}
                menu={{
                    data: [
                        {key: "del", label: "删除"},
                        {key: "download", label: "下载"}
                    ],
                    className: styles["func-filter-dropdown-menu"],
                    onClick: ({key}) => {
                        switch (key) {
                            case "del":
                                setActiveDelPlugin(data)
                                setShowReason({visible: true, type: "del"})
                                break
                            case "download":
                                onDownload(data)
                                break
                            default:
                                break
                        }
                    }
                }}
                placement='bottomRight'
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin({...data})
    })

    return (
        <>
            {!!plugin && (
                <PluginManageDetail
                    info={plugin}
                    allCheck={allCheck}
                    onCheck={onCheck}
                    data={response}
                    selected={selectNum}
                    onBack={() => {}}
                />
            )}

            <PluginsLayout
                title='插件管理'
                hidden={!!plugin}
                subTitle={
                    <TypeSelect
                        active={filters.status || []}
                        list={StatusType}
                        setActive={(status: string[]) => setFilters({...getFilters(), status: status})}
                    />
                }
                extraHeader={
                    <div className={styles["extra-header-wrapper"]}>
                        <FuncSearch onSearch={onKeywordAndUser} />
                        <div className={styles["divider-style"]}></div>
                        <div className={styles["btn-group-wrapper"]}>
                            <FuncBtn
                                icon={<OutlinePencilaltIcon className='btn-icon-color' />}
                                disabled={selectNum === 0}
                                name={"修改作者"}
                                onClick={() => setShowModifyAuthor(true)}
                            />
                            <FuncBtn
                                icon={<OutlineClouddownloadIcon className='btn-icon-color' />}
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => onDownload()}
                            />
                            <FuncBtn
                                icon={<OutlineTrashIcon className='btn-icon-color' />}
                                name={selectNum > 0 ? "删除" : "清空"}
                                onClick={() => setShowReason({visible: true, type: "del"})}
                            />
                        </div>
                    </div>
                }
            >
                <PluginsContainer
                    loading={loading && isLoadingRef.current}
                    visible={showFilter}
                    setVisible={setShowFilter}
                    selecteds={filters as Record<string, string[]>}
                    onSelect={setFilters}
                    groupList={ssfilters}
                >
                    <PluginsList
                        checked={allCheck}
                        onCheck={onCheck}
                        isList={isList}
                        setIsList={setIsList}
                        total={response.pagemeta.total}
                        selected={selectNum}
                        tag={filters.tags || []}
                        onDelTag={onDelTag}
                        visible={showFilter}
                        setVisible={setShowFilter}
                    >
                        <ListShowContainer<API.YakitPluginDetail>
                            isList={isList}
                            data={response.data}
                            gridNode={(info: {index: number; data: API.YakitPluginDetail}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <GridLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        title={data.script_name}
                                        type={data.type}
                                        tags={data.tags}
                                        help={data.help || ""}
                                        img={data.head_img || ""}
                                        user={data.authors || ""}
                                        // prImgs={data.prs}
                                        time={data.updated_at}
                                        subTitle={optSubTitle}
                                        extraFooter={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            gridHeight={210}
                            listNode={(info: {index: number; data: API.YakitPluginDetail}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.uuid)
                                return (
                                    <ListLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        img={data.head_img}
                                        title={data.script_name}
                                        help={data.help || ""}
                                        time={data.updated_at}
                                        subTitle={optSubTitle}
                                        extraNode={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            listHeight={73}
                            loading={loading}
                            hasMore={hasMore}
                            updateList={onUpdateList}
                        />
                    </PluginsList>
                </PluginsContainer>
                <ModifyAuthorModal
                    visible={showModifyAuthor}
                    setVisible={setShowModifyAuthor}
                    pluginNum={selectNum}
                    onOK={onModifyAuthor}
                />
                <ReasonModal
                    visible={showReason.visible}
                    setVisible={() => setShowReason({visible: false, type: ""})}
                    type={showReason.type}
                    onOK={() => {
                        if (showReason.type === "del") onDelPlugin()
                    }}
                />
            </PluginsLayout>
        </>
    )
}

interface ModifyAuthorModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    pluginNum: number
    onOK: () => any
}
/** @name 批量修改插件作者 */
const ModifyAuthorModal: React.FC<ModifyAuthorModalProps> = memo((props) => {
    const {visible, setVisible, pluginNum, onOK} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [list, setList] = useState<{img: string; name: string; id: string}[]>([
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子1号",
            id: "1"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子2号",
            id: "2"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子3号",
            id: "3"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子4号",
            id: "4"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子5号",
            id: "5"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子6号",
            id: "6"
        },
        {
            img: "https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTJicUwxTHkcj4qQAacH5rCOpWjQDrAnJn1bbeErrPtJS8eYbM5X7CtccCtiaKvdhicnkFhazBwVVuxFQ/132",
            name: "桔子7号",
            id: "7"
        }
    ])
    const [value, setValue] = useState<string>("")

    const {run} = useDebounceFn(
        (value?: string) => {
            setLoading(true)
            setList([])
            console.log("search", value)
            setTimeout(() => {
                setLoading(false)
            }, 1000)
        },
        {
            wait: 500
        }
    )

    return (
        <YakitModal
            title='批量修改插件作者'
            width={448}
            type='white'
            centered={true}
            closable={true}
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={onOK}
        >
            <div className={styles["modify-author-modal-body"]}>
                <Form.Item
                    labelCol={{span: 24}}
                    label={<>作者：</>}
                    help={
                        <>
                            共选择了 <span className={styles["modify-author-hint-span"]}>{pluginNum}</span> 个插件
                        </>
                    }
                >
                    <YakitSelect
                        placeholder='请选择...'
                        showSearch={true}
                        filterOption={false}
                        notFoundContent={loading ? <YakitSpin spinning={true} size='small' /> : "暂无数据"}
                        allowClear={true}
                        value={value}
                        onSearch={run}
                        onChange={(value, option: any) => setValue(value)}
                    >
                        {list.map((item) => (
                            <YakitSelect.Option key={item.name} value={item.id} record={item}>
                                <div className={styles["modify-author-item-wrapper"]}>
                                    <AuthorImg size='small' src={item.img || ""} />
                                    {item.name}
                                </div>
                            </YakitSelect.Option>
                        ))}
                    </YakitSelect>
                </Form.Item>
            </div>
        </YakitModal>
    )
})

interface ReasonModalProps {
    visible: boolean
    setVisible: (show: boolean) => any
    type?: string
    onOK: (reason: string) => any
}
/** @name 原因说明 */
export const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
    const {visible, setVisible, type = "nopass", onOK} = props

    const title = useMemo(() => {
        if (type === "nopass") return "不通过原因"
        if (type === "del") return "删除原因"
        return "未知错误窗口,请关闭重试!"
    }, [type])

    useEffect(() => {
        if (!visible) setValue("")
    }, [visible])

    const [value, setValue] = useState<string>("")
    const onSubmit = useMemoizedFn(() => {
        if (!value) return
        onOK(value)
    })

    return (
        <YakitModal
            title={title}
            width={448}
            type='white'
            centered={true}
            closable={true}
            maskClosable={false}
            visible={visible}
            onCancel={() => setVisible(false)}
            onOk={onSubmit}
        >
            <div className={styles["reason-modal-body"]}>
                <YakitInput.TextArea
                    autoSize={{minRows: 3, maxRows: 3}}
                    showCount
                    value={value}
                    maxLength={150}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>
        </YakitModal>
    )
})
