import React, {ReactNode, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    CollaboratorInfoProps,
    PluginAddParamModalProps,
    PluginContributesListItemProps,
    PluginDetailHeaderProps,
    PluginDetailsListItemProps,
    PluginDetailsProps,
    PluginEditorDiffProps,
    PluginFilterParams,
    PluginListPageMeta,
    PluginModifyInfoProps,
    PluginModifySettingProps,
    PluginParamListProps,
    PluginSearchParams,
    PluginsContainerProps,
    PluginsLayoutProps,
    RiskListOptProps
} from "./baseTemplateType"
import {SolidChevrondownIcon, SolidChevronupIcon, SolidDragsortIcon} from "@/assets/icon/solid"
import {FilterPanel} from "@/components/businessUI/FilterPanel/FilterPanel"
import {AuthorIcon, AuthorImg, FuncSearch, TagsListShow} from "./funcTemplate"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineBugIcon,
    OutlineIdentificationIcon,
    OutlinePencilaltIcon,
    OutlinePlusIcon,
    OutlinePluscircleIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineReplyIcon,
    OutlineSparklesIcon,
    OutlineTagIcon,
    OutlineTerminalIcon,
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Form, Space, Tooltip} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {formatDate} from "@/utils/timeUtil"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {DragDropContext, Droppable, Draggable,DropResult,ResponderProvided} from "@hello-pangea/dnd"
import {useDebounceFn, useGetState, useMemoizedFn,useControllableValue} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    PluginBaseParamProps,
    PluginParamDataProps,
    PluginParamDataSelectProps,
    PluginSettingParamProps,
    QueryYakScriptRiskDetailByCWEResponse
} from "./pluginsType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {API} from "@/services/swagger/resposeType"
import {YakEditor} from "@/utils/editors"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import {yakitNotify} from "@/utils/notification"
import {BuiltInTags} from "./editDetails/builtInData"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {PluginDiffEditorModal, PluginEditorModal} from "./editDetails/PluginEditDetails"
import {PluginGV, aduitStatusToName, pluginTypeToName} from "./builtInData"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import UnLogin from "@/assets/unLogin.png"
import YakitLogo from "@/assets/yakitLogo.png"

import "./plugins.scss"
import styles from "./baseTemplate.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

/** @name 插件列表大框架组件 */
export const PluginsLayout: React.FC<PluginsLayoutProps> = memo((props) => {
    const {pageWrapId, title, subTitle, extraHeader, hidden, children} = props

    const titleNode = useMemo(() => {
        if (!title) return <div className={styles["title-style"]}>插件商店</div>

        if (typeof title === "string") return <div className={styles["title-style"]}>{title}</div>
        else return title
    }, [title])

    return (
        <div id={pageWrapId} className={classNames(styles["plugins-layout"], {[styles["plugins-mask-wrap"]]: !!pageWrapId}, {[styles["plugins-hidden"]]: !!hidden})}> 
            <div className={styles["plugins-layout-header"]}>
                <div className={styles["header-body"]}>
                    {titleNode}
                    {!!subTitle ? <div className={styles["subtitle-wrapper"]}>{subTitle}</div> : null}
                </div>
                {!!extraHeader ? extraHeader : <div></div>}
            </div>
            <div className={styles["plugins-layout-container"]}>{children}</div>
        </div>
    )
})
/** @name 插件列表组件(带侧边搜索栏)  */
export const PluginsContainer: React.FC<PluginsContainerProps> = memo((props) => {
    const {loading, visible, setVisible, selecteds, onSelect, groupList, children, filterClassName} = props
    return (
        <YakitSpin spinning={loading}>
            <div className={styles["plugins-container-wrapper"]}>
                <FilterPanel
                    wrapperClassName={classNames(styles["container-filter-wrapper"], {
                        [styles["container-filter-wrapper-hidden"]]: !visible
                    })}
                    listClassName={filterClassName}
                    visible={visible}
                    setVisible={setVisible}
                    selecteds={selecteds}
                    onSelect={onSelect}
                    groupList={groupList}
                />
                <div className={styles["container-body"]}>{children}</div>
            </div>
        </YakitSpin>
    )
})

