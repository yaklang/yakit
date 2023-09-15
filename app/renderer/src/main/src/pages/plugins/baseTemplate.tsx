import React, {ReactNode, memo, useEffect, useImperativeHandle, useMemo, useRef, useState} from "react"
import {
    PluginAddParamModalProps,
    PluginDetailHeaderProps,
    PluginDetailsProps,
    PluginEditorDiffProps,
    PluginModifyInfoProps,
    PluginModifySettingProps,
    PluginParamListProps,
    PluginsContainerProps,
    PluginsLayoutProps
} from "./baseTemplateType"
import {
    SolidBadgecheckIcon,
    SolidBanIcon,
    SolidChevrondownIcon,
    SolidChevronupIcon,
    SolidDragsortIcon,
    SolidFlagIcon
} from "@/assets/icon/solid"
import {FilterPanel} from "@/components/businessUI/FilterPanel/FilterPanel"
import {AuthorIcon, AuthorImg, FuncSearch, TagsListShow} from "./funcTemplate"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
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
    OutlineTrashIcon
} from "@/assets/icon/outline"
import {
    SolidCollectionPluginIcon,
    SolidDocumentSearchPluginIcon,
    SolidPluginProtScanIcon,
    SolidPluginYakMitmIcon,
    SolidSparklesPluginIcon,
    SolidYakitPluginIcon
} from "@/assets/icon/colors"
import {RollingLoadList} from "@/components/RollingLoadList/RollingLoadList"
import {Form, Space, Tooltip} from "antd"
import {YakitPopover} from "@/components/yakitUI/YakitPopover/YakitPopover"
import {formatDate} from "@/utils/timeUtil"
import {CopyComponents, YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitSwitch} from "@/components/yakitUI/YakitSwitch/YakitSwitch"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {DragDropContext, Droppable, Draggable} from "react-beautiful-dnd"
import {useDebounceFn, useGetState, useMemoizedFn} from "ahooks"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {
    PluginBaseParamProps,
    PluginParamDataProps,
    PluginParamDataSelectProps,
    PluginSettingParamProps
} from "./pluginsType"
import {MITMPluginTemplate} from "../invoker/data/MITMPluginTamplate"
import {PortScanPluginTemplate} from "../invoker/data/PortScanPluginTemplate"
import {CodecPluginTemplate} from "../invoker/data/CodecPluginTemplate"
import {CodeGV} from "@/yakitGV"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"

import styles from "./baseTemplate.module.scss"
import classNames from "classnames"

