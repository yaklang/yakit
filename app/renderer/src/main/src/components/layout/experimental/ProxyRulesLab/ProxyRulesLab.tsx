import React, {useEffect, useMemo, useState} from "react"
import {Divider, Modal, Spin} from "antd"
import classNames from "classnames"
import {useMemoizedFn} from "ahooks"

import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {
    GlobalProxyRulesConfig,
    ProxyEndpoint,
    ProxyRoute,
    grpcGetGlobalProxyRulesConfig,
    grpcSetGlobalProxyRulesConfig
} from "@/apiUtils/grpc"
import {randomString} from "@/utils/randomUtil"
import {success, warn, yakitFailed} from "@/utils/notification"

import styles from "./ProxyRulesLab.module.scss"

interface ProxyRulesLabProps {
    onClose?: () => void
}

interface EditableProxyEndpoint extends ProxyEndpoint {}
interface EditableProxyRoute extends ProxyRoute {}

const normalizeEndpoint = (endpoint: EditableProxyEndpoint): EditableProxyEndpoint => ({
    Id: endpoint.Id,
    Name: (endpoint.Name || "").trim(),
    Url: (endpoint.Url || "").trim()
})

const normalizeRoute = (route: EditableProxyRoute): EditableProxyRoute => ({
    Id: route.Id,
    Name: (route.Name || "").trim(),
    Patterns: Array.from(
        new Set((route.Patterns || []).map((item) => item.trim()).filter((item) => item.length > 0))
    ),
    EndpointIds: Array.from(new Set((route.EndpointIds || []).filter((item) => item && item.length > 0)))
})

const serializeState = (endpoints: EditableProxyEndpoint[], routes: EditableProxyRoute[]) => {
    const normalizedEndpoints = endpoints.map(normalizeEndpoint).sort((a, b) => a.Id.localeCompare(b.Id))
    const normalizedRoutes = routes
        .map((route) => {
            const normalized = normalizeRoute(route)
            normalized.Patterns.sort((a, b) => a.localeCompare(b))
            normalized.EndpointIds.sort((a, b) => a.localeCompare(b))
            return normalized
        })
        .sort((a, b) => a.Id.localeCompare(b.Id))
    return JSON.stringify({endpoints: normalizedEndpoints, routes: normalizedRoutes})
}

const generateEndpointId = () => `ep-${randomString(8)}`
const generateRouteId = () => `route-${randomString(8)}`

