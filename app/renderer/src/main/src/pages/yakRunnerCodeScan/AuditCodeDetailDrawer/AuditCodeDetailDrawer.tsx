import React, {useEffect, useMemo, useRef, useState} from "react"
import {} from "antd"
import {} from "@ant-design/icons"
import {useGetState, useMap, useMemoizedFn} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./AuditCodeDetailDrawer.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {SyntaxFlowResult} from "../YakRunnerCodeScanType"
import {YakitDrawer} from "@/components/yakitUI/YakitDrawer/YakitDrawer"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {OutlineLightbulbIcon, OutlineTerminalIcon} from "@/assets/icon/outline"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {v4 as uuidv4} from "uuid"
import {AuditNodeMapProps, AuditNodeProps, AuditYakUrlProps} from "@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType"
import {loadAuditFromYakURLRaw} from "@/pages/yakRunnerAuditCode/utils"
import {AuditTree} from "@/pages/yakRunnerAuditCode/AuditCode/AuditCode"
import {AuditEmiterYakUrlProps} from "@/pages/yakRunnerAuditCode/YakRunnerAuditCodeType"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {RightAuditDetail} from "@/pages/yakRunnerAuditCode/RightAuditDetail/RightAuditDetail"
import {Risk} from "@/pages/risks/schema"
import {RightBugAuditResult} from "@/pages/risks/YakitRiskTable/YakitRiskTable"
import {addToTab} from "@/pages/MainTabs"
import {YakitRoute} from "@/enums/yakitRoute"
import emiter from "@/utils/eventBus/eventBus"
import {AuditCodePageInfoProps} from "@/store/pageInfo"
const {ipcRenderer} = window.require("electron")
export interface AuditCodeDetailDrawerProps {
    rowData: SyntaxFlowResult
    visible: boolean
    setVisible: (b: boolean) => void
}

const TopId = "top-message-code-scan"

