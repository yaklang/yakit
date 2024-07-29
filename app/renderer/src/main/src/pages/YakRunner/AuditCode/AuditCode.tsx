import React, {memo, useEffect, useMemo, useRef, useState} from "react"
import {AuditCodeProps, AuditNodeProps, AuditTreeNodeProps, AuditTreeProps, AuditYakUrlProps} from "./AuditCodeType"
import classNames from "classnames"
import styles from "./AuditCode.module.scss"
import {YakScript} from "@/pages/invoker/schema"
import {Form, FormInstance, Tree} from "antd"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {ExtraParamsNodeByType} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/PluginExecuteExtraParams"
import {ExecuteEnterNodeByPluginParams} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeard"
import {YakParamProps} from "@/pages/plugins/pluginsType"
import {
    getValueByType,
    getYakExecutorParam,
    onCodeToInfo,
    ParamsToGroupByGroupName
} from "@/pages/plugins/editDetails/utils"
import {useDebounceFn, useInViewport, useMemoizedFn, useSize} from "ahooks"
import {grpcFetchLocalPluginDetail} from "@/pages/pluginHub/utils/grpc"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {yakitNotify} from "@/utils/notification"
import {randomString} from "@/utils/randomUtil"
import {CustomPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/LocalPluginExecuteDetailHeardType"
import {defPluginExecuteFormValue} from "@/pages/plugins/operator/localPluginExecuteDetailHeard/constants"
import useStore from "../hooks/useStore"
import {getNameByPath, loadAuditFromYakURLRaw} from "../utils"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OutlinCompileIcon, OutlineChevronrightIcon} from "@/assets/icon/outline"
import emiter from "@/utils/eventBus/eventBus"
import {YakitTextArea} from "@/components/yakitUI/YakitTextArea/YakitTextArea"
import {LoadingOutlined} from "@ant-design/icons"
import { StringToUint8Array } from "@/utils/str"

const {ipcRenderer} = window.require("electron")

