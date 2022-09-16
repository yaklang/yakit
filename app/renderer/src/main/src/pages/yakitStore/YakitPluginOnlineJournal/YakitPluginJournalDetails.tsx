import { FromLayoutProps, YakScriptFormContent, YakScriptLargeEditor } from "@/pages/invoker/YakScriptCreator"
import { Route } from "@/routes/routeSpec"
import { Button, Card, Checkbox, Form, Space, Spin, Tooltip } from "antd"
import React, { useEffect, useRef, useState } from "react"
import { useCreation, useGetState, useMemoizedFn } from "ahooks"
import './YakitPluginJournalDetails.scss'
import { YakScript } from "@/pages/invoker/schema"
import { FullscreenOutlined, QuestionCircleOutlined, FullscreenExitOutlined } from "@ant-design/icons"
import { showDrawer } from "@/utils/showModal"
import { YakEditor } from "@/utils/editors"
import { CodeComparison, DataCompare } from "@/pages/compare/DataCompare"
import { LineConversionIcon } from "@/assets/icons"
import { failed } from "@/utils/notification"
import { NetWorkApi } from "@/services/fetch"
import { API } from "@/services/swagger/resposeType"
import { onLocalScriptToOnlinePlugin } from "@/components/SyncCloudButton/SyncCloudButton"
import { useStore } from "@/store"

const { ipcRenderer } = window.require("electron")

interface YakitPluginJournalDetailsProps {
    YakitPluginJournalDetailsId: number
}

const defParams = {
    Content: "yakit.AutoInitYakit()\n\n# Input your code!\n\n",
    Tags: "",
    Author: "",
    Level: "",
    IsHistory: false,
    IsIgnore: false,
    CreatedAt: 0,
    Help: "",
    Id: 0,
    Params: [],
    ScriptName: "",
    Type: "yak",
    IsGeneralModule: false,
    PluginSelectorTypes: "mitm,port-scan",
    UserId: 0,
    OnlineId: 0,
    OnlineScriptName: "",
    OnlineContributors: "",
    GeneralModuleVerbose: "",
    GeneralModuleKey: "",
    FromGit: "",
    UUID: ""
}

interface SearchApplyUpdateDetailRequest {
    id: number
}