export const AuditCodeDetailDrawer: React.FC<AuditCodeDetailDrawerProps> = (props) => {
    const {rowData, visible, setVisible} = props

    const [value, setValue] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowEmpty, setShowEmpty] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = React.useState<string[]>([])
    const [foucsedKey, setFoucsedKey] = React.useState<string>("")

    const [refreshTree, setRefreshTree] = useState<boolean>(false)

    const [auditMap, {set: setAuditMap, get: getAuditMap, reset: resetAuditMap}] = useMap<string, AuditNodeMapProps>()
    const getMapAuditDetail = (id: string): AuditNodeMapProps => {
        return (
            getAuditMap(id) || {
                parent: null,
                name: "读取失败",
                isLeaf: true,
                id: `${uuidv4()}-fail`,
                ResourceType: "",
                VerboseType: "",
                Size: 0,
                Extra: []
            }
        )
    }

    const [auditChildMap, {set: setAuditChildMap, get: getAuditChildMap, reset: resetAuditChildMap}] = useMap<
        string,
        string[]
    >()
    const getMapAuditChildDetail = (id: string) => {
        return getAuditChildMap(id) || []
    }

    const onClose = useMemoizedFn(() => {
        setVisible(false)
    })

    const initAuditTree = useMemoizedFn((ids: string[], depth: number) => {
        return ids.map((id) => {
            const itemDetail = getMapAuditDetail(id)
            let obj: AuditNodeProps = {...itemDetail, depth}
            const childArr = getMapAuditChildDetail(id)

            if (itemDetail.ResourceType === "variable" || itemDetail.ResourceType === TopId) {
                obj.children = initAuditTree(childArr, depth + 1)
                // 数量为0时不展开 message除外
                if (parseInt(obj.Size + "") === 0 && itemDetail.ResourceType !== TopId) {
                    obj.isLeaf = true
                } else {
                    obj.isLeaf = false
                }
            } else {
                obj.isLeaf = true
            }

            return obj
        })
    })

    const auditDetailTree = useMemo(() => {
        const ids: string[] = getMapAuditChildDetail("/")
        const initTree = initAuditTree(ids, 1)
        // 归类排序
        const initTreeLeaf = initTree.filter((item) => item.isLeaf)
        const initTreeNoLeaf = initTree.filter((item) => !item.isLeaf)
        const newInitTree = [...initTreeNoLeaf, ...initTreeLeaf]
        if (newInitTree.length > 0) {
            newInitTree.push({
                parent: null,
                name: "已经到底啦~",
                id: "111",
                depth: 1,
                isBottom: true,
                Extra: [],
                ResourceType: "",
                VerboseType: "",
                Size: 0
            })
        }
        return newInitTree
    }, [refreshTree])

    const handleAuditLoadData = useMemoizedFn((id: string) => {
        return new Promise(async (resolve, reject) => {
            // 校验其子项是否存在
            const childArr = getMapAuditChildDetail(id)
            if (id === TopId) {
                resolve("")
                return
            }
            if (childArr.length > 0) {
                setRefreshTree(!refreshTree)
                resolve("")
            } else {
                const path = id
                const params: AuditYakUrlProps = {
                    Schema: "syntaxflow",
                    ProgramName: rowData.ProgramName,
                    Path: path,
                    Query: [{Key: "result_id", Value: rowData.ResultID}]
                }
                const result = await loadAuditFromYakURLRaw(params)
                if (result) {
                    let variableIds: string[] = []
                    result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                        const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                        let value: string = `${index}`
                        const arr = Extra.filter((item) => item.Key === "index")
                        if (arr.length > 0) {
                            value = arr[0].Value
                        }
                        const newId = `${id}/${value}`
                        variableIds.push(newId)
                        setAuditMap(newId, {
                            parent: path,
                            id: newId,
                            name: ResourceName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    })
                    setAuditChildMap(path, variableIds)
                    setTimeout(() => {
                        setRefreshTree(!refreshTree)
                        resolve("")
                    }, 300)
                } else {
                    reject()
                }
            }
        })
    })

    const onLoadData = useMemoizedFn((node: AuditNodeProps) => {
        if (node.parent === null) return Promise.reject()
        if (handleAuditLoadData) return handleAuditLoadData(node.id)
        return Promise.reject()
    })

    const resetMap = useMemoizedFn(() => {
        // 清除上次数据
        resetAuditChildMap()
        resetAuditMap()
        setExpandedKeys([])
    })

    const onSubmit = useMemoizedFn(async () => {
        try {
            resetMap()
            setLoading(true)
            setShowEmpty(false)
            const path: string = "/"
            const params: AuditYakUrlProps = {
                Schema: "syntaxflow",
                ProgramName: rowData.ProgramName,
                Path: "/",
                Query: [{Key: "result_id", Value: rowData.ResultID}]
            }
            const result = await loadAuditFromYakURLRaw(params)

            if (result && result.Resources.length > 0) {
                let messageIds: string[] = []
                let variableIds: string[] = []
                // 构造树结构
                result.Resources.filter((item) => item.VerboseType !== "result_id").forEach((item, index) => {
                    const {ResourceType, VerboseType, VerboseName, ResourceName, Size, Extra} = item
                    // 警告信息（置顶显示）前端收集折叠
                    if (ResourceType === "message") {
                        const id = `${TopId}${path}${VerboseName}-${index}`
                        messageIds.push(id)
                        setAuditMap(id, {
                            parent: path,
                            id,
                            name: VerboseName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    }
                    // 变量
                    if (ResourceType === "variable") {
                        const id = `${path}${ResourceName}`
                        variableIds.push(id)
                        setAuditMap(id, {
                            parent: path,
                            id,
                            name: ResourceName,
                            ResourceType,
                            VerboseType,
                            Size,
                            Extra
                        })
                    }
                })
                let topIds: string[] = []
                if (messageIds.length > 0) {
                    topIds.push(TopId)
                    setAuditMap(TopId, {
                        parent: path,
                        id: TopId,
                        name: "message",
                        ResourceType: TopId,
                        VerboseType: "",
                        Size: 0,
                        Extra: []
                    })
                    setAuditChildMap(TopId, messageIds)
                }
                setAuditChildMap("/", [...topIds, ...variableIds])
                setRefreshTree(!refreshTree)
            } else {
                setShowEmpty(true)
            }
            setLoading(false)
        } catch (error: any) {
            failed(`${error}`)
            setShowEmpty(true)
            setLoading(false)
        }
    })

    useEffect(() => {
        onSubmit()
    }, [rowData])

    const [auditRightParams, setAuditRightParams] = useState<AuditEmiterYakUrlProps>()
    const [isShowAuditDetail, setShowAuditDetail] = useState<boolean>(false)

    const [bugHash, setBugHash] = useState<string>()
    const [bugId, setBugId] = useState<string>()
    const onJump = useMemoizedFn((node: AuditNodeProps) => {
        // 预留打开BUG详情
        if (node.ResourceType === "variable" && node.VerboseType === "alert") {
            try {
                const arr = node.Extra.filter((item) => item.Key === "risk_hash")
                if (arr.length > 0) {
                    const hash = arr[0].Value
                    setBugHash(hash)
                    setShowAuditDetail(true)
                    setBugId(node.id)
                }
            } catch (error) {
                failed(`打开错误${error}`)
            }
        }
        if (node.ResourceType === "value") {
            setBugId(undefined)
            setFoucsedKey(node.id)
            const rightParams: AuditEmiterYakUrlProps = {
                Schema: "syntaxflow",
                Location: rowData.ProgramName,
                Path: node.id,
                Query: [{Key: "result_id", Value: rowData.ResultID}]
            }
            setAuditRightParams(rightParams)
            setShowAuditDetail(true)
        }
    })

    // 跳转到代码审计页面
    const jumpCodeScanPage = useMemoizedFn(() => {
        // 跳转到审计页面的参数
        const params: AuditCodePageInfoProps = {
            Schema: "syntaxflow",
            Location: rowData.ProgramName,
            Path: `/`,
            Query: [{Key: "result_id", Value: rowData.ResultID}]
        }
        emiter.emit(
            "openPage",
            JSON.stringify({
                route: YakitRoute.YakRunner_Audit_Code,
                params
            })
        )
        onClose()
    })
    return (
        <YakitDrawer
            visible={visible}
            onClose={onClose}
            width='80%'
            title='审计详情'
            extra={
                <YakitButton icon={<OutlineTerminalIcon />} type='outline2' onClick={() => jumpCodeScanPage()}>
                    在代码审计中打开
                </YakitButton>
            }
            bodyStyle={{overflow: "hidden", padding: 0}}
        >
            <>
                <YakitResizeBox
                    firstRatio='300px'
                    firstMinSize={300}
                    secondMinSize={180}
                    firstNodeStyle={{padding: 0}}
                    secondNodeStyle={{padding: 0}}
                    firstNode={
                        <div className={styles["audit-code-detail-drawer"]}>
                            <div className={styles["header"]}>
                                <div className={styles["title-box"]}>
                                    <div className={styles["title"]}>{rowData.Title}</div>

                                    <div className={styles["advice-icon"]}>
                                        <OutlineLightbulbIcon />
                                    </div>
                                </div>
                                {rowData.Description && (
                                    <div className={styles["description"]}>{rowData.Description}</div>
                                )}
                            </div>
                            {isShowEmpty ? (
                                <div className={styles["no-data"]}>暂无数据</div>
                            ) : (
                                <AuditTree
                                    data={auditDetailTree}
                                    expandedKeys={expandedKeys}
                                    setExpandedKeys={setExpandedKeys}
                                    onLoadData={onLoadData}
                                    foucsedKey={foucsedKey}
                                    setFoucsedKey={setFoucsedKey}
                                    onJump={onJump}
                                    onlyJump={true}
                                    wrapClassName={styles["audit-tree-wrap"]}
                                    bugId={bugId}
                                />
                            )}
                        </div>
                    }
                    secondNode={
                        <>
                            {isShowAuditDetail ? (
                                <>
                                    {bugId && bugHash ? (
                                        <HoleBugDetail bugHash={bugHash} />
                                    ) : (
                                        <RightAuditDetail
                                            auditRightParams={auditRightParams}
                                            isShowAuditDetail={isShowAuditDetail}
                                            setShowAuditDetail={setShowAuditDetail}
                                        />
                                    )}
                                </>
                            ) : (
                                <div className={styles["no-audit"]}>
                                    <YakitEmpty title='暂无数据' description='请选择左边内容' />
                                </div>
                            )}
                        </>
                    }
                />
            </>
        </YakitDrawer>
    )
}

interface HoleBugDetailProps {
    bugHash: string
}

export const HoleBugDetail: React.FC<HoleBugDetailProps> = React.memo((props) => {
    const {bugHash} = props
    const [info, setInfo] = useState<Risk>()
    useEffect(() => {
        ipcRenderer
            .invoke("QueryRisk", {Hash: bugHash})
            .then((res: Risk) => {
                if (!res) return
                setInfo(res)
            })
            .catch((err) => {})
    }, [bugHash])
    return <>{info && <RightBugAuditResult info={info} columnSize={1} />}</>
})