/** @name 插件详情大框架组件(带左侧插件列表) */
export const PluginDetails: <T>(props: PluginDetailsProps<T>) => any = memo((props) => {
    const {
        pageWrapId = "",
        title,
        search,
        setSearch,
        onSearch: onsearch,
        filterNode,
        filterExtra,
        checked,
        onCheck,
        total,
        selected,
        listProps,
        onBack,
        children,
        spinLoading,
        rightHeardNode,
        bodyClassName
    } = props

    // 隐藏插件列表
    const [hidden, setHidden] = useControllableValue<boolean>(props,{
        defaultValue:false,
        defaultValuePropName:'hidden',
        valuePropName:'hidden',
        trigger:'setHidden',
    })

    // 关键词|用户搜索
    const onSearch = useDebounceFn(
        (value: PluginSearchParams) => {
            onsearch(value)
        },
        {wait: 300, leading: true}
    )

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    return (
        <div id={pageWrapId} className={classNames(styles["plugin-details-wrapper"], {[styles["plugins-mask-wrap"]]: !!pageWrapId})}>
            <div className={classNames(styles["filter-wrapper"], {[styles["filter-hidden-wrapper"]]: hidden})}>
                <div className={styles["filter-header"]}>
                    <div className={styles["header-search"]}>
                        <div className={styles["title-style"]}>{title}</div>
                        <FuncSearch value={search} onChange={setSearch} onSearch={onSearch.run} />
                    </div>
                    {filterNode || null}
                    <div className={styles["filter-body"]}>
                        <div className={styles["display-show"]}>
                            <div className={styles["all-check"]}>
                                <YakitCheckbox
                                    indeterminate={checkIndeterminate}
                                    checked={checked}
                                    onChange={(e) => onCheck(e.target.checked)}
                                />
                                全选
                            </div>
                            <div className={styles["count-num"]}>
                                Total <span className={styles["num-style"]}>{total}</span>
                            </div>
                            <div className={styles["divider-style"]}></div>
                            <div className={styles["count-num"]}>
                                Selected <span className={styles["num-style"]}>{selected}</span>
                            </div>
                        </div>
                        {filterExtra || null}
                    </div>
                </div>
                <YakitSpin spinning={!!spinLoading} wrapperClassName={styles["filter-list"]}>
                    <RollingLoadList {...listProps} />
                </YakitSpin>
            </div>
            <div className={styles["details-wrapper"]}>
                {rightHeardNode ? (
                    rightHeardNode
                ) : (
                    <div className={styles["details-header"]}>
                        <div className={styles["header-title"]}>
                            插件详情
                            <span className={styles["subtitle-style"]}>线上数据需要下载到本地才可执行</span>
                        </div>
                        <div className={styles["header-btn"]}>
                            <YakitButton type='text2' icon={<OutlineReplyIcon />} onClick={onBack}>
                                返回列表
                            </YakitButton>
                            <div className={styles["divider-style"]}></div>
                            <YakitButton
                                type='text2'
                                icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                                onClick={() => setHidden(!hidden)}
                            />
                        </div>
                    </div>
                )}
                <div className={classNames(styles["details-body"],bodyClassName)}>{children}</div>
            </div>
        </div>
    )
})
/** @name 插件详情-头部信息 */
export const PluginDetailHeader: React.FC<PluginDetailHeaderProps> = memo((props) => {
    const {
        pluginName,
        help,
        titleNode,
        tagMinWidth = 20,
        tags,
        extraNode,
        img,
        user,
        pluginId,
        updated_at,
        prImgs = [],
        type,
        basePluginId
    } = props

    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = tags ? tags.split(",") : []
        } catch (error) {}
        return arr
    }, [tags])

    const [prShow, setPrShow] = useState<boolean>(false)
    /** 贡献者数据 */
    const contributes: {arr: CollaboratorInfoProps[]; length: number} = useMemo(() => {
        // 这是第二版需要的数据
        if (prImgs.length <= 5) return {arr: prImgs, length: prImgs.length}
        else {
            return {arr: prImgs.slice(0, 5), length: prImgs.length - 5}
        }
    }, [prImgs])
    return (
        <div className={styles["plugin-detail-header-wrapper"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["info-title"]}>
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={pluginName}
                        >
                            {pluginName || "-"}
                        </div>
                        <div className={styles["subtitle-wrapper"]}>
                            <Tooltip title={help || "No Description about it."} overlayClassName='plugins-tooltip'>
                                <OutlineQuestionmarkcircleIcon className={styles["help-icon"]} />
                            </Tooltip>
                            {titleNode || null}
                        </div>
                    </div>
                    <div style={{minWidth: tagMinWidth || 20}} className={classNames(styles["info-tags"])}>
                        {pluginTypeToName[type] && pluginTypeToName[type].name && (
                            <YakitTag color={pluginTypeToName[type]?.color as any}>
                                {pluginTypeToName[type]?.name}
                            </YakitTag>
                        )}
                        <TagsListShow tags={tagList || []} />
                    </div>
                </div>
                {extraNode || null}
            </div>

            <div className={styles["author-wrapper"]}>
                <div className={styles["left-wrapper"]}>
                    <div className={styles["left-wrapper"]}>
                        <div className={styles["author-wrapper"]}>
                            <AuthorImg src={img || UnLogin} />
                            <div
                                className={classNames(
                                    styles["name-wrapper"],
                                    styles["text-style"],
                                    "yakit-content-single-ellipsis"
                                )}
                                title={user || "anonymous"}
                            >
                                {user || "anonymous"}
                            </div>
                            <AuthorIcon />
                        </div>

                        {contributes.length > 0 && (
                            <>
                                <div style={{marginRight: 8}} className={styles["divider-style"]}></div>
                                <YakitPopover
                                    overlayClassName={styles["contributes-popover"]}
                                    placement='bottom'
                                    content={
                                        <div className={styles["contributes-list"]}>
                                            {contributes.arr.map((item) => (
                                                <React.Fragment key={item.headImg + item.userName}>
                                                    <PluginContributesListItem
                                                        contributesHeadImg={item.headImg}
                                                        contributesName={item.userName}
                                                    />
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    }
                                    onVisibleChange={setPrShow}
                                >
                                    <YakitButton type='text2' isActive={prShow}>
                                        {`${contributes.length}位协作者`}
                                        {prShow ? <SolidChevronupIcon /> : <SolidChevrondownIcon />}
                                    </YakitButton>
                                </YakitPopover>
                            </>
                        )}
                    </div>
                    {pluginId && (
                        <>
                            <div
                                style={{marginLeft: contributes.length > 0 ? 8 : 16}}
                                className={styles["divider-style"]}
                            />
                            <div className={styles["id-wrapper"]}>
                                <div
                                    className={classNames(
                                        styles["text-wrapper"],
                                        styles["text-style"],
                                        "yakit-content-single-ellipsis"
                                    )}
                                    title={`插件ID : ${pluginId}`}
                                >
                                    {`插件ID : ${pluginId}`}
                                </div>
                                <CopyComponents className={classNames(styles["copy-icon-style"])} copyText={pluginId} />
                            </div>
                        </>
                    )}
                    {basePluginId && (
                        <>
                            <div className={styles["divider-style"]} />
                            <div className={styles["copy-wrapper"]}>
                                <span>来源:</span>
                                <YakitTag style={{marginRight: 0}}>复制</YakitTag>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles["divider-style"]}></div>
                <div className={classNames(styles["constant-wrapper"], styles["text-style"])}>{`更新时间 : ${formatDate(
                    updated_at
                )}`}</div>
            </div>
        </div>
    )
})

/** @name 插件基本信息 */
export const PluginModifyInfo: React.FC<PluginModifyInfoProps> = memo(
    React.forwardRef((props, ref) => {
        const {isEdit = false, kind, data, tagsCallback} = props

        const [bugInfo, setBugInfo, getBugInfo] = useGetState<QueryYakScriptRiskDetailByCWEResponse>()
        const isHasBugInfo = useMemo(() => {
            return !bugInfo?.Description && !bugInfo?.CWESolution
        }, [bugInfo])

        const [form] = Form.useForm()
        const userRisk = Form.useWatch("RiskType", form)

        useEffect(() => {
            if (data) {
                form.resetFields()
                form.setFieldsValue({...data})
                setBugInfo(data.RiskDetail ? {...data.RiskDetail} : undefined)
                if (data?.RiskDetail && data.RiskDetail.RiskType) {
                    // 判断是否为自定义漏洞类型
                    const bugFilter =
                        initBugList.current.findIndex((item) => item.RiskType === (data.RiskDetail?.RiskType || "")) ===
                        -1
                    if (bugFilter) {
                        setBugList(
                            [{RiskType: data.RiskDetail?.RiskType || "", CWEId: data.RiskDetail?.CWEId || "0"}].concat([
                                ...initBugList.current
                            ])
                        )
                    }
                }
            }
        }, [data])

        // 获取当前表单的内容
        const getValues = useMemoizedFn(() => {
            const obj = form.getFieldsValue()
            const data: PluginBaseParamProps = {
                ScriptName: (obj?.ScriptName || "").trim(),
                Help: (obj?.Help || "").trim() || undefined,
                RiskType: obj?.RiskType || undefined,
                RiskDetail: getBugInfo(),
                RiskAnnotation: (obj?.RiskAnnotation || "").trim() || undefined,
                Tags: obj?.Tags || undefined
            }
            return data
        })
        // 验证是否可以进行信息的提交
        const onFinish: () => Promise<PluginBaseParamProps | undefined> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                form.validateFields()
                    .then((value) => {
                        const obj = form.getFieldsValue()
                        const data: PluginBaseParamProps = {
                            ScriptName: (obj?.ScriptName || "").trim(),
                            Help: (obj?.Help || "").trim() || undefined,
                            RiskType: obj?.RiskType || undefined,
                            RiskDetail: getBugInfo(),
                            RiskAnnotation: (obj?.RiskAnnotation || "").trim() || undefined,
                            Tags: obj?.Tags || undefined
                        }
                        resolve({...data})
                    })
                    .catch((errorInfo) => {
                        resolve(undefined)
                    })
            })
        })
        useImperativeHandle(
            ref,
            () => ({
                onGetValue: getValues,
                onSubmit: onFinish
            }),
            [form]
        )

        // 漏洞信息-相关逻辑
        const initBugList = useRef<RiskListOptProps[]>([])
        const [bugList, setBugList] = useState<RiskListOptProps[]>([])
        const [bugLoading, setBugLoading] = useState<boolean>(false)

        // 获取默认漏洞类型列表
        const fetchInitRiskList = useMemoizedFn(() => {
            setBugLoading(true)
            ipcRenderer
                .invoke("PluginsGetRiskList", {})
                .then((res: {Data: RiskListOptProps[]}) => {
                    initBugList.current = (res?.Data || []).map((item) => {
                        const obj = item
                        obj.CWEId = !!obj.CWEId ? obj.CWEId : "0"
                        return obj
                    })
                    setBugList([...initBugList.current])
                })
                .catch((e) => {
                    if (isEdit && kind === "other") return
                    yakitNotify("error", "获取内置漏洞类型失败:" + e)
                })
                .finally(() => {
                    setTimeout(() => {
                        setBugLoading(false)
                    }, 200)
                })
        })
        useEffect(() => {
            fetchInitRiskList()
        }, [])
        // 漏洞类型搜索功能
        const onBugSearch = useDebounceFn(
            (value: string) => {
                if (value) {
                    setBugLoading(true)
                    const bugFilter = initBugList.current.filter(
                        (item) => item.RiskType.toLowerCase().indexOf(value) > -1
                    )
                    if (bugFilter.length > 0) {
                        setBugList([...bugFilter])
                        setTimeout(() => {
                            setBugLoading(false)
                        }, 200)
                    } else {
                        ipcRenderer
                            .invoke("PluginsGetRiskInfo", {CWEId: value})
                            .then((res: QueryYakScriptRiskDetailByCWEResponse) => {
                                setBugList([{RiskType: res.RiskType || value, CWEId: res.CWEId || "0"}])
                            })
                            .catch(() => {
                                setBugList([{RiskType: value, CWEId: "0"}])
                            })
                            .finally(() => {
                                setTimeout(() => {
                                    setBugLoading(false)
                                }, 200)
                            })
                    }
                } else {
                    setBugList([...initBugList.current])
                }
            },
            {wait: 300}
        ).run
        // 选择漏洞类型的回调
        const onBugChange = useMemoizedFn((value: string, opt) => {
            if (value) {
                // 将自定义输入的选项进行填充选项列表
                const bugFilter = initBugList.current.findIndex((item) => item.RiskType === value)
                if (bugFilter === -1) setBugList([{RiskType: value, CWEId: "0"}].concat([...initBugList.current]))
                ipcRenderer
                    .invoke("PluginsGetRiskInfo", {CWEId: +opt.valueId})
                    .then((res: QueryYakScriptRiskDetailByCWEResponse) => {
                        setBugInfo({
                            CWEId: res.CWEId || "0",
                            RiskType: res.RiskType || value,
                            Description: res?.Description || "",
                            CWESolution: res?.CWESolution || ""
                        })
                    })
                    .catch(() => {
                        setBugInfo({
                            CWEId: opt?.valueId || "0",
                            RiskType: value,
                            Description: "",
                            CWESolution: ""
                        })
                    })
            } else {
                setBugInfo(undefined)
                setBugList([...initBugList.current])
            }
        })

        const onTagChange = useMemoizedFn((value: string[]) => {
            if (tagsCallback)
                setTimeout(() => {
                    tagsCallback()
                }, 50)
        })

        return (
            <Form
                className={classNames("plugins-form", styles["plugin-modify-info-wrapper"])}
                form={form}
                layout='vertical'
            >
                <Form.Item
                    label={
                        <>
                            插件名称<span className='plugins-item-required'>*</span>:
                        </>
                    }
                    name='ScriptName'
                    required={true}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (!value || !value.trim()) return Promise.reject(new Error("插件名称必填"))
                                if (value.trim().length > 100) return Promise.reject(new Error("名称最长100位"))
                            }
                        }
                    ]}
                >
                    <YakitInput
                        wrapperClassName={styles["modify-input"]}
                        placeholder='请输入...'
                        size='large'
                        prefix={<OutlineIdentificationIcon />}
                        maxLength={100}
                        disabled={isEdit}
                    />
                </Form.Item>
                {kind === "other" && (
                    <Form.Item
                        label={
                            <>
                                插件描述<span className='plugins-item-required'>*</span>:
                            </>
                        }
                        name='Help'
                        required={true}
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (!value || !value.trim()) return Promise.reject(new Error("插件描述必填"))
                                }
                            }
                        ]}
                    >
                        <YakitInput.TextArea
                            autoSize={{minRows: 2, maxRows: 2}}
                            placeholder='请输入...'
                            onKeyDown={(e) => {
                                const keyCode = e.keyCode ? e.keyCode : e.key
                                if (keyCode === 13) {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }
                            }}
                        />
                    </Form.Item>
                )}
                {kind === "bug" && (
                    <Form.Item
                        label={
                            <>
                                漏洞类型<span className='plugins-item-required'>*</span>:
                            </>
                        }
                    >
                        <Form.Item noStyle name='RiskType' rules={[{required: true, message: "漏洞类型必填"}]}>
                            <YakitSelect
                                wrapperClassName={styles["modify-select"]}
                                size='large'
                                placeholder='请选择或输入CWE编号，例如:1120，如都不满足可自行输入类型'
                                showSearch={true}
                                filterOption={false}
                                allowClear={true}
                                notFoundContent={bugLoading ? <YakitSpin spinning={true} /> : "暂无数据"}
                                onSearch={onBugSearch}
                                onChange={onBugChange}
                            >
                                {bugList.map((item) => {
                                    return (
                                        <YakitSelect.Option
                                            key={item.RiskType}
                                            value={item.RiskType}
                                            valueId={item.CWEId || ""}
                                        >
                                            {item.RiskType}
                                        </YakitSelect.Option>
                                    )
                                })}
                            </YakitSelect>
                        </Form.Item>

                        <div className={styles["modify-select-icon"]}>
                            <OutlineBugIcon />
                        </div>
                    </Form.Item>
                )}
                {kind === "bug" && userRisk && (
                    <div className={styles["modify-bug-type"]}>
                        <div className={styles["bug-icon"]}>
                            <OutlineSparklesIcon />
                        </div>
                        <div className={styles["bug-info"]}>
                            <div className={styles["info-title"]}>{`${
                                bugInfo?.CWEId && bugInfo.CWEId !== "0" ? "CWE-" + bugInfo.CWEId + " " : ""
                            }${userRisk}`}</div>
                            {isHasBugInfo ? (
                                <div className={styles["info-content"]}>
                                    <div className={styles["content-style"]}>
                                        该漏洞类型没有漏洞描述和修复建议，建议填写补充说明
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={styles["info-content"]}>
                                        <div className={styles["header-style"]}>漏洞描述</div>
                                        <div className={styles["content-style"]}>
                                            {bugInfo?.Description || "暂无描述"}
                                        </div>
                                    </div>
                                    <div className={styles["info-content"]}>
                                        <div className={styles["header-style"]}>修复建议</div>
                                        <div className={styles["content-style"]}>
                                            {bugInfo?.CWESolution || "暂无修复建议"}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                {kind === "bug" && (
                    <Form.Item label='补充说明 :' name='RiskAnnotation'>
                        <YakitInput.TextArea
                            autoSize={{minRows: 2, maxRows: 2}}
                            onKeyDown={(e) => {
                                const keyCode = e.keyCode ? e.keyCode : e.key
                                if (keyCode === 13) {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }
                            }}
                        />
                    </Form.Item>
                )}
                <Form.Item
                    label={
                        <>
                            Tags<span className='plugins-item-required'>*</span>:
                        </>
                    }
                >
                    <Form.Item noStyle name='Tags' rules={[{required: true, message: "Tags必填"}]}>
                        <YakitSelect
                            wrapperClassName={styles["multiple-modify-select"]}
                            mode='tags'
                            allowClear
                            size='large'
                            onChange={(value: string[]) => onTagChange(value)}
                        >
                            {BuiltInTags.map((item) => {
                                return (
                                    <YakitSelect.Option key={item} value={item}>
                                        {item}
                                    </YakitSelect.Option>
                                )
                            })}
                        </YakitSelect>
                    </Form.Item>
                    <div className={styles["modify-select-icon"]}>
                        <OutlineTagIcon />
                    </div>
                </Form.Item>
            </Form>
        )
    })
)

