import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {
    ApplicantIcon,
    AuthorImg,
    PluginDetailHeader,
    PluginDetails,
    PluginEditorDiff,
    PluginModifyInfo,
    PluginModifySetting,
    PluginsContainer,
    PluginsLayout,
    statusTag
} from "../baseTemplate"
import {
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
import {SolidBadgecheckIcon, SolidBanIcon, SolidChevrondownIcon, SolidFlagIcon} from "@/assets/icon/solid"
import {
    OutlineClouddownloadIcon,
    OutlineDotshorizontalIcon,
    OutlineLightbulbIcon,
    OutlinePencilaltIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {SolidOfficialpluginIcon} from "@/assets/icon/colors"
import {PluginFilterParams, PluginListPageMeta, PluginSearchParams} from "../pluginsType"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {API} from "@/services/swagger/resposeType"
import cloneDeep from "lodash/cloneDeep"
import {apiFetchList, ssfilters} from "../test"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {Form, Tabs, Tooltip} from "antd"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {YakEditor} from "@/utils/editors"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

import "../plugins.scss"
import styles from "./pluginManage.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

const {TabPane} = Tabs

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
    const [loading, setLoading] = useState<boolean>(false)
    const [showFilter, setShowFilter] = useState<boolean>(true)
    const [filters, setFilters, getFilters] = useGetState<PluginFilterParams>(cloneDeep(defaultFilter))
    const [searchs, setSearchs, getSearchs] = useGetState<PluginSearchParams>(cloneDeep(defaultSearch))
    const [pageMeta, setPageMeta, getPageMeta] = useGetState<PluginListPageMeta>(cloneDeep(defaultPagemeta))
    const [response, setResponse, getResponse] = useGetState<API.YakitPluginListResponse>(cloneDeep(defaultResponse))

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

    const modifyForm = useRef<any>(null)

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

    const fetchList = useMemoizedFn(() => {
        setLoading(true)
        apiFetchList({...getPageMeta()})
            .then((res: API.YakitPluginListResponse) => {
                if (!res.data) res.data = []
                const data = res.pagemeta.page === 1 ? res.data : getResponse().data.concat(res.data)
                setResponse({
                    ...res,
                    data: [...data]
                })
            })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 300)
            })
    })

    useEffect(() => {
        fetchList()
    }, [])

    const onUpdateList = useMemoizedFn((reset?: boolean) => {
        if (reset) setPageMeta(cloneDeep(defaultPagemeta))
        else setPageMeta({...getPageMeta(), page: getPageMeta().page + 1})
        setTimeout(() => {
            fetchList()
        }, 50)
    })

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
    // 查看单项插件详情
    const onCurrentPlugin = useMemoizedFn((data: API.YakitPluginDetail) => {
        setPlugin({...data})
    })

    // 单项勾选回调事件
    const onItemCheck = useMemoizedFn((data: API.YakitPluginDetail, check: boolean) => {
        // 全选情况时的取消勾选
        if (allCheck) {
            setSelectList(response.data.map((item) => item.uuid).filter((item) => item !== data.uuid))
            setAllcheck(false)
            return
        }
        // 单项勾选回调
        if (check) setSelectList([...getSelectList(), data.uuid])
        else setSelectList(getSelectList().filter((item) => item !== data.uuid))
    })
    /** 网格布局-item组件 */
    const gridItemRender = (info: {index: number; data: API.YakitPluginDetail}) => {
        const {index, data} = info
        const check = allCheck || selectList.includes(data.uuid)
        return (
            <GridLayoutOpt
                key={`${data.script_name}|${+data.id || 0}|${data.uuid || "0"}`}
                onlyId={`${data.script_name}|${+data.id || 0}|${data.uuid || "0"}`}
                checked={check}
                onCheck={(value) => onItemCheck(data, value)}
                title={data.script_name}
                type={data.type}
                tags={data.tags}
                help={data.help || ""}
                img={data.head_img || ""}
                user={data.authors || ""}
                prImgs={[
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img,
                    data.head_img
                ]}
                time={data.updated_at}
                subTitle={
                    <>
                        {data.official && (
                            <div className='official-plugin-icon'>
                                <SolidOfficialpluginIcon />
                            </div>
                        )}
                        {statusTag[`${index % 3}`]}
                    </>
                }
                extraFooter={
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
                    />
                }
                onClick={() => onCurrentPlugin(data)}
            />
        )
    }
    /** 列表布局-item组件 */
    const listItemRender = (info: {index: number; data: API.YakitPluginDetail}) => {
        const {index, data} = info
        const check = allCheck || selectList.includes(data.uuid)
        return (
            <ListLayoutOpt
                key={`${data.script_name}|${+data.id || 0}|${data.uuid || "0"}`}
                onlyId={`${data.script_name}|${+data.id || 0}|${data.uuid || "0"}`}
                checked={check}
                onCheck={(value) => onItemCheck(data, value)}
                img={data.head_img}
                title={data.script_name}
                help={data.help || ""}
                time={data.updated_at}
                subTitle={
                    <>
                        {data.official && (
                            <div className='official-plugin-icon'>
                                <SolidOfficialpluginIcon />
                            </div>
                        )}
                        {statusTag[`${index % 3}`]}
                    </>
                }
                extraNode={
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
                }
                onClick={() => onCurrentPlugin(data)}
            />
        )
    }
    /** 生成唯一key值 */
    const onKey = useMemoizedFn((info: {index: number; data: API.YakitPluginDetail}) => {
        const {data} = info
        return `${data.script_name}|${+data.id || 0}|${data.uuid || "0"}`
    })

    return (
        <>
            {!!plugin && (
                <PluginDetails<API.YakitPluginDetail>
                    title='插件管理'
                    checked={allCheck}
                    onCheck={onCheck}
                    total={response.pagemeta.total}
                    selected={selectNum}
                    listProps={{
                        rowKey: "uuid",
                        data: response.data,
                        loadMoreData: () => {},
                        classNameRow: styles["details-opt-wrapper"],
                        renderRow: (info, i) => {
                            return (
                                <div
                                    className={classNames(styles["details-wrapper-item-opt"], {
                                        [styles["details-wrapper-item-opt-active"]]: plugin.uuid === info.uuid
                                    })}
                                >
                                    <div className={styles["opt-wrapper"]}>
                                        <div className={styles["opt-info"]}>
                                            <YakitCheckbox />
                                            <AuthorImg src={info.head_img || ""} />
                                            <div
                                                className={classNames(
                                                    styles["text-style"],
                                                    "yakit-content-single-ellipsis"
                                                )}
                                                title={info.script_name}
                                            >
                                                {info.script_name}
                                            </div>
                                        </div>
                                        <div className={styles["opt-show"]}>
                                            {statusTag[`${i % 3}`]}
                                            {info.official && (
                                                <div className='official-plugin-icon'>
                                                    <SolidOfficialpluginIcon />
                                                </div>
                                            )}
                                            <Tooltip
                                                title={info.help || "No Description about it."}
                                                placement='topRight'
                                                overlayClassName='plugins-tooltip'
                                            >
                                                <OutlineQuestionmarkcircleIcon className={styles["icon-style"]} />
                                            </Tooltip>
                                            <YakitPopover
                                                placement='topRight'
                                                overlayClassName={styles["terminal-popover"]}
                                                content={
                                                    <YakEditor type={"yak"} value={info.content} readOnly={true} />
                                                }
                                            >
                                                <OutlineTerminalIcon className={styles["icon-style"]} />
                                            </YakitPopover>
                                        </div>
                                    </div>
                                </div>
                            )
                        },
                        page: pageMeta.page,
                        hasMore: response.pagemeta.total !== response.data.length,
                        loading: loading,
                        defItemHeight: 46
                    }}
                    onBack={() => {
                        setPlugin(undefined)
                    }}
                >
                    <div className={styles["details-content-wrapper"]}>
                        <Tabs tabPosition='right' className='plugins-tabs'>
                            <TabPane tab='源 码' key='code'>
                                <div className={styles["plugin-info-wrapper"]}>
                                    <PluginDetailHeader
                                        pluginName={plugin.script_name}
                                        help={plugin.help}
                                        titleNode={statusTag["1"]}
                                        tags={plugin.tags}
                                        extraNode={
                                            <>
                                                <YakitButton
                                                    onClick={() => {
                                                        modifyForm.current?.onSubmit()
                                                    }}
                                                >
                                                    submit
                                                </YakitButton>
                                            </>
                                        }
                                        img={plugin.head_img}
                                        user={plugin.authors}
                                        pluginId={plugin.uuid}
                                        updated_at={plugin.updated_at}
                                    />

                                    <div className={styles["plugin-info-body"]}>
                                        <div className={styles["plugin-modify-info"]}>
                                            <div className={styles["modify-advice"]}>
                                                <div className={styles["advice-icon"]}>
                                                    <OutlineLightbulbIcon />
                                                </div>
                                                <div className={styles["advice-body"]}>
                                                    <div className={styles["advice-content"]}>
                                                        <div className={styles["content-title"]}>修改内容描述</div>
                                                        <div className={styles["content-style"]}>
                                                            这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，这里是申请人提交的对修改内容的描述，
                                                        </div>
                                                    </div>
                                                    <div className={styles["advice-user"]}>
                                                        <AuthorImg src={plugin.head_img} />
                                                        {plugin.authors}
                                                        <ApplicantIcon />
                                                    </div>
                                                </div>
                                            </div>
                                            <PluginModifyInfo
                                                ref={modifyForm}
                                                kind='bug'
                                            />
                                        </div>

                                        <div className={styles["plugin-setting-info"]}>
                                            <div className={styles["setting-header"]}>插件配置</div>
                                            <div className={styles["setting-body"]}>
                                                {/* <PluginModifySetting /> */}
                                                <PluginEditorDiff />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabPane>
                            <TabPane tab='日 志' key='log'>
                                <div></div>
                            </TabPane>
                        </Tabs>
                    </div>
                </PluginDetails>
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
                    loading={loading}
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
                    >
                        <ListShowContainer<API.YakitPluginDetail>
                            isList={isList}
                            total={response.pagemeta.total}
                            data={response.data}
                            gridNode={gridItemRender}
                            gridHeight={210}
                            listNode={listItemRender}
                            listHeight={73}
                            loading={loading}
                            updateList={onUpdateList}
                            onKey={onKey}
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
const ReasonModal: React.FC<ReasonModalProps> = memo((props) => {
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
