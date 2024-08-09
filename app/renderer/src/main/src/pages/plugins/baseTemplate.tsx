import React, {ReactNode, memo, useEffect, useImperativeHandle, useMemo, useState} from "react"
import {
    CollaboratorInfoProps,
    PluginContributesListItemProps,
    PluginDetailHeaderProps,
    PluginDetailsListItemProps,
    PluginDetailsProps,
    PluginEditorDiffProps,
    PluginModifyInfoProps,
    PluginModifySettingProps,
    PluginSearchParams,
    PluginsContainerProps,
    PluginsLayoutProps
} from "./baseTemplateType"
import {SolidChevrondownIcon, SolidChevronupIcon} from "@/assets/icon/solid"
import {FilterPanel} from "@/components/businessUI/FilterPanel/FilterPanel"
import {AuthorIcon, AuthorImg, FuncSearch, PluginDiffEditorModal, PluginEditorModal, TagsListShow} from "./funcTemplate"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineIdentificationIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineReplyIcon,
    OutlineSparklesIcon,
    OutlineTagIcon,
    OutlineTerminalIcon
} from "@/assets/icon/outline"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Form, Tooltip} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {formatDate} from "@/utils/timeUtil"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {useDebounceFn, useGetState, useMemoizedFn, useControllableValue, useUpdateEffect} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {PluginBaseParamProps, PluginSettingParamProps, YakRiskInfoProps} from "./pluginsType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {YakEditor} from "@/utils/editors"
import {CheckboxChangeEvent} from "antd/lib/checkbox"
import {BuiltInTags, RiskLevelToTag} from "./editDetails/builtInData"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"
import {aduitStatusToName, pluginTypeToName} from "./builtInData"
import {YakitDiffEditor} from "@/components/yakitUI/YakitDiffEditor/YakitDiffEditor"
import UnLogin from "@/assets/unLogin.png"
import YakitLogo from "@/assets/yakitLogo.png"
import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {PluginSwitchTagToContent, PluginSwitchToTag} from "../pluginEditor/defaultconstants"
import {YakitSelectProps} from "@/components/yakitUI/YakitSelect/YakitSelectType"
import cloneDeep from "lodash/cloneDeep"
import "./plugins.scss"
import styles from "./baseTemplate.module.scss"
import classNames from "classnames"