/** @name 插件编辑项-参数、联动、DNSLOG */
export const PluginModifySetting: React.FC<PluginModifySettingProps> = memo(
    React.forwardRef((props, ref) => {
        const {type, tags, setTags, data: oldData} = props

        const [data, setData, getData] = useGetState<PluginSettingParamProps>({
            Params: [],
            EnablePluginSelector: false,
            PluginSelectorTypes: "",
            Content: ""
        })

        // 获取当前表单的内容
        const getValues = useMemoizedFn(() => {
            return {...getData()}
        })
        // 验证是否可以进行信息的提交
        const onFinish: () => Promise<PluginSettingParamProps> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                resolve({...getData()})
            })
        })
        useImperativeHandle(
            ref,
            () => ({
                onGetValue: getValues,
                onSubmit: onFinish
            }),
            []
        )

        useEffect(() => {
            if (oldData) setData({...oldData})
        }, [oldData])

        const [paramModal, setParamModal] = useState<{visible: boolean; info?: PluginParamDataProps}>({visible: false})
        // 打开插件参数信息弹窗
        const onShowParamModal = useMemoizedFn((info?: PluginParamDataProps) => {
            if (!!info) {
                setParamModal({visible: true, info: info})
            } else {
                setParamModal({visible: true})
            }
        })
        // 插件参数信息弹窗提交信息
        const onOKParamModal = useMemoizedFn((data: PluginParamDataProps) => {
            if (!paramModal.info) {
                setData({...getData(), Params: getData().Params.concat([data])})
            } else {
                const arr = getData().Params.map((item) => {
                    if (item.Field === paramModal.info?.Field) {
                        return data
                    }
                    return item
                })
                setData({...getData(), Params: [...arr]})
            }
            onCancelParamModal()
        })
        // 关闭插件参数信息弹窗
        const onCancelParamModal = useMemoizedFn(() => {
            setParamModal({visible: false})
        })

        return (
            <div className={styles["plugin-modify-setting-wrapper"]}>
                <div className={styles["setting-params"]}>
                    <div className={styles["setting-params-header"]}>
                        <div className={styles["header-title"]}>
                            <span className={styles["title-style"]}>增加参数</span>
                            <span className={styles["sub-title-style"]}>可自定义输入项</span>
                        </div>
                        {data.Params.length > 0 && (
                            <YakitButton type='text' onClick={() => onShowParamModal()}>
                                <OutlinePluscircleIcon />
                                添加参数
                            </YakitButton>
                        )}
                    </div>
                    {data.Params.length === 0 && (
                        <div className={styles["setting-params-add"]}>
                            <YakitButton
                                style={{borderStyle: "dashed"}}
                                type='outline1'
                                size='large'
                                onClick={() => onShowParamModal()}
                                block={true}
                            >
                                <OutlinePluscircleIcon />
                                添加参数
                            </YakitButton>
                        </div>
                    )}
                    <PluginParamList
                        list={data?.Params || []}
                        setList={(list) => setData({...data, Params: list})}
                        onEdit={(index) => onShowParamModal(data.Params[index])}
                    />
                </div>
                {type === "yak" && (
                    <>
                        <div className={styles["setting-switch"]}>
                            <div className={styles["switch-wrapper"]}>
                                <YakitSwitch
                                    checked={data.EnablePluginSelector}
                                    onChange={(check) => setData({...data, EnablePluginSelector: check})}
                                />
                                启用插件联动 UI
                            </div>
                            {data.EnablePluginSelector && (
                                <div className={styles[".switch-wrapper"]}>
                                    联动插件类型 :
                                    <YakitSelect
                                        size='large'
                                        value={
                                            data.PluginSelectorTypes ? data.PluginSelectorTypes.split(",") : undefined
                                        }
                                        mode='multiple'
                                        allowClear
                                        onChange={(value: string[]) =>
                                            setData({...data, PluginSelectorTypes: `${value}`})
                                        }
                                    >
                                        <YakitSelect.Option value='mitm'>MITM</YakitSelect.Option>
                                        <YakitSelect.Option value='port_scan'>端口扫描</YakitSelect.Option>
                                    </YakitSelect>
                                </div>
                            )}
                        </div>
                        <div className={styles["setting-switch"]}>
                            <div className={styles["switch-wrapper"]}>
                                <YakitSwitch
                                    checked={tags.includes(PluginGV.PluginYakDNSLogSwitch)}
                                    onChange={(check) => {
                                        if (check) {
                                            const arr = tags.concat([PluginGV.PluginYakDNSLogSwitch])
                                            setTags([...arr])
                                        } else {
                                            const arr = tags.filter((item) => item !== PluginGV.PluginYakDNSLogSwitch)
                                            setTags([...arr])
                                        }
                                    }}
                                />
                                用于自定义 DNSLOG 平台
                            </div>
                        </div>
                    </>
                )}
                {type === "codec" && (
                    <div className={styles["setting-switch"]}>
                        <div className={styles["switch-wrapper"]}>
                            <YakitSwitch
                                checked={tags.includes(PluginGV.PluginCodecHttpSwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([PluginGV.PluginCodecHttpSwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter((item) => item !== PluginGV.PluginCodecHttpSwitch)
                                        setTags([...arr])
                                    }
                                }}
                            />
                            用于自定义HTTP数据包变形
                        </div>
                    </div>
                )}

                <PluginAddParamModal
                    visible={paramModal.visible}
                    info={paramModal.info}
                    setVisible={onCancelParamModal}
                    onOK={onOKParamModal}
                />
            </div>
        )
    })
)