export const YakitPluginJournalDetails: React.FC<YakitPluginJournalDetailsProps> = (props) => {
    const defFromLayout = useCreation(() => {
        const col: FromLayoutProps = {
            labelCol: { span: 3 },
            wrapperCol: { span: 21 }
        }
        return col
    }, [])
    const { YakitPluginJournalDetailsId } = props;
    const [journalDetailsId, setJournalDetailsId] = useState<number>(0)
    const [fullscreen, setFullscreen] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const [journalDetails, setJournalDetails] = useState<API.ApplyPluginDetail>({
        plugin_user_id: 0,
        apply_user_id: 0,
        user_role: '',
        plugin_id: 0,
        up_plugin: { params: [] },
        merge_before_plugin: { params: [] },
        merge_status: 0,
        user_name: ''
    })
    const [params, setParams, getParams] = useGetState<YakScript>(defParams)
    const [originalCode, setOriginalCode,] = useState<string>("")
    const [modifiedCode, setModifiedCode,] = useState<string>("")
    const [disabled, setDisabled] = useState<boolean>(false)
    const { userInfo } = useStore()
    useEffect(() => {
        if (!YakitPluginJournalDetailsId) return
        setJournalDetailsId(YakitPluginJournalDetailsId)
        getJournalDetails(YakitPluginJournalDetailsId)
    }, [])
    const getJournalDetails = useMemoizedFn((id: number) => {
        setLoading(true)
        setOriginalCode("")
        setModifiedCode("")
        NetWorkApi<SearchApplyUpdateDetailRequest, API.ApplyPluginDetail>({
            method: "get",
            url: 'apply/update/detail',
            params: {
                id
            },
        }).then((res) => {
            let originalItem = res.merge_before_plugin || {} // 线上当前插件最新的数据
            let modifiedItem = res.up_plugin || {}// 提交人 提交的插件数据
            const localParams: YakScript = {
                Id: 0,
                Content: modifiedItem.content || '',
                Type: modifiedItem.type || '',
                Params: modifiedItem.params && modifiedItem.params.map(p => ({
                    Field: p.field || '',
                    DefaultValue: p.default_value || '',
                    TypeVerbose: p.type_verbose || '',
                    FieldVerbose: p.field_verbose || '',
                    Help: p.help || '',
                    // Value:p.value||'',
                    Required: p.required || false,
                    Group: p.group || '',
                    ExtraSetting: p.extra_setting || '',
                    BuildInParam: p.buildIn_param || false,
                })) || [],
                CreatedAt: 0,
                ScriptName: modifiedItem.script_name || '',
                Help: modifiedItem.help || '',
                Level: '',
                Author: modifiedItem.contributors || '',
                Tags: modifiedItem.tags && modifiedItem.tags !== "null" ? JSON.parse(modifiedItem.tags).join(",") : '',
                IsHistory: false,
                // IsIgnore:false,
                IsGeneralModule: modifiedItem.is_general_module,
                // GeneralModuleVerbose:modifiedItem.gen,
                // GeneralModuleKey:modifiedItem
                // FromGit:modifiedItem
                EnablePluginSelector: modifiedItem.enable_plugin_selector,
                PluginSelectorTypes: modifiedItem.plugin_selector_types,
                OnlineId: 0,
                OnlineScriptName: '',
                OnlineContributors: '',
                UserId: modifiedItem.user_id || 0,
                UUID: modifiedItem.uuid || '',
                OnlineIsPrivate: modifiedItem.is_private,
                // HeadImg: ''
            }
            setDisabled(!(res.plugin_user_id === userInfo.user_id && res.merge_status === 0))
            setJournalDetails(res)
            setParams(localParams)
            setOriginalCode(originalItem?.content || '')
            setModifiedCode(modifiedItem?.content || '')
        }).catch((err) => {
            failed("获取插件日志详情失败:" + err)
        })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    const onMergePlugin = useMemoizedFn((merge_plugin: boolean) => {
        const newParams = onLocalScriptToOnlinePlugin(params);
        const mergePlugin: API.MergePluginRequest = {
            ...newParams,
            id: journalDetailsId,
            content: modifiedCode,
            merge_plugin,
        }
        setLoading(true)
        NetWorkApi<API.MergePluginRequest, API.ActionSucceeded>({
            method: "post",
            url: 'merge/apply',
            data: mergePlugin,
        }).then((res) => {
            // 同意后刷新页面，重新获取最新的数据
            getJournalDetails(journalDetailsId)
        }).catch((err) => {
            failed("操作失败:" + err)
        })
            .finally(() => {
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            })
    })
    return (
        <div className="journal-details-body">
            <Spin spinning={loading}>
                <Card title="修改详情" bordered={false} bodyStyle={{ padding: '24px 12px' }} extra={`修改人:${journalDetails.user_name || '-'}`}>
                    <Form {...defFromLayout}>
                        <YakScriptFormContent disabled={disabled} params={params} setParams={setParams} modified={params} isShowAuthor={false} />
                        <Form.Item
                            label={"源码"}
                            help={
                                <>
                                    <Space>
                                        <Button
                                            icon={<FullscreenOutlined />}
                                            onClick={() => {
                                                setFullscreen(true)
                                                let m = showDrawer({
                                                    width: "100%",
                                                    closable: false,
                                                    keyboard: false,
                                                    content: (
                                                        <FullScreenCode
                                                            originalCode={originalCode}
                                                            setModifiedCode={setModifiedCode}
                                                            modifiedCode={modifiedCode}
                                                            onClose={() => { m.destroy(); setFullscreen(false) }}
                                                            readOnly={disabled}
                                                        />
                                                    )
                                                })
                                            }}
                                            type={"link"}
                                            style={{
                                                marginBottom: 12,
                                                marginTop: 6
                                            }}
                                        >
                                            大屏模式
                                        </Button>
                                        {!["packet-hack", "codec", "nuclei"].includes(params.Type) && (
                                            <Checkbox
                                                name={"默认启动"}
                                                style={{
                                                    marginBottom: 12,
                                                    marginTop: 6
                                                }}
                                                checked={params.IsGeneralModule}
                                                onChange={() =>
                                                    setParams({
                                                        ...params,
                                                        IsGeneralModule: !params.IsGeneralModule
                                                    })
                                                }
                                                disabled={disabled}
                                            >
                                                默认启动{" "}
                                                <Tooltip
                                                    title={
                                                        "设置默认启动后，将在恰当时候启动该插件(Yak插件不会自动启动，但会自动增加在左侧基础安全工具菜单栏)"
                                                    }
                                                >
                                                    <Button type={"link"} icon={<QuestionCircleOutlined />} />
                                                </Tooltip>
                                            </Checkbox>
                                        )}
                                    </Space>
                                </>
                            }
                        >
                            {
                                !fullscreen && originalCode && modifiedCode &&
                                <CodeComparisonDiff
                                    originalCode={originalCode}
                                    setRightCode={setModifiedCode}
                                    rightCode={modifiedCode}
                                    readOnly={disabled}
                                    className="yak-editor-content"
                                />
                            }
                        </Form.Item>
                        {
                            !disabled &&
                            <Form.Item colon={false} label={" "}>
                                <Space>
                                    <Button type='primary' danger onClick={() => onMergePlugin(false)} >
                                        拒绝
                                    </Button>
                                    <Button type='primary' onClick={() => onMergePlugin(true)} >
                                        同意
                                    </Button>
                                </Space>
                            </Form.Item>
                        }
                    </Form>
                </Card>
            </Spin>
        </div>
    )
}

interface FullScreenCodeProps {
    originalCode: string
    setModifiedCode: (s: string) => void
    modifiedCode: string
    onClose: () => void
    readOnly: boolean
}


const FullScreenCode: React.FC<FullScreenCodeProps> = (props) => {
    const { originalCode, setModifiedCode, modifiedCode, onClose, readOnly } = props;
    const [noWrap, setNoWrap] = useState<boolean>(false)
    const [rightCode, setRightCode] = useState<string>(modifiedCode)
    const fullCodeComparisonRef = useRef<any>(null)
    useEffect(() => {
        setRightCode(modifiedCode)
    }, [modifiedCode])
    return (
        <Card
            bordered={false}
            title="数据对比"
            extra={
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<FullscreenExitOutlined style={{ fontSize: 20 }} />}
                        onClick={() => onClose()}
                    />
                    <Button
                        size={"small"}
                        type={!noWrap ? "primary" : "link"}
                        icon={<LineConversionIcon />}
                        onClick={() => {
                            fullCodeComparisonRef.current?.onChangeLineConversion()
                        }}
                    />
                </Space>
            }
            style={{ height: 'calc(100% - 48px)' }}
            bodyStyle={{ height: '100%', padding: 0 }}
        >
            <CodeComparisonDiff
                fullCodeComparisonRef={fullCodeComparisonRef}
                originalCode={originalCode}
                noWrap={noWrap}
                setNoWrap={setNoWrap}
                setRightCode={(c) => {
                    if (setRightCode) setRightCode(c)
                    if (setModifiedCode) setModifiedCode(c)
                }}
                rightCode={rightCode}
                readOnly={readOnly}
            />
        </Card>
    )
}

interface CodeComparisonDiffProps {
    fullCodeComparisonRef?: any
    originalCode: string
    readOnly: boolean
    noWrap?: boolean
    setNoWrap?: (b: boolean) => void
    rightCode: string
    setRightCode?: (s: string) => void
    className?: string
}

export const CodeComparisonDiff: React.FC<CodeComparisonDiffProps> = (props) => {
    const { fullCodeComparisonRef, noWrap, setNoWrap, originalCode, setRightCode, rightCode, readOnly, className = '' } = props;
    return <div className={`code-comparison-diff ${className}`}>
        <div className="yak-editor-tip">
            <div>插件源码</div>
            <div>申请人提交源码</div>
        </div>
        <div className="yak-editor-full-item">
            <CodeComparison
                ref={fullCodeComparisonRef}
                noWrap={noWrap}
                setNoWrap={(e) => { if (setNoWrap) setNoWrap(e) }}
                leftCode={originalCode}
                setRightCode={setRightCode}
                rightCode={rightCode}
                originalEditable={false}
                readOnly={readOnly}
            />
        </div>
    </div>
}