/** @name 插件列表大框架组件 */
export const PluginsLayout: React.FC<PluginsLayoutProps> = memo((props) => {
    const {pageWrapId, title, subTitle, extraHeader, hidden, children} = props

    const titleNode = useMemo(() => {
        if (!title) return <div className={styles["title-style"]}>插件商店</div>

        if (typeof title === "string") return <div className={styles["title-style"]}>{title}</div>
        else return title
    }, [title])

    return (
        <div
            id={pageWrapId}
            className={classNames(
                styles["plugins-layout"],
                {[styles["plugins-mask-wrap"]]: !!pageWrapId},
                {[styles["plugins-hidden"]]: !!hidden}
            )}
        >
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
    const {
        loading,
        visible,
        setVisible,
        selecteds,
        onSelect,
        groupList,
        children,
        filterClassName,
        loadingTip = ""
    } = props
    return (
        <YakitSpin spinning={loading} tip={loadingTip}>
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
        filterBodyBottomNode,
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
    const [hidden, setHidden] = useControllableValue<boolean>(props, {
        defaultValue: false,
        defaultValuePropName: "hidden",
        valuePropName: "hidden",
        trigger: "setHidden"
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
        <div
            id={pageWrapId}
            className={classNames(styles["plugin-details-wrapper"], {[styles["plugins-mask-wrap"]]: !!pageWrapId})}
        >
            <div className={classNames(styles["filter-wrapper"], {[styles["filter-hidden-wrapper"]]: hidden})}>
                <div className={styles["filter-header"]}>
                    <div className={styles["header-search"]}>
                        {title && <div className={styles["title-style"]}>{title}</div>}
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
                    {filterBodyBottomNode || null}
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
                <div className={classNames(styles["details-body"], bodyClassName)}>{children}</div>
            </div>
        </div>
    )
})

/** @name 固定插件Tags转译 */
export const onPluginTagsToName = (key: string): string => {
    return PluginSwitchTagToContent[key] || key
}

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
        basePluginName,
        wrapperClassName,
        isHiddenUUID,
        infoExtra
    } = props

    const tagList = useMemo(() => {
        if (!tags) return []
        if (tags === "null") return []
        let arr: string[] = []
        try {
            arr = tags ? tags.split(",") : []
            arr = arr.map((item) => onPluginTagsToName(item))
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
        <div className={classNames(styles["plugin-detail-header-wrapper"], wrapperClassName)}>
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
                    {!isHiddenUUID && pluginId && (
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
                    {basePluginName && (
                        <>
                            <div className={styles["divider-style"]} />
                            <div className={styles["copy-wrapper"]}>
                                <span>来源:</span>
                                <Tooltip
                                    title={`复制插件 “${basePluginName}” 为 “${pluginName}”`}
                                    overlayClassName='plugins-tooltip'
                                >
                                    <YakitTag style={{marginRight: 0, cursor: "pointer"}}>复制</YakitTag>
                                </Tooltip>
                            </div>
                        </>
                    )}
                </div>

                <div className={styles["divider-style"]}></div>
                <div
                    className={classNames(styles["text-style"], {[styles["constant-wrapper"]]: !infoExtra})}
                >{`更新时间 : ${formatDate(updated_at)}`}</div>

                {!!infoExtra && (
                    <>
                        <div className={styles["divider-style"]}></div>
                        {infoExtra}
                    </>
                )}
            </div>
        </div>
    )
})

/** @name 插件基本信息 */
export const PluginModifyInfo: React.FC<PluginModifyInfoProps> = memo(
    React.forwardRef((props, ref) => {
        const {isEdit = false, data, tagsCallback} = props

        const [form] = Form.useForm()

        const [bugInfo, setBugInfo] = useState<YakRiskInfoProps[]>([])
        const riskLength = useMemo(() => {
            return bugInfo.length
        }, [bugInfo])
        const [riskShow, setRiskShow] = useState<boolean>(false)
        const onOpenRisk = useMemoizedFn(() => {
            if (!riskShow) setRiskShow(true)
        })
        const onCancelRisk = useMemoizedFn(() => {
            if (riskShow) setRiskShow(false)
        })

        const replaceTagName = useMemoizedFn((key: string) => {
            return {key, label: onPluginTagsToName(key)}
        })

        useEffect(() => {
            if (data) {
                form.resetFields()
                const copyData = cloneDeep(data)
                let newTags: any = copyData.Tags
                if (Array.isArray(copyData.Tags) && copyData.Tags.length > 0) {
                    newTags = []
                    copyData.Tags.forEach((item) => {
                        newTags.push(replaceTagName(item))
                    })
                }
                copyData.Tags = newTags
                form.setFieldsValue({...copyData})
                setBugInfo(copyData?.RiskDetail || [])
            }
        }, [data])

        const toTagsKey = useMemoizedFn((Tags) => {
            if (Array.isArray(Tags) && Tags.length > 0) {
                return Tags.map((item) => {
                    if (typeof item === "string") {
                        return item
                    } else {
                        return item?.key || ""
                    }
                })
            }
            return Tags
        })

        // 获取当前表单的内容
        const getValues = useMemoizedFn(() => {
            const obj = form.getFieldsValue()
            const data: PluginBaseParamProps = {
                ScriptName: (obj?.ScriptName || "").trim(),
                Help: (obj?.Help || "").trim() || undefined,
                RiskDetail: bugInfo || [],
                Tags: toTagsKey(obj?.Tags) || undefined
            }
            return data
        })

        // 验证是否可以进行信息的提交
        const onFinish: () => Promise<PluginBaseParamProps | undefined> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                form.validateFields()
                    .then((value) => {
                        resolve({...getValues()})
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

        const onTagChange = useMemoizedFn((value: string[]) => {
            if (tagsCallback) tagsCallback(value)
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

                <Form.Item
                    label={
                        <>
                            描述<span className='plugins-item-required'>*</span>:
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

                {riskLength > 0 && (
                    <div className={styles["modify-bug-type"]}>
                        <div className={styles["bug-icon"]}>
                            <OutlineSparklesIcon />
                        </div>
                        <div className={styles["bug-info"]}>
                            <div className={styles["info-title"]}>
                                <div
                                    className={classNames("yakit-content-single-ellipsis", styles["name-style"])}
                                    title={`${bugInfo[0]?.CVE} ${bugInfo[0]?.TypeVerbose}`}
                                >{`${bugInfo[0]?.CVE} ${bugInfo[0]?.TypeVerbose}`}</div>

                                <YakitTag color={RiskLevelToTag[bugInfo[0]?.Level || "info"].color as YakitTagColor}>
                                    {RiskLevelToTag[bugInfo[0]?.Level || "info"].name}
                                </YakitTag>
                            </div>
                            <div className={styles["info-content"]}>
                                <div className={styles["header-style"]}>漏洞描述</div>
                                <div className={styles["content-style"]}>{bugInfo[0]?.Description || "暂无描述"}</div>
                            </div>
                            <div className={styles["info-content"]}>
                                <div className={styles["header-style"]}>修复建议</div>
                                <div className={styles["content-style"]}>{bugInfo[0]?.Solution || "暂无修复建议"}</div>
                            </div>
                            {riskLength > 1 && (
                                <div>
                                    <YakitButton type='outline1' onClick={onOpenRisk}>
                                        更多
                                    </YakitButton>
                                </div>
                            )}
                        </div>
                    </div>
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

                <YakitModal
                    title='漏洞描述'
                    type='white'
                    closable={true}
                    footer={null}
                    visible={riskShow}
                    onCancel={onCancelRisk}
                >
                    <div className={styles["risk-info-modal"]}>
                        {bugInfo.map((item) => {
                            return (
                                <div key={item.CVE} className={styles["risk-info-opt"]}>
                                    <div className={styles["bug-icon"]}>
                                        <OutlineSparklesIcon />
                                    </div>
                                    <div className={styles["bug-info"]}>
                                        <div className={styles["info-title"]}>
                                            <div
                                                className={classNames(
                                                    "yakit-content-single-ellipsis",
                                                    styles["name-style"]
                                                )}
                                                title={`${item?.CVE} ${item?.TypeVerbose}`}
                                            >{`${item?.CVE} ${item?.TypeVerbose}`}</div>

                                            <YakitTag
                                                color={RiskLevelToTag[item?.Level || "info"].color as YakitTagColor}
                                            >
                                                {RiskLevelToTag[item?.Level || "info"].name}
                                            </YakitTag>
                                        </div>
                                        <div className={styles["info-content"]}>
                                            <div className={styles["header-style"]}>漏洞描述</div>
                                            <div className={styles["content-style"]}>
                                                {item?.Description || "暂无描述"}
                                            </div>
                                        </div>
                                        <div className={styles["info-content"]}>
                                            <div className={styles["header-style"]}>修复建议</div>
                                            <div className={styles["content-style"]}>
                                                {item?.Solution || "暂无修复建议"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </YakitModal>
            </Form>
        )
    })
)

/** @name 插件编辑项-参数、联动、DNSLOG */
export const PluginModifySetting: React.FC<PluginModifySettingProps> = memo(
    React.forwardRef((props, ref) => {
        const {type, tags, setTags, data: oldData} = props

        const [data, setData, getData] = useGetState<PluginSettingParamProps>({
            EnablePluginSelector: false,
            PluginSelectorTypes: "",
            Content: ""
        })

        const [selectStatus, setSelectStatus] = useState<YakitSelectProps["status"]>()

        // 获取当前表单的内容
        const getValues = useMemoizedFn(() => {
            return {...getData()}
        })
        // 验证是否可以进行信息的提交
        const onFinish: () => Promise<PluginSettingParamProps | undefined> = useMemoizedFn(() => {
            return new Promise((resolve, reject) => {
                if (onValidateFields()) {
                    resolve({...getData()})
                } else {
                    resolve(undefined)
                }
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
        const onValidateFields = useMemoizedFn(() => {
            if (data.EnablePluginSelector && !data.PluginSelectorTypes) {
                setSelectStatus("error")
                return false
            } else {
                setSelectStatus(undefined)
                return true
            }
        })
        const onSelectChange = useMemoizedFn((value: string[]) => {
            if (value.length === 0) {
                setSelectStatus("error")
            } else {
                setSelectStatus(undefined)
            }
            setData({...data, PluginSelectorTypes: `${value}`})
        })
        return (
            <div className={styles["plugin-modify-setting-wrapper"]}>
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
                                <div className={classNames(styles["switch-wrapper"], styles["switch-type-wrapper"])}>
                                    <span className={styles["switch-text"]}>
                                        联动插件类型<span className='plugins-item-required'>*</span> :
                                    </span>
                                    <div className={styles["select-wrapper"]}>
                                        <YakitSelect
                                            size='large'
                                            value={
                                                data.PluginSelectorTypes
                                                    ? data.PluginSelectorTypes.split(",")
                                                    : undefined
                                            }
                                            mode='multiple'
                                            allowClear
                                            onChange={onSelectChange}
                                            status={selectStatus}
                                        >
                                            <YakitSelect.Option value='mitm'>MITM</YakitSelect.Option>
                                            <YakitSelect.Option value='port-scan'>端口扫描</YakitSelect.Option>
                                        </YakitSelect>
                                        {selectStatus === "error" && (
                                            <span className={styles["switch-text-error"]}>联动插件类型必填</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles["setting-switch"]}>
                            <div className={styles["switch-wrapper"]}>
                                <YakitSwitch
                                    checked={tags.includes(PluginSwitchToTag.PluginYakDNSLogSwitch)}
                                    onChange={(check) => {
                                        if (check) {
                                            const arr = tags.concat([PluginSwitchToTag.PluginYakDNSLogSwitch])
                                            setTags([...arr])
                                        } else {
                                            const arr = tags.filter(
                                                (item) => item !== PluginSwitchToTag.PluginYakDNSLogSwitch
                                            )
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
                                checked={tags.includes(PluginSwitchToTag.PluginCodecHttpSwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([PluginSwitchToTag.PluginCodecHttpSwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter(
                                            (item) => item !== PluginSwitchToTag.PluginCodecHttpSwitch
                                        )
                                        setTags([...arr])
                                    }
                                }}
                            />
                            用于HTTP数据包变形
                        </div>
                    </div>
                )}
                {type === "codec" && (
                    <div className={styles["setting-switch"]}>
                        <div className={styles["switch-wrapper"]}>
                            <YakitSwitch
                                checked={tags.includes(PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter(
                                            (item) => item !== PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch
                                        )
                                        setTags([...arr])
                                    }
                                }}
                            />
                            用于数据包右键
                        </div>
                    </div>
                )}
                {type === "codec" && (
                    <div className={styles["setting-switch"]}>
                        <div className={styles["switch-wrapper"]}>
                            <YakitSwitch
                                checked={tags.includes(PluginSwitchToTag.PluginCodecSingleHistorySwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([PluginSwitchToTag.PluginCodecSingleHistorySwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter(
                                            (item) => item !== PluginSwitchToTag.PluginCodecSingleHistorySwitch
                                        )
                                        setTags([...arr])
                                    }
                                }}
                            />
                            用于history右键(单选)
                        </div>
                    </div>
                )}
                {type === "codec" && (
                    <div className={styles["setting-switch"]}>
                        <div className={styles["switch-wrapper"]}>
                            <YakitSwitch
                                checked={tags.includes(PluginSwitchToTag.PluginCodecMultipleHistorySwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([PluginSwitchToTag.PluginCodecMultipleHistorySwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter(
                                            (item) => item !== PluginSwitchToTag.PluginCodecMultipleHistorySwitch
                                        )
                                        setTags([...arr])
                                    }
                                }}
                            />
                            用于history右键(多选)
                        </div>
                    </div>
                )}
            </div>
        )
    })
)

/** @name 插件源码 */
export const PluginEditorDiff: React.FC<PluginEditorDiffProps> = memo((props) => {
    const {isDiff, newCode, oldCode = "", setCode, language, triggerUpdate} = props

    // 更新对比器内容
    const [update, setUpdate] = useState<boolean>(!!triggerUpdate)

    useUpdateEffect(() => {
        setUpdate(!!triggerUpdate)
    }, [triggerUpdate])

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
                            <span className={styles["body-sub-title"]}></span>
                        </div>
                        <div className={classNames(styles["header-body"], styles["header-right-body"])}>
                            <span className={styles["body-sub-title"]}></span>
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
        onPluginClick,
        enableCheck = true,
        enableClick = true
    } = props
    const onCheck = useMemoizedFn((e: CheckboxChangeEvent) => {
        if (enableCheck) optCheck(plugin, e.target.checked)
    })
    const authorImgNode = useMemo(() => {
        if (isCorePlugin) {
            return <AuthorImg src={YakitLogo} icon={pluginTypeToName[pluginType].icon} />
        }
        return <AuthorImg src={headImg || UnLogin} builtInIcon={official ? "official" : undefined} />
    }, [isCorePlugin, headImg, pluginType, official])
    const onClick = useMemoizedFn((e) => {
        if (enableClick) onPluginClick(plugin, order)
    })
    // 副标题组件
    const extraNode = useMemoizedFn(() => {
        if (extra) return extra(plugin)
        return null
    })
    return (
        <div
            className={classNames("plugin-details-item-wrapper", {
                "plugin-details-item-wrapper-active": selectUUId === pluginUUId,
                "plugin-details-item-wrapper-enableClick": enableClick
            })}
            onClick={onClick}
        >
            <div
                className={classNames("plugin-details-item", {
                    "plugin-details-item-active": selectUUId === pluginUUId
                })}
            >
                <div className={"plugin-details-item-info"}>
                    {enableCheck && (
                        <YakitCheckbox
                            checked={check}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            onChange={onCheck}
                        />
                    )}
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
    ),
    "3": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-afoot"])}>
            {aduitStatusToName["3"].icon}
            {aduitStatusToName["3"].name}
        </div>
    )
}