/** @name 插件参数类型 */
const PluginParamTypeList: {text: string; value: string}[] = [
    {text: "字符串 / string", value: "string"},
    {text: "布尔值 / boolean", value: "boolean"},
    {text: "HTTP 数据包 / yak", value: "http-packet"},
    {text: "Yak 代码块 / yak", value: "yak"},
    {text: "文本块 / text", value: "text"},
    {text: "整数（大于零） / uint", value: "uint"},
    {text: "浮点数 / float", value: "float"},
    {text: "上传文件路径 / uploadPath", value: "upload-path"},
    {text: "下拉框 / select", value: "select"}
]
/** @name 新增插件参数弹框 */
export const PluginAddParamModal: React.FC<PluginAddParamModalProps> = memo((props) => {
    const {visible, setVisible, info, onOK} = props

    const isEdit = useMemo(() => {
        return !!info
    }, [info])

    const [form] = Form.useForm()
    const userType = Form.useWatch("TypeVerbose", form)
    const userRequired = Form.useWatch("Required", form)

    useEffect(() => {
        if (visible) {
            form.setFieldsValue({...info})
        } else {
            form.resetFields()
        }
    }, [visible])

    const showTypeItem = useMemo(() => {
        if (userType === "select") {
            return (
                <>
                    <Form.Item label='是否支持多选' name={["ExtraSetting", "double"]}>
                        <YakitSwitch />
                    </Form.Item>
                    <Form.List
                        name={["ExtraSetting", "data"]}
                        rules={[
                            {
                                validator: async (_, data) => {
                                    if (!data) return Promise.reject(new Error("最少添加一个选项"))
                                    if (data.length === 0) return Promise.reject(new Error("最少添加一个选项"))
                                }
                            }
                        ]}
                    >
                        {(fields, {add, remove}, {errors}) => (
                            <>
                                <Form.Item label='下拉框选项'>
                                    <YakitButton type='text' onClick={() => add()}>
                                        新增选项
                                        <OutlinePlusIcon />
                                    </YakitButton>
                                    <Form.ErrorList errors={errors} />
                                </Form.Item>
                                {fields.map(({key, name, ...restField}) => (
                                    <Space key={key} style={{display: "flex", marginLeft: "20%"}} align='baseline'>
                                        <Form.Item
                                            {...restField}
                                            labelCol={{span: 8}}
                                            name={[name, "label"]}
                                            label='选项名称'
                                            rules={[
                                                {
                                                    validator: async (_, value) => {
                                                        if ((value || "").trim().length > 15) {
                                                            return Promise.reject(new Error("选项名称最长15位"))
                                                        }
                                                    }
                                                }
                                            ]}
                                        >
                                            <YakitInput placeholder='不填默认为选项值' maxLength={15} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            labelCol={{span: 8}}
                                            name={[name, "value"]}
                                            label='选项值'
                                            required={true}
                                            rules={[
                                                {
                                                    validator: async (_, value) => {
                                                        if (!value || !value.trim()) {
                                                            return Promise.reject(new Error("请输入选项值"))
                                                        }
                                                        if (value.trim().length > 15) {
                                                            {
                                                                return Promise.reject(new Error("选项值最长15位"))
                                                            }
                                                        }
                                                    }
                                                }
                                            ]}
                                        >
                                            <YakitInput placeholder='必填项,最长15位' maxLength={15} />
                                        </Form.Item>
                                        <YakitButton
                                            type='text'
                                            colors='danger'
                                            icon={<OutlineTrashIcon />}
                                            onClick={() => remove(name)}
                                        />
                                    </Space>
                                ))}
                            </>
                        )}
                    </Form.List>
                </>
            )
        }
        return null
    }, [userType, userRequired])

    const onTypeChange = useMemoizedFn((value: string) => {
        form.setFieldsValue({...form.getFieldsValue(), DefaultValue: "", ExtraSetting: undefined})
        if (value === "select") form.setFieldsValue({...form.getFieldsValue(), ExtraSetting: {double: false, data: []}})
    })
    const onRequiredChange = useMemoizedFn((value: boolean) => {
        form.setFieldsValue({...form.getFieldsValue(), Group: ""})
    })

    const onFinish = useMemoizedFn((values: PluginParamDataProps) => {
        const obj: PluginParamDataProps = {
            Field: (values.Field || "").trim(),
            FieldVerbose: (values.FieldVerbose ? values.FieldVerbose : values.Field).trim(),
            Required: !!values.Required,
            TypeVerbose: values.TypeVerbose,
            DefaultValue: (values.DefaultValue || "").trim(),
            ExtraSetting: values.ExtraSetting || undefined,
            Help: (values.Help || "").trim(),
            Group: (values.Group || "").trim()
        }
        // 类型为下拉框时，对选项数据进行处理
        if (obj.TypeVerbose === "select" && obj.ExtraSetting) {
            const data = obj.ExtraSetting as PluginParamDataSelectProps
            data.data = data.data.map((item) => {
                const label = (item?.label || "").trim()
                const value = item.value.trim()
                return {label: label ? label : value, value: value}
            })
            obj.ExtraSetting = data
        }
        onOK({...obj})
    })

    return (
        <YakitModal
            title={isEdit ? "编辑参数" : "添加新参数"}
            type='white'
            width='80%'
            centered={true}
            closable={true}
            maskClosable={false}
            footer={null}
            visible={visible}
            onCancel={() => setVisible(false)}
            bodyStyle={{padding: 0}}
        >
            <div className={styles["plugin-add-param-form"]}>
                <Form
                    form={form}
                    labelAlign='right'
                    labelCol={{
                        md: {span: 6},
                        lg: {span: 5}
                    }}
                    onFinish={onFinish}
                >
                    <Form.Item
                        label='参数名(英文)'
                        name='Field'
                        required={true}
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (!value || !value.trim()) return Promise.reject(new Error("参数名必填"))
                                    if (value.trim().length > 30) return Promise.reject(new Error("参数名最长30位"))
                                }
                            }
                        ]}
                    >
                        <YakitInput placeholder='填入想要增加的参数名' maxLength={30} />
                    </Form.Item>
                    <Form.Item
                        label='参数显示名称(可中文)'
                        name='FieldVerbose'
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if ((value || "").trim().length > 30)
                                        return Promise.reject(new Error("参数显示名称最长30位"))
                                }
                            }
                        ]}
                    >
                        <YakitInput placeholder='输入想要显示的参数名' maxLength={30} />
                    </Form.Item>
                    <Form.Item label='必要参数' name='Required' valuePropName='checked'>
                        <YakitSwitch onChange={(value: boolean) => onRequiredChange(value)} />
                    </Form.Item>
                    <Form.Item label='参数类型' name='TypeVerbose' rules={[{required: true, message: "参数类型必填"}]}>
                        <YakitSelect placeholder='请选择参数的类型' onChange={(value: string) => onTypeChange(value)}>
                            {PluginParamTypeList.map((item) => {
                                return (
                                    <YakitSelect.Option key={item.value} value={item.value}>
                                        {item.text}
                                    </YakitSelect.Option>
                                )
                            })}
                        </YakitSelect>
                    </Form.Item>
                    {userType !== "upload-path" && (
                        <Form.Item
                            label='默认值'
                            name='DefaultValue'
                            rules={[
                                {
                                    validator: async (_, value) => {
                                        if (userType === "boolean") return
                                        if ((value || "").trim().length > 30) {
                                            return Promise.reject(new Error("默认值最长30位"))
                                        }
                                    }
                                }
                            ]}
                        >
                            {userType === "boolean" ? (
                                <YakitSelect>
                                    <YakitSelect.Option value='true'>布尔值 / true</YakitSelect.Option>
                                    <YakitSelect.Option value='false'>布尔值 / false</YakitSelect.Option>
                                </YakitSelect>
                            ) : (
                                <YakitInput placeholder='该参数的默认值' maxLength={30} />
                            )}
                        </Form.Item>
                    )}
                    {showTypeItem}
                    <Form.Item label='参数帮助信息' name='Help'>
                        <YakitInput.TextArea
                            placeholder='填写该参数的帮助信息，帮助用户更容易理解该内容'
                            autoSize={{minRows: 2, maxRows: 2}}
                            onKeyDown={(e) => {
                                const keyCode = e.keyCode ? e.keyCode : e.key
                                if (keyCode === 13) {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }
                            }}
                        />
                    </Form.Item>
                    {!userRequired && (
                        <Form.Item
                            label='参数组'
                            name='Group'
                            rules={[
                                {
                                    validator: async (_, value) => {
                                        if ((value || "").trim().length > 20) {
                                            return Promise.reject(new Error("参数组最长20位"))
                                        }
                                    }
                                }
                            ]}
                        >
                            <YakitInput
                                placeholder='参数组，在用户输入界面将会把参数分成组，一般用于设置可选参数'
                                maxLength={20}
                            />
                        </Form.Item>
                    )}

                    <Form.Item style={{textAlign: "right"}}>
                        <YakitButton htmlType='submit'>{isEdit ? "修改参数" : "添加参数"}</YakitButton>
                    </Form.Item>
                </Form>
            </div>
        </YakitModal>
    )
})