/** @name 插件列表大框架组件 */
export const PluginsLayout: React.FC<PluginsLayoutProps> = memo((props) => {
    const {title, subTitle, extraHeader, hidden, children} = props

    const titleNode = useMemo(() => {
        if (!title) return <div className={styles["title-style"]}>插件商店</div>

        if (typeof title === "string") return <div className={styles["title-style"]}>{title}</div>
        else return title
    }, [title])

    return (
        <div className={classNames(styles["plugins-layout"], {[styles["plugins-hidden"]]: !!hidden})}>
            <div className={styles["plugins-layout-header"]}>
                <div className={styles["header-body"]}>
                    {titleNode}
                    {!!subTitle ? <div className={styles["subtitle-wrapper"]}>{subTitle}</div> : null}
                </div>
                {!!extraHeader ? extraHeader : <div style={{width: 300}}></div>}
            </div>
            <div className={styles["plugins-layout-container"]}>{children}</div>
        </div>
    )
})
/** @name 插件列表组件(带侧边搜索栏)  */
export const PluginsContainer: React.FC<PluginsContainerProps> = memo((props) => {
    const {loading, visible, setVisible, selecteds, onSelect, groupList, children} = props

    return (
        <YakitSpin spinning={loading}>
            <div className={styles["plugins-container-wrapper"]}>
                <div className={styles["container-body"]}>{children}</div>

                <FilterPanel
                    wrapperClassName={styles["container-filter-wrapper"]}
                    // loading={!!loading}
                    visible={visible}
                    setVisible={setVisible}
                    selecteds={selecteds}
                    onSelect={onSelect}
                    groupList={groupList}
                />
            </div>
        </YakitSpin>
    )
})
/** @name 插件详情大框架组件(带左侧插件列表) */
export const PluginDetails: <T>(props: PluginDetailsProps<T>) => any = memo((props) => {
    const {title, filterNode, filterExtra, checked, onCheck, total, selected, listProps, onBack, children} = props

    /** 全选框是否为半选状态 */
    const checkIndeterminate = useMemo(() => {
        if (checked) return false
        if (!checked && selected > 0) return true
        return false
    }, [checked, selected])

    const [hidden, setHidden] = useState<boolean>(false)

    return (
        <div className={styles["plugin-details-wrapper"]}>
            <div className={classNames(styles["filter-wrapper"], {[styles["filter-hidden-wrapper"]]: hidden})}>
                <div className={styles["filter-header"]}>
                    <div className={styles["header-search"]}>
                        <div className={styles["title-style"]}>{title}</div>
                        <FuncSearch onSearch={() => {}} />
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
                <div className={styles["filter-list"]}>
                    <RollingLoadList {...listProps} />
                </div>
            </div>
            <div className={styles["details-wrapper"]}>
                <div className={styles["details-header"]}>
                    <div className={styles["header-title"]}>
                        插件详情
                        <span className={styles["subtitle-style"]}>线上数据需要下载到本地才可执行</span>
                    </div>
                    <div className={styles["header-btn"]}>
                        <YakitButton type='text2' icon={<OutlineReplyIcon />} onClick={onBack}>
                            返回
                        </YakitButton>
                        <div className={styles["divider-style"]}></div>
                        <YakitButton
                            type='text2'
                            icon={<OutlineArrowsexpandIcon />}
                            onClick={() => setHidden(!hidden)}
                        />
                    </div>
                </div>
                <div className={styles["details-body"]}>{children}</div>
            </div>
        </div>
    )
})

