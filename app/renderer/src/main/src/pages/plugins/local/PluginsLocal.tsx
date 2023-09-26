import React, {useState, useRef, useMemo, useEffect} from "react"
import {LocalExtraOperateProps, PluginsLocalProps} from "./PluginsLocalType"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn} from "ahooks"
import {cloneDeep} from "bizcharts/lib/utils"
import {defaultFilter, defaultSearch, PluginsLayout, PluginsContainer, pluginTypeList} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {
    TypeSelect,
    FuncSearch,
    FuncBtn,
    PluginsList,
    FuncFilterPopover,
    ListShowContainer,
    GridLayoutOpt,
    ListLayoutOpt
} from "../funcTemplate"
import {apiFetchLocalList, ssfilters} from "../test"
import {SolidChevronDownIcon} from "@/assets/newIcon"
import {QueryYakScriptsResponse, YakScript} from "@/pages/invoker/schema"
import {OutlineClouduploadIcon, OutlineExportIcon, OutlineTrashIcon} from "@/assets/icon/outline"
import {OutlinePencilaltIcon} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {useStore} from "@/store"
import {PluginsLocalDetail} from "./PluginsLocalDetail"

import "../plugins.scss"
import styles from "./PluginsLocal.module.scss"

export const PluginsLocal: React.FC<PluginsLocalProps> = React.memo((props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<YakScript>()
    const [filters, setFilters] = useState<PluginFilterParams>(
        cloneDeep({...defaultFilter, tags: ["Weblogic", "威胁情报"]})
    )
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, setResponse] = useState<QueryYakScriptsResponse>({
        Data: [],
        Pagination: {
            Limit: 10,
            Page: 1,
            OrderBy: "",
            Order: ""
        },
        Total: 0
    })
    const [hasMore, setHasMore] = useState<boolean>(true)

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList] = useState<string[]>([])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.Total
        else return selectList.length
    }, [allCheck, selectList])

    const userInfo = useStore((s) => s.userInfo)
    // 页面初始化的首次列表请求
    useEffect(() => {
        fetchList(true)
    }, [])

    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (loading) return

        setLoading(true)

        const params: PluginListPageMeta = !!reset
            ? {page: 1, limit: 20}
            : {
                  page: response.Pagination.Page + 1,
                  limit: response.Pagination.Limit || 20
              }

        apiFetchLocalList(params)
            .then((res: QueryYakScriptsResponse) => {
                if (!res.Data) res.Data = []

                const data = false && res.Pagination.Page === 1 ? res.Data : response.Data.concat(res.Data)
                // const isMore = res.data.length < res.pagemeta.limit || data.length === response.pagemeta.total
                // setHasMore(!isMore)

                setResponse({
                    ...res,
                    Data: [...data]
                })
                isLoadingRef.current = false
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    // 滚动更多加载
    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        fetchList()
    })
    const onSetActive = useMemoizedFn((type: string[]) => {
        setFilters({...filters, type: type})
    })
    /**下载 */
    const onDownload = useMemoizedFn((value?: YakScript) => {})
    /**全选 */
    const onCheck = useMemoizedFn((value: boolean) => {
        if (value) setSelectList([])
        setAllCheck(value)
    })
    const onDelTag = useMemoizedFn((value?: string) => {
        if (!value) setFilters({...filters, tags: []})
        else setFilters({...filters, tags: (filters.tags || []).filter((item) => item !== value)})
    })
    /** 单项勾选|取消勾选 */
    const optCheck = useMemoizedFn((data: YakScript, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.Data.map((item) => item.UUID).filter((item) => item !== data.UUID))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...selectList, data.UUID])
        else setSelectList(selectList.filter((item) => item !== data.UUID))
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: YakScript) => {
        return (
            <LocalExtraOperate
                isOwn={userInfo.user_id === data.UserId}
                onRemovePlugin={() => {}}
                onExportPlugin={() => {}}
                onEditPlugin={() => {}}
                onUploadPlugin={() => {}}
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: YakScript) => {
        setPlugin({...data})
    })
    // 关键词/作者搜索
    const onKeywordAndUser = useMemoizedFn((type: string | null, value: string) => {
        if (!type) setSearch(cloneDeep(defaultSearch))
        else {
            if (type === "keyword") setSearch({...search, keyword: value})
            if (type === "user") setSearch({...search, userName: value})
        }
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    const onBack = useMemoizedFn(() => {
        setPlugin(undefined)
    })
    return (
        <>
            {!!plugin && (
                <PluginsLocalDetail
                    info={plugin}
                    allCheck={allCheck}
                    loading={loading}
                    onCheck={onCheck}
                    selectList={selectList}
                    optCheck={optCheck}
                    data={response}
                    onBack={onBack}
                    loadMoreData={onUpdateList}
                />
            )}
            <PluginsLayout
                title='本地插件'
                hidden={!!plugin}
                subTitle={<TypeSelect active={filters.type || []} list={pluginTypeList} setActive={onSetActive} />}
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch onSearch={onKeywordAndUser} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncFilterPopover
                                maxWidth={1200}
                                icon={<SolidChevronDownIcon />}
                                name='批量操作'
                                disabled={selectList.length === 0}
                                button={{
                                    type: "outline2"
                                }}
                                menu={{
                                    type: "primary",
                                    data: [
                                        {key: "export", label: "导出"},
                                        {key: "upload", label: "上传"},
                                        {key: "remove", label: "删除"},
                                        {key: "addToGroup", label: "添加至分组"}
                                    ],
                                    onClick: ({key}) => {
                                        switch (key) {
                                            case "export":
                                                break
                                            case "upload":
                                                break
                                            case "remove":
                                                break
                                            case "addToGroup":
                                                break
                                            default:
                                                return
                                        }
                                    }
                                }}
                                placement='bottomRight'
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<SolidPluscircleIcon />}
                                size='large'
                                name='新建插件'
                                onClick={onNewAddPlugin}
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
                        total={response.Total}
                        selected={selectNum}
                        tag={filters.tags || []}
                        onDelTag={onDelTag}
                        visible={showFilter}
                        setVisible={setShowFilter}
                    >
                        <ListShowContainer<YakScript>
                            id='local'
                            isList={isList}
                            data={response.Data || []}
                            gridNode={(info: {index: number; data: YakScript}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.UUID)
                                return (
                                    <GridLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        title={data.ScriptName}
                                        type={data.Type}
                                        tags={data.Tags}
                                        help={data.Help || ""}
                                        img={data.HeadImg || ""}
                                        user={data.Author || ""}
                                        // prImgs={data.prs}
                                        time={data.CreatedAt}
                                        extraFooter={optExtraNode}
                                        onClick={optClick}
                                    />
                                )
                            }}
                            gridHeight={210}
                            listNode={(info: {index: number; data: YakScript}) => {
                                const {data} = info
                                const check = allCheck || selectList.includes(data.UUID)
                                return (
                                    <ListLayoutOpt
                                        data={data}
                                        checked={check}
                                        onCheck={optCheck}
                                        img={data.HeadImg || ""}
                                        title={data.ScriptName}
                                        help={data.Help || ""}
                                        time={data.CreatedAt}
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
            </PluginsLayout>
        </>
    )
})

export const LocalExtraOperate: React.FC<LocalExtraOperateProps> = React.memo((props) => {
    const {isOwn, onRemovePlugin, onExportPlugin, onEditPlugin, onUploadPlugin} = props
    const onRemove = useMemoizedFn((e) => {
        e.stopPropagation()
        onRemovePlugin()
    })
    const onExport = useMemoizedFn((e) => {
        e.stopPropagation()
        onExportPlugin()
    })
    const onEdit = useMemoizedFn((e) => {
        e.stopPropagation()
        onEditPlugin()
    })
    const onUpload = useMemoizedFn((e) => {
        e.stopPropagation()
        onUploadPlugin()
    })
    return (
        <div className={styles["local-extra-operate-wrapper"]}>
            <YakitButton type='text2' icon={<OutlineTrashIcon onClick={onRemove} />} />
            <div className='divider-style' />
            <YakitButton type='text2' icon={<OutlineExportIcon onClick={onExport} />} />
            <div className='divider-style' />
            <YakitButton type='text2' icon={<OutlinePencilaltIcon onClick={onEdit} />} />
            {isOwn && (
                <>
                    <div className='divider-style' />
                    <YakitButton
                        icon={<OutlineClouduploadIcon />}
                        onClick={onUpload}
                        className={styles["cloud-upload-icon"]}
                    >
                        上传
                    </YakitButton>
                </>
            )}
        </div>
    )
})