// 拖拽功能所需
const getItemStyle = (isDragging, draggableStyle) => ({
    ...draggableStyle
})
// 插件参数类型的颜色标识符组
const TypeColors: string[] = ["danger", "info", "success", "warning", "purple", "blue", "cyan", "bluePurple"]
/** @name 插件编辑参数列表 */
export const PluginParamList: React.FC<PluginParamListProps> = memo((props) => {
    const {list, setList, onEdit} = props

    // 给参数类型随机赋予tag颜色
    const typeToColor = useMemo(() => {
        let obj: Record<string, number> = {}
        for (let item of PluginParamTypeList) obj[item.value] = Math.floor(Math.random() * TypeColors.length)
        return obj
    }, [])

    const onCheck = useMemoizedFn((index: number, checked: boolean) => {
        const arr = [...list]
        arr[index].Required = checked
        setList([...arr])
    })
    const onDel = useMemoizedFn((index: number) => {
        const arr = [...list]
        arr.splice(index, 1)
        setList([...arr])
    })
    const updateData = useMemoizedFn((start: number, end: number) => {
        const result = Array.from(list)
        const [removed] = result.splice(start, 1)
        result.splice(end, 0, removed)
        setList([...result])
    })

    const onDragEnd = useMemoizedFn((result: DropResult,provided: ResponderProvided) => {
        const {source, destination} = result
        if (!destination || !source) {
            return
        }
        const startIndex: number = source.index
        const endIndex: number = destination.index
        if (startIndex === endIndex) {
            return
        }
        updateData(startIndex, endIndex)
    })

    return (
        <div
            className={classNames(styles["plugin-param-list-wrapper"], {
                [styles["plugin-param-list-hidden"]]: list.length === 0
            })}
        >
            <div className={styles["list-header"]}>
                <div className={classNames(styles["header-title"], styles["type-style"])}>类型</div>
                <div className={classNames(styles["header-title"], styles["name-style"])}>参数名</div>
                <div className={classNames(styles["header-title"], styles["default-style"])}>默认值</div>
                <div className={classNames(styles["header-title"], styles["required-style"])}>必要参数</div>
                <div className={classNames(styles["header-title"], styles["op-style"])}>操作</div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId='droppable2'>
                    {(provided, snapshot) => {
                        return (
                            <div {...provided.droppableProps} ref={provided.innerRef}>
                                {list.map((item, index) => {
                                    return (
                                        <Draggable key={item.Field} draggableId={item.Field} index={index}>
                                            {(provided, snapshot) => {
                                                return (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={getItemStyle(
                                                            snapshot.isDragging,
                                                            provided.draggableProps.style
                                                        )}
                                                        key={item.Field}
                                                    >
                                                        <div
                                                            className={classNames(styles["list-opt"], {
                                                                [styles["list-drag-opt"]]: snapshot.isDragging
                                                            })}
                                                        >
                                                            <div className={styles["drag-icon"]}>
                                                                <SolidDragsortIcon />
                                                            </div>
                                                            <div className={styles["type-style"]}>
                                                                <YakitTag
                                                                    color={
                                                                        TypeColors[
                                                                            typeToColor[item.TypeVerbose || ""]
                                                                        ] as any
                                                                    }
                                                                >
                                                                    {item.TypeVerbose}
                                                                </YakitTag>
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    styles["name-style"],
                                                                    styles["text-style"],
                                                                    "yakit-content-single-ellipsis"
                                                                )}
                                                                title={`${item.FieldVerbose} / ${item.Field}`}
                                                            >
                                                                {`${item.FieldVerbose} / ${item.Field}`}
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    styles["default-style"],
                                                                    styles["text-style"],
                                                                    "yakit-content-single-ellipsis"
                                                                )}
                                                                title={item.DefaultValue || "-"}
                                                            >
                                                                {item.DefaultValue || "-"}
                                                            </div>
                                                            <div className={classNames(styles["required-style"])}>
                                                                <YakitSwitch
                                                                    checked={item.Required}
                                                                    onChange={(val: boolean) => onCheck(index, val)}
                                                                />
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    styles["op-style"],
                                                                    styles["op-wrapper"]
                                                                )}
                                                            >
                                                                <YakitButton
                                                                    type='text'
                                                                    colors='danger'
                                                                    icon={<OutlineTrashIcon />}
                                                                    onClick={() => onDel(index)}
                                                                />
                                                                <YakitButton
                                                                    type='text2'
                                                                    icon={<OutlinePencilaltIcon />}
                                                                    onClick={() => onEdit(index)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )
                    }}
                </Droppable>
            </DragDropContext>
        </div>
    )
})

/** @name 插件源码 */
export const PluginEditorDiff: React.FC<PluginEditorDiffProps> = memo((props) => {
    const {isDiff, newCode, oldCode = "", setCode, language} = props

    // 更新对比器内容
    const [update, setUpdate] = useState<boolean>(false)

    const [codeModal, setCodeModal] = useState<boolean>(false)
    const onModifyCode = useMemoizedFn((content: string) => {
        if (newCode !== content) setCode(content)
        setCodeModal(false)
    })

    const [diffCodeModal, setDiffCodeModal] = useState<boolean>(false)
    const onDiffModifyCode = useMemoizedFn((content: string) => {
        if (newCode !== content) {
            setCode(content)
            setUpdate(!update)
        }
        setDiffCodeModal(false)
    })

    return (
        <div className={styles["plugin-edtior-diff-wrapper"]}>
            <div className={styles["edit-diff-title"]}>
                {isDiff ? "代码对比" : "源码"}
                <YakitButton
                    size='small'
                    type='text2'
                    icon={<OutlineArrowsexpandIcon />}
                    onClick={() => (isDiff ? setDiffCodeModal(true) : setCodeModal(true))}
                />
            </div>
            {isDiff ? (
                <>
                    <div className={styles["edit-diff-header"]}>
                        <div className={styles["header-body"]}>
                            <span className={styles["body-title"]}>插件源码</span>
                            <span className={styles["body-sub-title"]}>2022-06-05 10:28</span>
                        </div>
                        <div className={classNames(styles["header-body"], styles["header-right-body"])}>
                            <span className={styles["body-sub-title"]}>2022-06-05 10:28</span>
                            <span className={styles["body-title"]}>申请人提交源码</span>
                        </div>
                    </div>
                    {oldCode && newCode && (
                        <div className={styles["edit-diff-wrapper"]}>
                            <YakitDiffEditor
                                leftDefaultCode={oldCode}
                                leftReadOnly={true}
                                rightDefaultCode={newCode}
                                setRightCode={setCode}
                                triggerUpdate={update}
                                language={language}
                            />
                        </div>
                    )}
                </>
            ) : (
                <div className={styles["edit-new-wrapper"]}>
                    <YakitEditor type={language} value={newCode} setValue={setCode} />
                </div>
            )}

            <PluginEditorModal visible={codeModal} setVisible={onModifyCode} code={newCode} />
            <PluginDiffEditorModal
                language={language}
                oldCode={oldCode}
                newCode={newCode}
                visible={diffCodeModal}
                setVisible={onDiffModifyCode}
            />
        </div>
    )
})

/**@name 插件详情中列表的item */
export const PluginDetailsListItem: <T>(props: PluginDetailsListItemProps<T>) => any = React.memo((props) => {
    const {
        order,
        plugin,
        check,
        headImg,
        isCorePlugin,
        official,
        pluginType,
        selectUUId,
        pluginName,
        help,
        pluginUUId,
        content,
        optCheck,
        extra,
        onPluginClick
    } = props
    const onCheck = useMemoizedFn((e: CheckboxChangeEvent) => {
        optCheck(plugin, e.target.checked)
    })
    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[pluginType].icon} />
        }
        return <AuthorImg src={headImg || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, headImg, pluginType, official])
    const onClick = useMemoizedFn((e) => {
        onPluginClick(plugin, order)
    })
    // 副标题组件
    const extraNode = useMemoizedFn(() => {
        if (extra) return extra(plugin)
        return null
    })
    return (
        <div
            className={classNames("plugin-details-item-wrapper", {
                "plugin-details-item-wrapper-active": selectUUId === pluginUUId
            })}
            onClick={onClick}
        >
            <div
                className={classNames("plugin-details-item", {
                    "plugin-details-item-active": selectUUId === pluginUUId
                })}
            >
                <div className={"plugin-details-item-info"}>
                    <YakitCheckbox
                        checked={check}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        onChange={onCheck}
                    />
                    {authorImgNode}
                    <div
                        className={classNames("plugin-details-item-info-text-style", "yakit-content-single-ellipsis")}
                        title={pluginName}
                    >
                        {pluginName}
                    </div>
                </div>
                <div className={"plugin-details-item-show"}>
                    {extraNode()}
                    <Tooltip
                        title={help || "No Description about it."}
                        placement='topRight'
                        overlayClassName='plugins-tooltip'
                    >
                        <OutlineQuestionmarkcircleIcon className={"plugin-details-item-show-icon-style"} />
                    </Tooltip>
                    <YakitPopover
                        placement='topRight'
                        overlayClassName={"terminal-popover"}
                        content={<YakEditor type={pluginType} value={content} readOnly={true} />}
                    >
                        <OutlineTerminalIcon className={"plugin-details-item-show-icon-style"} />
                    </YakitPopover>
                </div>
            </div>
        </div>
    )
})
/**@name 插件详情中协作者展示item */
export const PluginContributesListItem: React.FC<PluginContributesListItemProps> = React.memo((props) => {
    const {contributesHeadImg, contributesName} = props
    return (
        <div className={styles["contributes-item-wrapper"]}>
            <AuthorImg size='small' src={contributesHeadImg || UnLogin} />
            <span className='content-ellipsis '>{contributesName}</span>
        </div>
    )
})

