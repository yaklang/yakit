import React, {useState, useRef, useMemo, useEffect} from "react"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {
    FuncBtn,
    FuncFilterPopover,
    FuncSearch,
    GridLayoutOpt,
    ListLayoutOpt,
    ListShowContainer,
    OnlineExtraOperate,
    PluginsList,
    TypeSelect,
    funcSearchType
} from "../funcTemplate"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    OutlineCalendarIcon,
    OutlineClouddownloadIcon,
    OutlineSearchIcon,
    OutlineSwitchverticalIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import {useMemoizedFn, useDebounceFn, useGetState} from "ahooks"
import {openExternalWebsite} from "@/utils/openWebsite"
import card1 from "./card1.png"
import card2 from "./card2.png"
import card3 from "./card3.png"
import qrCode from "./qrCode.png"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {SolidCloudpluginIcon, SolidPrivatepluginIcon, SolidYakCattleNoBackColorIcon} from "@/assets/icon/colors"
import {OnlineJudgment} from "../onlineJudgment/OnlineJudgment"
import {PluginUserProps} from "./PluginUserType"
import cloneDeep from "lodash/cloneDeep"
import {API} from "@/services/swagger/resposeType"
import {apiFetchList, ssfilters} from "../test"
import {
    PluginsContainer,
    PluginsLayout,
    defaultFilter,
    defaultResponse,
    defaultSearch,
    pluginTypeList
} from "../baseTemplate"
import {PluginFilterParams, PluginSearchParams, PluginListPageMeta} from "../baseTemplateType"
import {PluginManageDetail} from "../manage/PluginManageDetail"
import {SolidPluscircleIcon} from "@/assets/icon/solid"
import {yakitNotify} from "@/utils/notification"

import classNames from "classnames"
import "../plugins.scss"
import styles from "./PluginUser.module.scss"

export const PluginUser: React.FC<PluginUserProps> = React.memo((props) => {
    // 获取插件列表数据-相关逻辑
    /** 是否为加载更多 */
    const [loading, setLoading] = useState<boolean>(false)
    /** 是否为首页加载 */
    const isLoadingRef = useRef<boolean>(true)
    /** 插件展示(列表|网格) */
    const [isList, setIsList] = useState<boolean>(true)

    const [plugin, setPlugin] = useState<API.YakitPluginDetail>()
    const [filters, setFilters] = useState<PluginFilterParams>(
        cloneDeep({...defaultFilter, tags: ["Weblogic", "威胁情报"]})
    )
    const [search, setSearch] = useState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [response, setResponse] = useState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))
    const [hasMore, setHasMore] = useState<boolean>(true)

    // 单项插件删除
    const [activeDelPlugin, setActiveDelPlugin] = useState<API.YakitPluginDetail>()

    const [showFilter, setShowFilter] = useState<boolean>(true)

    const [allCheck, setAllCheck] = useState<boolean>(false)
    const [selectList, setSelectList, getSelectList] = useGetState<string[]>([])
    // 选中插件的数量
    const selectNum = useMemo(() => {
        if (allCheck) return response.pagemeta.total
        else return selectList.length
    }, [allCheck, selectList])

    const fetchList = useMemoizedFn((reset?: boolean) => {
        if (loading) return

        setLoading(true)

        const params: PluginListPageMeta = !!reset
            ? {page: 1, limit: 20}
            : {
                  page: response.pagemeta.page + 1,
                  limit: response.pagemeta.limit || 20
              }

        apiFetchList(params)
            .then((res: API.YakitPluginListResponse) => {
                if (!res.data) res.data = []

                const data = false && res.pagemeta.page === 1 ? res.data : response.data.concat(res.data)
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
    const onSetActive = useMemoizedFn((type: string[]) => {
        setFilters({...filters, type: type})
    })
    /**下载 */
    const onDownload = useMemoizedFn((value?: API.YakitPluginDetail) => {})
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
    const optCheck = useMemoizedFn((data: API.YakitPluginDetail, value: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
            setAllCheck(false)
            return
        }
        // 单项勾选回调
        if (value) setSelectList([...getSelectList(), data.uuid])
        else setSelectList(getSelectList().filter((item) => item !== data.uuid))
    })

    const onLikeClick = useMemoizedFn(() => {
        yakitNotify("success", "点赞~~~")
    })
    const onCommentClick = useMemoizedFn(() => {
        yakitNotify("success", "评论~~~")
    })
    const onDownloadClick = useMemoizedFn(() => {
        yakitNotify("success", "下载~~~")
    })
    /** 单项额外操作组件 */
    const optExtraNode = useMemoizedFn((data: API.YakitPluginDetail) => {
        return (
            <OnlineExtraOperate
                likeProps={{
                    active: data.is_stars,
                    likeNumber: data.stars,
                    onLikeClick: onLikeClick
                }}
                commentProps={{
                    commentNumber: data.comment_num,
                    onCommentClick: onCommentClick
                }}
                downloadProps={{
                    downloadNumber: `${data.downloaded_total}`,
                    onDownloadClick: onDownloadClick
                }}
            />
        )
    })
    /** 单项点击回调 */
    const optClick = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin({...data})
    })
    /**新建插件 */
    const onNewAddPlugin = useMemoizedFn(() => {})
    // 关键词/作者搜索
    const onKeywordAndUser = useMemoizedFn((type: string | null, value: string) => {
        if (!type) setSearch(cloneDeep(defaultSearch))
        else {
            if (type === "keyword") setSearch({...search, keyword: value})
            if (type === "user") setSearch({...search, userName: value})
        }
    })
    const onRemove = useMemoizedFn(() => {})
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
                title='我的插件'
                hidden={!!plugin}
                subTitle={
                    <TypeSelect
                        active={filters.type || []}
                        list={[
                            {
                                key: "open",
                                name: "公开",
                                icon: <SolidCloudpluginIcon />
                            },
                            {
                                key: "privacy",
                                name: "私密",
                                icon: <SolidPrivatepluginIcon />
                            }
                        ]}
                        setActive={onSetActive}
                    />
                }
                extraHeader={
                    <div className='extra-header-wrapper'>
                        <FuncSearch onSearch={onKeywordAndUser} />
                        <div className='divider-style'></div>
                        <div className='btn-group-wrapper'>
                            <FuncBtn
                                maxWidth={1050}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name={selectNum > 0 ? "下载" : "一键下载"}
                                onClick={() => onDownload()}
                            />
                            <FuncBtn
                                maxWidth={1050}
                                icon={<OutlineClouddownloadIcon />}
                                type='outline2'
                                size='large'
                                name='清空'
                                onClick={() => onRemove()}
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