/** @name 插件详情-头部信息(样式未调完整) */
export const PluginDetailHeader: React.FC<PluginDetailHeaderProps> = memo((props) => {
    const {pluginName, help, titleNode, tags, extraNode, img, user, pluginId, updated_at} = props

    const tagList = useMemo(() => {
        let arr: string[] = []
        try {
            arr = JSON.parse(tags || "[]")
        } catch (error) {}
        return arr
    }, [tags])

    const [prShow, setPrShow] = useState<boolean>(false)

    return (
        <div className={styles["plugin-detail-header-wrapper"]}>
            <div className={styles["header-wrapper"]}>
                <div className={styles["header-info"]}>
                    <div className={styles["info-title"]}>
                        <div
                            className={classNames(styles["title-style"], "yakit-content-single-ellipsis")}
                            title={pluginName}
                        >
                            {pluginName}
                        </div>
                        <div className={styles["subtitle-wrapper"]}>
                            <Tooltip title={help || "No Description about it."} overlayClassName='plugins-tooltip'>
                                <OutlineQuestionmarkcircleIcon className={styles["help-icon"]} />
                            </Tooltip>
                            {titleNode || null}
                        </div>
                    </div>
                    <div className={classNames(styles["info-tags"])}>
                        <TagsListShow tags={tagList} />
                    </div>
                </div>
                {extraNode || null}
            </div>

            <div className={styles["author-wrapper"]}>
                <div className={styles["left-wrapper"]}>
                    <div className={styles["left-wrapper"]}>
                        <div className={styles["author-wrapper"]}>
                            <AuthorImg src={img || ""} />
                            <div
                                className={classNames(
                                    styles["name-wrapper"],
                                    styles["text-style"],
                                    "yakit-content-single-ellipsis"
                                )}
                                title={user || ""}
                            >
                                {user || ""}
                            </div>
                            <AuthorIcon />
                        </div>

                        <div style={{marginRight: 8}} className={styles["divider-style"]}></div>
                        <YakitPopover
                            overlayClassName={styles["terminal-popover"]}
                            placement='bottom'
                            content={<>123</>}
                            onVisibleChange={(show) => setPrShow(show)}
                        >
                            <YakitButton type='text2' isActive={prShow}>
                                {`${7}位协作者`}
                                {prShow ? <SolidChevronupIcon /> : <SolidChevrondownIcon />}
                            </YakitButton>
                        </YakitPopover>
                    </div>

                    <div style={{marginLeft: 8}} className={styles["divider-style"]}></div>
                    <div className={styles["id-wrapper"]}>
                        <div
                            className={classNames(
                                styles["text-wrapper"],
                                styles["text-style"],
                                "yakit-content-single-ellipsis"
                            )}
                            title={`插件ID : ${pluginId}`}
                        >{`插件ID : ${pluginId}`}</div>
                        <CopyComponents className={classNames(styles["copy-icon-style"])} copyText={pluginId} />
                    </div>
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

        const [bugInfo, setBugInfo, getBugInfo] = useGetState<{bugHelp: string; bugFix: string}>({
            bugHelp: "",
            bugFix: ""
        })
        const isHasBugInfo = useMemo(() => {
            return !bugInfo.bugHelp && !bugInfo.bugFix
        }, [bugInfo])

        const [form] = Form.useForm()
        const userBug = Form.useWatch("bug", form)

        useEffect(() => {
            form.setFieldsValue(!!data ? {...data} : undefined)
        }, [data])

        // 获取当前表单的内容
        const getValues = useMemoizedFn(() => {
            const obj = form.getFieldsValue()
            const data: PluginBaseParamProps = {
                name: (obj?.name || "").trim(),
                help: (obj?.help || "").trim() || undefined,
                bug: obj?.bug || undefined,
                bugHelp: getBugInfo().bugHelp || undefined,
                bugFix: getBugInfo().bugFix || undefined,
                commnt: (obj?.commnt || "").trim() || undefined,
                tags: obj?.tags || undefined
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
                            name: (obj?.name || "").trim(),
                            help: (obj?.help || "").trim() || undefined,
                            bug: obj?.bug || undefined,
                            bugHelp: getBugInfo().bugHelp || undefined,
                            bugFix: getBugInfo().bugFix || undefined,
                            commnt: (obj?.commnt || "").trim() || undefined,
                            tags: obj?.tags || undefined
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
        const initBugList = useRef<
            {
                value: string
                label: string
            }[]
        >([
            {value: "111", label: "教程"},
            {value: "222", label: "你是"},
            {value: "333", label: "厉害"}
        ])
        const [bugList, setBugList] = useState<
            {
                value: string
                label: string
            }[]
        >([
            {value: "111", label: "教程"},
            {value: "222", label: "你是"},
            {value: "333", label: "厉害"}
        ])
        const [bugLoading, setBugLoading] = useState<boolean>(false)
        const onBugSearch = useDebounceFn(
            (value: string) => {
                if (value) {
                    setBugLoading(true)
                    setBugList([])
                    setTimeout(() => {
                        setBugLoading(false)
                    }, 2000)
                } else {
                    setBugList([...initBugList.current])
                }
            },
            {wait: 200}
        ).run

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
                    name='name'
                    required={true}
                    rules={[
                        {
                            validator: async (_, value) => {
                                if (!value || !value.trim()) return Promise.reject(new Error("插件名称必填"))
                                if (value.trim().length > 30) return Promise.reject(new Error("名称最长30位"))
                            }
                        }
                    ]}
                >
                    <YakitInput
                        wrapperClassName={styles["modify-input"]}
                        placeholder='请输入...'
                        size='large'
                        prefix={<OutlineIdentificationIcon />}
                        maxLength={30}
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
                        name='help'
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
                        <Form.Item noStyle name='bug' rules={[{required: true, message: "漏洞类型必填"}]}>
                            <YakitSelect
                                wrapperClassName={styles["modify-select"]}
                                size='large'
                                placeholder='请选择或输入 CWE 编号...'
                                showSearch={true}
                                filterOption={false}
                                notFoundContent={bugLoading ? <YakitSpin spinning={true} /> : "暂无数据"}
                                onSearch={onBugSearch}
                            >
                                {bugList.map((item) => {
                                    return (
                                        <YakitSelect.Option key={item.value} value={item.value}>
                                            {item.label}
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
                {kind === "bug" && userBug && (
                    <div className={styles["modify-bug-type"]}>
                        <div className={styles["bug-icon"]}>
                            <OutlineSparklesIcon />
                        </div>
                        <div className={styles["bug-info"]}>
                            <div className={styles["info-title"]}>{userBug}</div>
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
                                        <div className={styles["content-style"]}>{bugInfo.bugHelp}</div>
                                    </div>
                                    <div className={styles["info-content"]}>
                                        <div className={styles["header-style"]}>修复建议</div>
                                        <div className={styles["content-style"]}>{bugInfo.bugFix}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
                {kind === "bug" && (
                    <Form.Item label='补充说明 :' name='commnt'>
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
                    <Form.Item noStyle name='tags' rules={[{required: true, message: "Tags必填"}]}>
                        <YakitSelect
                            wrapperClassName={styles["modify-select"]}
                            mode='tags'
                            maxTagCount={5}
                            allowClear
                            size='large'
                            onChange={(value: string[]) => onTagChange(value)}
                        >
                            <YakitSelect.Option value='教程'>教程</YakitSelect.Option>
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
            params: [],
            EnablePluginSelector: false,
            PluginSelectorTypes: "",
            content: ""
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
                setData({...getData(), params: getData().params.concat([data])})
            } else {
                const arr = getData().params.map((item) => {
                    if (item.value === paramModal.info?.value) {
                        return data
                    }
                    return item
                })
                setData({...getData(), params: [...arr]})
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
                        {data.params.length > 0 && (
                            <YakitButton type='text' onClick={() => onShowParamModal()}>
                                <OutlinePluscircleIcon />
                                添加参数
                            </YakitButton>
                        )}
                    </div>
                    {data.params.length === 0 && (
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
                        list={data?.params || []}
                        setList={(list) => setData({...data, params: list})}
                        onEdit={(index) => onShowParamModal(data.params[index])}
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
                                    checked={tags.includes(CodeGV.PluginYakDNSLogSwitch)}
                                    onChange={(check) => {
                                        if (check) {
                                            const arr = tags.concat([CodeGV.PluginYakDNSLogSwitch])
                                            setTags([...arr])
                                        } else {
                                            const arr = tags.filter((item) => item !== CodeGV.PluginYakDNSLogSwitch)
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
                                checked={tags.includes(CodeGV.PluginCodecHttpSwitch)}
                                onChange={(check) => {
                                    if (check) {
                                        const arr = tags.concat([CodeGV.PluginCodecHttpSwitch])
                                        setTags([...arr])
                                    } else {
                                        const arr = tags.filter((item) => item !== CodeGV.PluginCodecHttpSwitch)
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
    const userType = Form.useWatch("type", form)
    const userRequired = Form.useWatch("required", form)

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
        form.setFieldsValue({...form.getFieldsValue(), defaultValue: "", ExtraSetting: undefined})
        if (value === "select") form.setFieldsValue({...form.getFieldsValue(), ExtraSetting: {double: false, data: []}})
    })
    const onRequiredChange = useMemoizedFn((value: boolean) => {
        form.setFieldsValue({...form.getFieldsValue(), group: ""})
    })

    const onFinish = useMemoizedFn((values: PluginParamDataProps) => {
        const obj: PluginParamDataProps = {
            value: (values.value || "").trim(),
            label: (values.label ? values.label : values.value).trim(),
            required: !!values.required,
            type: values.type,
            defaultValue: (values.defaultValue || "").trim(),
            ExtraSetting: values.ExtraSetting || undefined,
            help: (values.help || "").trim(),
            group: (values.group || "").trim()
        }
        // 类型为下拉框时，对选项数据进行处理
        if (obj.type === "select" && obj.ExtraSetting) {
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
                        name='value'
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
                        name='label'
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
                    <Form.Item label='必要参数' name='required' valuePropName='checked'>
                        <YakitSwitch onChange={(value: boolean) => onRequiredChange(value)} />
                    </Form.Item>
                    <Form.Item label='参数类型' name='type' rules={[{required: true, message: "参数类型必填"}]}>
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
                            name='defaultValue'
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
                    <Form.Item label='参数帮助信息' name='help'>
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
                            name='group'
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
        arr[index].required = checked
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

    const onDragEnd = useMemoizedFn((result) => {
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
                                        <Draggable key={item.value} draggableId={item.value} index={index}>
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
                                                        key={item}
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
                                                                        TypeColors[typeToColor[item.type || ""]] as any
                                                                    }
                                                                >
                                                                    {item.type}
                                                                </YakitTag>
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    styles["name-style"],
                                                                    styles["text-style"],
                                                                    "yakit-content-single-ellipsis"
                                                                )}
                                                                title={`${item.label} / ${item.value}`}
                                                            >
                                                                {`${item.label} / ${item.value}`}
                                                            </div>
                                                            <div
                                                                className={classNames(
                                                                    styles["default-style"],
                                                                    styles["text-style"],
                                                                    "yakit-content-single-ellipsis"
                                                                )}
                                                                title={item.defaultValue || "-"}
                                                            >
                                                                {item.defaultValue || "-"}
                                                            </div>
                                                            <div className={classNames(styles["required-style"])}>
                                                                <YakitSwitch
                                                                    checked={item.required}
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
    const {} = props

    return (
        <div className={styles["plugin-edtior-diff-wrapper"]}>
            <div className={styles["edit-diff-title"]}>代码对比</div>
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
            <div></div>
        </div>
    )
})

/** ---------- 以下为对应关系字段和插件页面共用图标 ---------- */

/** 审核状态对应展示名称 */
export const aduitStatusToName: Record<string, string> = {
    "0": "待审核",
    "1": "已通过",
    "2": "未通过"
}
/** 个人插件状态对应展示名称 */
export const pluginStatusToName: Record<string, string> = {
    "1": "公开",
    "2": "私密"
}
/** 插件类型对应展示名称 */
export const pluginTypeToName: Record<
    string,
    {name: string; description: string; icon: ReactNode; color: string; content: string}
> = {
    yak: {
        name: "Yak 原生插件",
        description: "内置了众多网络安全常用库，可快速编写安全小工具，该原生模块只支持手动调用",
        icon: <SolidYakitPluginIcon />,
        color: "warning",
        content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n"
    },
    mitm: {
        name: "Yak-MITM 模块",
        description: "专用于 MITM 模块中的模块，编写 MITM 插件，可以轻松对经过的流量进行修改",
        icon: <SolidPluginYakMitmIcon />,
        color: "blue",
        content: MITMPluginTemplate
    },
    "port-scan": {
        name: "Yak-端口扫描",
        description: "该插件会对目标进行端口扫描，再对扫描的指纹结果做进一步的处理，常用场景先指纹识别，再 Poc 检测",
        icon: <SolidPluginProtScanIcon />,
        color: "success",
        content: PortScanPluginTemplate
    },
    codec: {
        name: "Yak-Codec",
        description: "Yakit 中的编解码模块，可以自定义实现所需要的编解码、加解密",
        icon: <SolidSparklesPluginIcon />,
        color: "purple",
        content: CodecPluginTemplate
    },
    lua: {
        name: "Lua 模块",
        description: "监修中，无法使用",
        icon: <SolidDocumentSearchPluginIcon />,
        color: "bluePurple",
        content: ""
    },
    nuclei: {
        name: "Nuclei YamI 模块",
        description: "使用 YakVM 构建了一个沙箱，可以兼容执行 Nuclei DSL ，无感使用 Nuclei 自带的 Yaml 模板",
        icon: <SolidCollectionPluginIcon />,
        color: "cyan",
        content: "# Add your nuclei formatted PoC!"
    }
}
/** 搜索过滤条件对应展示名称 */
export const filterToName: Record<string, string> = {
    type: "插件状态",
    tags: "TAG",
    plugin_type: "插件类型",
    status: "审核状态",
    group: "插件分组"
}

/** 审核状态标签 */
export const statusTag: {[key: string]: ReactNode} = {
    "0": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-failed"])}>
            <SolidBanIcon />
            {aduitStatusToName["0"]}
        </div>
    ),
    "1": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-pending"])}>
            <SolidFlagIcon />
            {aduitStatusToName["1"]}
        </div>
    ),
    "2": (
        <div className={classNames(styles["audit-status-tag"], styles["audit-status-tag-passed"])}>
            <SolidBadgecheckIcon />
            {aduitStatusToName["2"]}
        </div>
    )
}