export const AuditTreeNode: React.FC<AuditTreeNodeProps> = memo((props) => {
    const {info, foucsedKey, setFoucsedKey, onSelected, onExpanded, expandedKeys} = props

    const handleSelect = useMemoizedFn(() => {
        onSelected(true, info)
    })

    const isExpanded = useMemo(() => {
        return expandedKeys.includes(info.id)
    }, [expandedKeys, info.id])

    const handleExpand = useMemoizedFn(() => {
        onExpanded(isExpanded, info)
    })

    const handleClick = useMemoizedFn(() => {
        if (info.isLeaf) {
            handleSelect()
        } else {
            handleExpand()
        }
    })

    const isFoucsed = useMemo(() => {
        return foucsedKey === info.id
    }, [foucsedKey, info.id])
    return (
        <>
            {info.isBottom ? (
                <div className={styles["tree-bottom"]}>{info.name}</div>
            ) : (
                <div
                    className={classNames(styles["audit-tree-node"], {
                        [styles["node-foucsed"]]: isFoucsed
                    })}
                    style={{paddingLeft: (info.depth - 1) * 16 + 8}}
                    onClick={handleClick}
                >
                    {!info.isLeaf && (
                        <div className={classNames(styles["node-switcher"], {[styles["expanded"]]: isExpanded})}>
                            <OutlineChevronrightIcon />
                        </div>
                    )}

                    <div className={styles["node-loading"]}>
                        <LoadingOutlined />
                    </div>

                    <div className={styles["node-content"]}>
                        <div className={styles["content-icon"]}>{/* <img src={iconImage} /> */}</div>
                        <div
                            className={classNames(styles["content-body"], "yakit-content-single-ellipsis")}
                            title={info.name}
                        >
                            {info.name}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
})

export const AuditTree: React.FC<AuditTreeProps> = memo((props) => {
    const {data, expandedKeys, onLoadData, foucsedKey, setFoucsedKey} = props
    const treeRef = useRef<any>(null)
    const wrapper = useRef<HTMLDivElement>(null)
    const [inViewport] = useInViewport(wrapper)
    const size = useSize(wrapper)

    const handleSelect = useMemoizedFn((selected: boolean, node: any) => {})

    const handleExpand = useMemoizedFn((expanded: boolean, node: any) => {})

    return (
        <div ref={wrapper} className={styles["audit-tree"]}>
            <Tree
                ref={treeRef}
                height={size?.height}
                fieldNames={{title: "name", key: "path", children: "children"}}
                treeData={data}
                blockNode={true}
                switcherIcon={<></>}
                multiple={true}
                expandedKeys={expandedKeys}
                loadData={onLoadData}
                // 解决重复打开一个节点时 能加载
                loadedKeys={[]}
                titleRender={(nodeData) => {
                    return (
                        <AuditTreeNode
                            info={nodeData}
                            foucsedKey={foucsedKey}
                            expandedKeys={expandedKeys}
                            onSelected={handleSelect}
                            onExpanded={handleExpand}
                            setFoucsedKey={setFoucsedKey}
                        />
                    )
                }}
            />
        </div>
    )
})

export const AuditCode: React.FC<AuditCodeProps> = (props) => {
    const [value, setValue] = useState<string>("")
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")

    useEffect(() => {
        // console.log("我是audit-code")
    }, [])

    const initAuditTree = useMemoizedFn((data: any[], depth: number) => {
        return []
    })

    const auditDetailTree = useMemo(() => {
        const initTree: AuditNodeProps[] = []
        // initAuditTree(fileTree, 1)
        if (initTree.length > 0) {
            initTree.push({
                parent: null,
                name: "已经到底啦~",
                id: "111",
                depth: 1,
                isBottom: true
            })
        }
        return initTree
    }, [])

    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise((resolve, reject) => {
            resolve("")
            // // 校验其子项是否存在
            // const childArr = getMapFolderDetail(path)
            // if (childArr.length > 0) {
            //     emiter.emit("onRefreshFileTree")
            //     resolve("")
            // } else {
            //     handleFetchFileList(path, (value) => {
            //         if (value.length > 0) {
            //             let childArr: string[] = []
            //             value.forEach((item) => {
            //                 // 注入文件结构Map
            //                 childArr.push(item.path)
            //                 // 文件Map
            //                 setMapFileDetail(item.path, item)
            //             })
            //             setMapFolderDetail(path, childArr)
            //             setTimeout(() => {
            //                 emiter.emit("onRefreshFileTree")
            //                 resolve("")
            //             }, 300)
            //         } else {
            //             reject()
            //         }
            //     })
            // }
        })
    })

    const onLoadData = useMemoizedFn((node: AuditNodeProps) => {
        if (node.parent === null) return Promise.reject()
        if (handleAuditLoadData) return handleAuditLoadData(node.id)
        return Promise.reject()
    })

    const onSubmit = useMemoizedFn(async() => {
        const params:AuditYakUrlProps = {
            FromRaw: "syntaxflow://program_id/variable/index",
            Schema: "syntaxflow",
            Location: "xxe",
            Path: "/",
        }
        const body = StringToUint8Array(value)
        const result = await loadAuditFromYakURLRaw(params,body)
        console.log("result---",result);
        
    })

    return (
        <div className={styles["audit-code"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>代码审计</div>
            </div>
            <div className={styles["textarea-box"]}>
                <YakitTextArea
                    textAreaSize='small'
                    value={value}
                    setValue={setValue}
                    isLimit={false}
                    onSubmit={onSubmit}
                    submitTxt={"开始审计"}
                    rows={1}
                    isAlwaysShow={true}
                    placeholder='请输入审计规则...'
                />
            </div>

            <AuditTree
                data={auditDetailTree}
                expandedKeys={expandedKeys}
                setExpandedKeys={setExpandedKeys}
                onLoadData={onLoadData}
                foucsedKey={foucsedKey}
                setFoucsedKey={setFoucsedKey}
            />

            {/* <div className={styles["no-audit"]}>
                <YakitEmpty
                    title='请先编译项目'
                    description='需要编译过的项目，才可使用代码审计功能'
                    children={
                        <YakitButton
                            type='outline1'
                            icon={<OutlinCompileIcon />}
                            onClick={() => emiter.emit("onOpenAuditModal", "init")}
                        >
                            编译当前项目
                        </YakitButton>
                    }
                />
            </div> */}
        </div>
    )
}

interface AuditModalFormProps {
    onCancle: () => void
    isInitDefault: boolean
}

export const AuditModalForm: React.FC<AuditModalFormProps> = (props) => {
    const {onCancle, isInitDefault} = props
    const {fileTree} = useStore()
    const tokenRef = useRef<string>(randomString(40))
    const [loading, setLoading] = useState<boolean>(true)
    const [runtimeId, setRuntimeId] = useState<string>("")
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            setTimeout(() => setIsExecuting(false), 300)
        },
        setRuntimeId: (rId) => {
            yakitNotify("info", `调试任务启动成功，运行时 ID: ${rId}`)
            setRuntimeId(rId)
        }
    })

    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useState<boolean>(false)
    const [plugin, setPlugin] = useState<YakScript>()
    const [form] = Form.useForm()

    // 获取参数
    const handleFetchParams = useDebounceFn(
        useMemoizedFn(async () => {
            const newPlugin = await grpcFetchLocalPluginDetail({Name: "YakSSA项目编译"}, true)
            console.log("xxx", newPlugin)
            setLoading(false)
            setPlugin(newPlugin)
        }),
        {wait: 300}
    ).run

    useEffect(() => {
        handleFetchParams()
    }, [])

    // 必要参数
    const requiredParams = useMemo(() => {
        return plugin?.Params.filter((item) => !!item.Required) || []
    }, [plugin?.Params])

    // 设置默认值
    const initRequiredFormValue = useMemoizedFn(async () => {
        let ProjectPath = ""
        let ProjectName = ""
        if (fileTree.length > 0) {
            ProjectPath = fileTree[0].path
            ProjectName = await getNameByPath(ProjectPath)
        }
        // 必填参数
        let initRequiredFormValue: CustomPluginExecuteFormValue = {...defPluginExecuteFormValue}
        requiredParams.forEach((ele) => {
            const value = getValueByType(ele.DefaultValue, ele.TypeVerbose)
            if (ele.Field === "ProjectName") {
                initRequiredFormValue = {
                    ...initRequiredFormValue,
                    [ele.Field]: ProjectName
                }
                return
            }
            if (ele.Field === "ProjectPath") {
                initRequiredFormValue = {
                    ...initRequiredFormValue,
                    [ele.Field]: ProjectPath
                }
                return
            }
            initRequiredFormValue = {
                ...initRequiredFormValue,
                [ele.Field]: value
            }
        })
        console.log("cccc", initRequiredFormValue)

        form.setFieldsValue({...initRequiredFormValue})
    })

    useEffect(() => {
        if (plugin?.Params && isInitDefault) {
            initRequiredFormValue()
        }
    }, [plugin?.Params, isInitDefault])

    /** 选填参数 */
    const groupParams = useMemo(() => {
        const arr = plugin?.Params.filter((item) => !item.Required) || []
        return ParamsToGroupByGroupName(arr)
    }, [plugin?.Params])

    const onStartExecute = useMemoizedFn(() => {
        if (form && plugin) {
            form.validateFields()
                .then(async (value: any) => {
                    const requestParams: DebugPluginRequest = {
                        Code: plugin.Content,
                        PluginType: "yak",
                        Input: value["Input"] || "",
                        HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
                        ExecParams: [],
                        PluginName: ""
                    }

                    const request: Record<string, any> = {}
                    for (let el of plugin?.Params || []) request[el.Field] = value[el.Field] || undefined
                    requestParams.ExecParams = getYakExecutorParam({...value})

                    debugPluginStreamEvent.reset()
                    setRuntimeId("")

                    console.log("执行:", plugin, value, requestParams)
                    // apiDebugPlugin(requestParams, tokenRef.current).then(() => {
                    //     setIsExecuting(true)
                    //     debugPluginStreamEvent.start()
                    // })
                })
                .catch(() => {})
        }
    })

    return (
        <YakitSpin spinning={loading}>
            <Form
                style={{padding: 16}}
                form={form}
                onFinish={() => {}}
                size='small'
                labelCol={{span: 8}}
                wrapperCol={{span: 16}}
                labelWrap={true}
                validateMessages={{
                    /* eslint-disable no-template-curly-in-string */
                    required: "${label} 是必填字段"
                }}
            >
                <div className={styles["custom-params-wrapper"]}>
                    <ExecuteEnterNodeByPluginParams
                        paramsList={requiredParams}
                        pluginType={"yak"}
                        isExecuting={isExecuting}
                    />
                </div>
                {groupParams.length > 0 ? (
                    <>
                        <div className={styles["additional-params-divider"]}>
                            <div className={styles["text-style"]}>额外参数 (非必填)</div>
                            <div className={styles["divider-style"]}></div>
                        </div>
                        <ExtraParamsNodeByType extraParamsGroup={groupParams} pluginType={"yak"} />
                    </>
                ) : null}
            </Form>
            <div className={styles["audit-form-footer"]}>
                <YakitButton type='outline2' onClick={onCancle}>
                    取消
                </YakitButton>
                <YakitButton onClick={onStartExecute}>开始编译</YakitButton>
            </div>
        </YakitSpin>
    )
}