/** ---------- 以下为对应关系字段和插件页面共用图标 ---------- */
/** 审核状态标签 */
export const statusTag: {[key: string]: ReactNode} = {
    "0": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-pending"])}>
            {aduitStatusToName["0"].icon}
            {aduitStatusToName["0"].name}
        </div>
    ),
    "1": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-passed"])}>
            {aduitStatusToName["1"].icon}
            {aduitStatusToName["1"].name}
        </div>
    ),
    "2": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-failed"])}>
            {aduitStatusToName["2"].icon}
            {aduitStatusToName["2"].name}
        </div>
    )
}

/** 搜索过滤条件对应展示名称 */
export const filterToName: Record<string, string> = {
    type: "插件状态",
    tags: "TAG",
    plugin_type: "插件类型",
    status: "审核状态",
    group: "插件分组"
}

export const defaultFilter: PluginFilterParams = {
    // plugin_type: ["yak", "mitm", "codec", "packet-hack", "port-scan"],
    // status: ["0"],
    // plugin_private: ["1"]
}
export const defaultSearch: PluginSearchParams = {
    keyword: "",
    userName: "",
    type: "keyword"
}
export const defaultPagemeta: PluginListPageMeta = {page: 1, limit: 20}
export const defaultResponse: API.YakitPluginListResponse = {
    data: [],
    pagemeta: {
        limit: 20,
        page: 1,
        total: 0,
        total_page: 1
    }
}