const ProxyRulesLab: React.FC<ProxyRulesLabProps> = ({onClose}) => {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [endpoints, setEndpoints] = useState<EditableProxyEndpoint[]>([])
    const [routes, setRoutes] = useState<EditableProxyRoute[]>([])
    const [snapshot, setSnapshot] = useState<string>("")

    const fetchConfig = useMemoizedFn((silent?: boolean) => {
        if (!silent) {
            setLoading(true)
        }
        grpcGetGlobalProxyRulesConfig(false)
            .then((config) => {
                const eps = (config?.Endpoints || []).map((item) => ({
                    Id: item.Id || generateEndpointId(),
                    Name: item.Name || "",
                    Url: item.Url || ""
                }))
                const rts = (config?.Routes || []).map((item) => ({
                    Id: item.Id || generateRouteId(),
                    Name: item.Name || "",
                    Patterns: item.Patterns || [],
                    EndpointIds: item.EndpointIds || []
                }))
                setEndpoints(eps)
                setRoutes(rts)
                setSnapshot(serializeState(eps, rts))
            })
            .catch((err) => {
                yakitFailed(`获取代理规则失败: ${err}`)
            })
            .finally(() => {
                if (!silent) {
                    setLoading(false)
                }
            })
    })

    useEffect(() => {
        fetchConfig()
    }, [])

    const currentSignature = useMemo(() => serializeState(endpoints, routes), [endpoints, routes])
    const isDirty = useMemo(() => currentSignature !== snapshot, [currentSignature, snapshot])

    const endpointOptions = useMemo(
        () =>
            endpoints.map((item) => ({
                label: item.Name || item.Url || item.Id,
                value: item.Id
            })),
        [endpoints]
    )

    const onAddEndpoint = useMemoizedFn(() => {
        const id = generateEndpointId()
        setEndpoints((prev) => [...prev, {Id: id, Name: "", Url: ""}])
    })

    const onUpdateEndpoint = useMemoizedFn((id: string, patch: Partial<EditableProxyEndpoint>) => {
        setEndpoints((prev) => prev.map((item) => (item.Id === id ? {...item, ...patch} : item)))
    })

    const deleteEndpointDirectly = useMemoizedFn((id: string) => {
        setEndpoints((prev) => prev.filter((item) => item.Id !== id))
        setRoutes((prev) =>
            prev.map((route) => ({
                ...route,
                EndpointIds: (route.EndpointIds || []).filter((item) => item !== id)
            }))
        )
    })

    const onRemoveEndpoint = useMemoizedFn((id: string) => {
        const relatedRoutes = routes.filter((route) => (route.EndpointIds || []).includes(id))
        if (relatedRoutes.length === 0) {
            deleteEndpointDirectly(id)
            return
        }
        Modal.confirm({
            title: "删除代理节点",
            content: `该节点仍被 ${relatedRoutes.length} 条规则引用，删除后会同时从这些规则中移除。是否继续？`,
            okText: "删除",
            cancelText: "取消",
            centered: true,
            onOk: () => {
                deleteEndpointDirectly(id)
            }
        })
    })

    const onAddRoute = useMemoizedFn(() => {
        const id = generateRouteId()
        setRoutes((prev) => [...prev, {Id: id, Name: "", Patterns: [], EndpointIds: []}])
    })

    const onUpdateRoute = useMemoizedFn((id: string, patch: Partial<EditableProxyRoute>) => {
        setRoutes((prev) => prev.map((item) => (item.Id === id ? {...item, ...patch} : item)))
    })

    const onRemoveRoute = useMemoizedFn((id: string) => {
        setRoutes((prev) => prev.filter((item) => item.Id !== id))
    })

    const handleSave = useMemoizedFn(() => {
        const normalizedEndpoints = endpoints.map(normalizeEndpoint)
        const normalizedRoutes = routes.map((route) => {
            const normalized = normalizeRoute(route)
            normalized.EndpointIds = normalized.EndpointIds.filter((endpointId) =>
                normalizedEndpoints.some((endpoint) => endpoint.Id === endpointId)
            )
            return normalized
        })

        if (normalizedEndpoints.some((endpoint) => !endpoint.Url)) {
            warn("请补全代理节点的 URL")
            return
        }

        if (normalizedRoutes.some((route) => route.Patterns.length === 0)) {
            warn("规则需要至少包含一个匹配模式")
            return
        }

        if (normalizedRoutes.some((route) => route.EndpointIds.length === 0)) {
            warn("规则需要至少选择一个代理节点")
            return
        }

        const request: GlobalProxyRulesConfig = {
            Endpoints: normalizedEndpoints,
            Routes: normalizedRoutes
        }

        setSaving(true)
        grpcSetGlobalProxyRulesConfig(request, true)
            .then(() => {
                success("保存成功")
                setSnapshot(serializeState(normalizedEndpoints, normalizedRoutes))
            })
            .catch((err) => {
                yakitFailed(`保存代理规则失败: ${err}`)
            })
            .finally(() => {
                setSaving(false)
            })
    })

    return (
        <div className={styles["proxy-rules-lab"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>代理与规则（实验）</div>
                <div className={styles["header-actions"]}>
                    <YakitButton type='outline2' size='small' onClick={() => fetchConfig(true)} disabled={loading}>
                        重新加载
                    </YakitButton>
                    <YakitButton
                        type='primary'
                        size='small'
                        onClick={handleSave}
                        disabled={!isDirty || loading}
                        loading={saving}
                    >
                        保存配置
                    </YakitButton>
                    <YakitButton type='text2' size='small' onClick={onClose}>
                        关闭
                    </YakitButton>
                </div>
            </div>

            <Spin spinning={loading}>
                <div className={styles["content"]}>
                    <section className={styles["section"]}>
                        <div className={styles["section-header"]}>
                            <div className={styles["section-title"]}>代理节点</div>
                            <YakitButton type='outline2' size='small' onClick={onAddEndpoint}>
                                新增节点
                            </YakitButton>
                        </div>
                        {endpoints.length === 0 ? (
                            <YakitEmpty description='暂未配置代理节点' />
                        ) : (
                            endpoints.map((endpoint) => (
                                <div key={endpoint.Id} className={classNames(styles["endpoint-row"], styles["row"])}>
                                    <div className={styles["row-main"]}>
                                        <YakitInput
                                            size='small'
                                            placeholder='节点名称（可选）'
                                            value={endpoint.Name}
                                            onChange={(e) => onUpdateEndpoint(endpoint.Id, {Name: e.target.value})}
                                        />
                                        <YakitInput
                                            size='small'
                                            placeholder='代理地址，如 http://127.0.0.1:8080'
                                            value={endpoint.Url}
                                            onChange={(e) => onUpdateEndpoint(endpoint.Id, {Url: e.target.value})}
                                        />
                                    </div>
                                    <YakitButton type='text2' size='small' onClick={() => onRemoveEndpoint(endpoint.Id)}>
                                        删除
                                    </YakitButton>
                                </div>
                            ))
                        )}
                    </section>

                    <Divider />

                    <section className={styles["section"]}>
                        <div className={styles["section-header"]}>
                            <div className={styles["section-title"]}>代理规则</div>
                            <YakitButton type='outline2' size='small' onClick={onAddRoute}>
                                新增规则
                            </YakitButton>
                        </div>
                        {routes.length === 0 ? (
                            <YakitEmpty description='暂未配置代理规则' />
                        ) : (
                            routes.map((route) => (
                                <div key={route.Id} className={classNames(styles["route-card"], styles["row"])}>
                                    <div className={styles["route-body"]}>
                                        <div className={styles["route-line"]}>
                                            <YakitInput
                                                size='small'
                                                placeholder='规则名称'
                                                value={route.Name}
                                                onChange={(e) => onUpdateRoute(route.Id, {Name: e.target.value})}
                                            />
                                            <YakitSelect
                                                style={{flex: 1}}
                                                mode='tags'
                                                size='small'
                                                placeholder='匹配模式（支持通配符，例如 *.example.com）'
                                                value={route.Patterns}
                                                onChange={(values) =>
                                                    onUpdateRoute(route.Id, {Patterns: values as string[]})
                                                }
                                                tokenSeparators={[",", " "]}
                                                dropdownMatchSelectWidth={360}
                                            />
                                        </div>
                                        <div className={styles["route-line"]}>
                                            <YakitSelect
                                                style={{flex: 1}}
                                                mode='multiple'
                                                size='small'
                                                placeholder='选择代理节点'
                                                value={route.EndpointIds}
                                                onChange={(values) =>
                                                    onUpdateRoute(route.Id, {EndpointIds: values as string[]})
                                                }
                                                options={endpointOptions}
                                                dropdownMatchSelectWidth={360}
                                                tagRender={(props) => (
                                                    <YakitTag {...props} size='small'>
                                                        {props.label}
                                                    </YakitTag>
                                                )}
                                            />
                                        </div>
                                    </div>
                                    <YakitButton type='text2' size='small' onClick={() => onRemoveRoute(route.Id)}>
                                        删除
                                    </YakitButton>
                                </div>
                            ))
                        )}
                    </section>
                </div>
            </Spin>
        </div>
    )
}

export default ProxyRulesLab
