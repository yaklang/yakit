import React, { useEffect, useState, useRef } from "react";
import { Form, Space, Card, Button, Tooltip } from "antd";
import { YakitButton } from "@/components/yakitUI/YakitButton/YakitButton";
import { YakitSelect } from "@/components/yakitUI/YakitSelect/YakitSelect";
import { YakitTag } from "@/components/yakitUI/YakitTag/YakitTag";
import { YakitCheckbox } from "@/components/yakitUI/YakitCheckbox/YakitCheckbox";
import { failed, info, success } from "@/utils/notification";
import { useMemoizedFn, useCreation } from "ahooks";
import { InputItem } from "@/utils/inputUtil";
import { randomString } from "@/utils/randomUtil";
import { setClipboardText } from "@/utils/clipboard";
import { CopyOutlined } from "@ant-design/icons";
import classNames from "classnames";
import { OutlineArrowscollapseIcon, OutlineArrowsexpandIcon } from "@/assets/icon/outline";
import { ExpandAndRetract, ExpandAndRetractExcessiveState } from "@/pages/plugins/operator/expandAndRetract/ExpandAndRetract";
import styles from "./McpServer.module.scss";

const { ipcRenderer } = window.require("electron");

export interface ToolSetInfo {
    Name: string;
}

export interface ResourceSetInfo {
    Name: string;
}

export interface GetToolSetListResponse {
    ToolSetList: ToolSetInfo[];
    ResourceSetList: ResourceSetInfo[];
}

export interface StartMcpServerRequest {
    Host: string;
    Port: number;
    Tool: string[];
    DisableTool: string[];
    Resource: string[];
    DisableResource: string[];
    Script: string[];
    EnableAll: boolean;
}

export interface StartMcpServerResponse {
    Status: string;
    Message: string;
    ServerUrl: string;
}

export interface McpServerProps {}

export const McpServer: React.FC<McpServerProps> = (props) => {
    const [hidden, setHidden] = useState<boolean>(false);
    const [selectedTools, setSelectedTools] = useState<string[]>([]);
    const [selectedResources, setSelectedResources] = useState<string[]>([]);

    return (
        <div className={styles["mcp-server-wrapper"]}>
            <ToolResourceList 
                hidden={hidden} 
                selectedTools={selectedTools} 
                setSelectedTools={setSelectedTools}
                selectedResources={selectedResources}
                setSelectedResources={setSelectedResources}
            />
            <McpServerExecute
                hidden={hidden}
                setHidden={setHidden}
                selectedTools={selectedTools}
                selectedResources={selectedResources}
            />
        </div>
    );
};

interface ToolResourceListProps {
    hidden: boolean;
    selectedTools: string[];
    setSelectedTools: (tools: string[]) => void;
    selectedResources: string[];
    setSelectedResources: (resources: string[]) => void;
}

const ToolResourceList: React.FC<ToolResourceListProps> = (props) => {
    const { hidden, selectedTools, setSelectedTools, selectedResources, setSelectedResources } = props;
    const [toolSets, setToolSets] = useState<ToolSetInfo[]>([]);
    const [resourceSets, setResourceSets] = useState<ResourceSetInfo[]>([]);

    useEffect(() => {
        fetchToolList();
    }, []);

    const fetchToolList = useMemoizedFn(() => {
        ipcRenderer
            .invoke("get-mcptool-list")
            .then((data: GetToolSetListResponse) => {
                if (data) {
                    const tools = data.ToolSetList || [];
                    const resources = data.ResourceSetList || [];
                    
                    setToolSets(tools);
                    setResourceSets(resources);
                    
                    // 默认选中所有工具和资源
                    setSelectedTools(tools.map(tool => tool.Name));
                    setSelectedResources(resources.map(resource => resource.Name));
                }
            })
            .catch((e) => {
                failed(`获取工具列表失败: ${e}`);
            });
    });

    const handleToolSelect = useMemoizedFn((value: string) => {
        if (selectedTools.includes(value)) {
            setSelectedTools(selectedTools.filter(item => item !== value));
        } else {
            setSelectedTools([...selectedTools, value]);
        }
    });

    const handleResourceSelect = useMemoizedFn((value: string) => {
        if (selectedResources.includes(value)) {
            setSelectedResources(selectedResources.filter(item => item !== value));
        } else {
            setSelectedResources([...selectedResources, value]);
        }
    });

    const selectAll = useMemoizedFn(() => {
        setSelectedTools(toolSets.map(tool => tool.Name));
        setSelectedResources(resourceSets.map(resource => resource.Name));
    });

    const unselectAll = useMemoizedFn(() => {
        setSelectedTools([]);
        setSelectedResources([]);
    });

    const isAllSelected = useMemoizedFn(() => {
        return (
            toolSets.length > 0 &&
            resourceSets.length > 0 &&
            selectedTools.length === toolSets.length &&
            selectedResources.length === resourceSets.length
        );
    });

    const totalItems = toolSets.length + resourceSets.length;
    const selectedItems = selectedTools.length + selectedResources.length;

    return (
        <div
            className={classNames(styles["tool-list-wrapper"], {
                [styles["tool-list-wrapper-hidden"]]: hidden
            })}
        >
            <div className={styles["tool-heard"]}>
                <span className={styles["tool-heard-title"]}>可用工具和资源</span>
            </div>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
                <YakitCheckbox 
                    checked={isAllSelected()}
                    onChange={(e) => e.target.checked ? selectAll() : unselectAll()}
                    style={{ marginRight: 5 }}
                />
                <span style={{ fontSize: '12px' }}>全选</span>
                <span style={{ fontSize: '12px', color: '#888', margin: '0 8px' }}>
                    Total {totalItems}
                </span>
                <span style={{ fontSize: '12px', color: '#888' }}>
                    Selected {selectedItems}
                </span>
            </div>
            <div className={styles["tool-list"]}>
                <div className={styles["tool-root"]}>
                    <h3>工具集</h3>
                    {toolSets.map((tool) => (
                        <div key={tool.Name} style={{ marginBottom: 8 }}>
                            <YakitCheckbox 
                                checked={selectedTools.includes(tool.Name)}
                                onChange={() => handleToolSelect(tool.Name)}
                            >
                                {tool.Name}
                            </YakitCheckbox>
                        </div>
                    ))}
                    <h3 style={{ marginTop: 16 }}>资源集</h3>
                    {resourceSets.map((resource) => (
                        <div key={resource.Name} style={{ marginBottom: 8 }}>
                            <YakitCheckbox 
                                checked={selectedResources.includes(resource.Name)}
                                onChange={() => handleResourceSelect(resource.Name)}
                            >
                                {resource.Name}
                            </YakitCheckbox>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

interface McpServerExecuteProps {
    hidden: boolean;
    setHidden: (hidden: boolean) => void;
    selectedTools: string[];
    selectedResources: string[];
}

const McpServerExecute: React.FC<McpServerExecuteProps> = (props) => {
    const { hidden, setHidden, selectedTools, selectedResources } = props;
    const [isExpand, setIsExpand] = useState<boolean>(true);
    const [executeStatus, setExecuteStatus] = useState<ExpandAndRetractExcessiveState>("default");
    const [loading, setLoading] = useState<boolean>(false);
    const [serverStatus, setServerStatus] = useState<string>("");
    const [serverUrl, setServerUrl] = useState<string>("");
    const [token, setToken] = useState<string>(randomString(40));
    const [serverMessage, setServerMessage] = useState<string>("");

    // Form values
    const [params, setParams] = useState<StartMcpServerRequest>({
        Host: "127.0.0.1",
        Port: 11432,
        Tool: [],
        DisableTool: [],
        Resource: [],
        DisableResource: [],
        Script: [],
        EnableAll: false
    });

    useEffect(() => {
        setParams({
            ...params,
            Tool: selectedTools,
            Resource: selectedResources
        });
    }, [selectedTools, selectedResources]);

    // 注册监听器
    useEffect(() => {
        // 监听MCP服务器响应
        ipcRenderer.on(`${token}-data`, (_, data: StartMcpServerResponse) => {
            if (!data) return
            
            setServerStatus(data.Status);
            setServerMessage(data.Message || "");
            
            if (data.Status === "running" && data.ServerUrl) {
                setServerUrl(data.ServerUrl);
                success(`MCP 服务启动成功: ${data.ServerUrl}`);
                setExecuteStatus("process");
            } else if (data.Status === "error") {
                failed(`MCP 服务错误: ${data.Message}`);
                setExecuteStatus("error");
                setLoading(false);
            } else if (data.Status === "stopped") {
                info(`MCP 服务已停止: ${data.Message}`);
                setExecuteStatus("default");
                setLoading(false);
            }
        });
        
        // 监听MCP服务器结束
        ipcRenderer.on(`${token}-end`, () => {
            setLoading(false);
        });
        
        // 监听MCP服务器错误
        ipcRenderer.on(`${token}-error`, (_, error) => {
            failed(`MCP 服务错误: ${error}`);
            setServerStatus("error");
            setServerMessage(error);
            setExecuteStatus("error");
            setLoading(false);
        });

        return () => {
            ipcRenderer.removeAllListeners(`${token}-data`);
            ipcRenderer.removeAllListeners(`${token}-end`);
            ipcRenderer.removeAllListeners(`${token}-error`);
        };
    }, [token]);

    const onExpand = useMemoizedFn((e) => {
        e.stopPropagation();
        setIsExpand(!isExpand);
    });

    const onRemoveTools = useMemoizedFn((e) => {
        e.stopPropagation();
        setParams({
            ...params,
            Tool: [],
            Resource: []
        });
    });

    const isExecuting = useCreation(() => {
        return serverStatus === "running" || serverStatus === "starting" || serverStatus === "configured";
    }, [serverStatus]);

    const selectNum = useCreation(() => {
        return selectedTools.length + selectedResources.length;
    }, [selectedTools, selectedResources]);

    const startServer = useMemoizedFn(() => {
        setLoading(true);
        setServerStatus("starting");
        setServerMessage("Initializing MCP server...");
        setExecuteStatus("process");
        
        // 流式调用启动MCP服务
        ipcRenderer.invoke("start-mcp-serve", params, token).catch((e) => {
            failed(`MCP 服务调用失败: ${e}`);
            setServerStatus("error");
            setServerMessage(`调用失败: ${e}`);
            setExecuteStatus("error");
            setLoading(false);
        });
    });

    const stopServer = useMemoizedFn(() => {
        setLoading(true);
        ipcRenderer.invoke("cancel-start-mcp-serve", token).catch((e) => {
            failed(`停止 MCP 服务失败: ${e}`);
        });
    });

    return (
        <div className={styles["mcp-server-execute-wrapper"]}>
            <ExpandAndRetract isExpand={isExpand} onExpand={onExpand} status={executeStatus}>
                <div className={styles["mcp-server-executor-title"]}>
                    <span className={styles["mcp-server-executor-title-text"]}>MCP 服务器</span>
                    {selectNum > 0 && (
                        <YakitTag closable onClose={onRemoveTools} color='info'>
                            {selectNum} 个项目
                        </YakitTag>
                    )}
                </div>
                <div className={styles["mcp-server-executor-btn"]}>
                    {isExecuting || loading
                        ? !isExpand && (
                              <>
                                  <YakitButton danger onClick={stopServer}>
                                      停止服务
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )
                        : !isExpand && (
                              <>
                                  <YakitButton onClick={startServer} disabled={selectNum === 0}>
                                      启动服务
                                  </YakitButton>
                                  <div className={styles["divider-style"]}></div>
                              </>
                          )}
                    <YakitButton
                        type='text2'
                        icon={hidden ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                        onClick={(e) => {
                            e.stopPropagation();
                            setHidden(!hidden);
                        }}
                    />
                </div>
            </ExpandAndRetract>
            <div className={styles["mcp-server-executor-body"]}>
                <div className={classNames(styles["mcp-server-form-wrapper"], {
                    [styles["mcp-server-form-wrapper-hidden"]]: !isExpand
                })}>
                    <Form
                        onSubmitCapture={(e) => {
                            e.preventDefault();
                        }}
                        labelCol={{ span: 5 }}
                        wrapperCol={{ span: 14 }}
                        size={"small"}
                    >
                        <InputItem
                            label={"主机地址"}
                            setValue={(Host) => setParams({ ...params, Host })}
                            value={params.Host}
                            autoComplete={["0.0.0.0", "127.0.0.1"]}
                            help={"MCP 服务器监听地址"}
                        />
                        <InputItem
                            label={"端口"}
                            setValue={(Port) => setParams({ ...params, Port: parseInt(Port) })}
                            value={params.Port.toString()}
                            type="number"
                            help={"MCP 服务器监听端口"}
                        />

                        <Form.Item label=" " colon={false}>
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'center' }}>
                                {!isExecuting && !loading && (
                                    <YakitButton
                                        type="primary"
                                        onClick={startServer}
                                        loading={loading}
                                        disabled={selectNum === 0}
                                        style={{ 
                                            minWidth: '120px',
                                            height: '38px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        启动服务
                                    </YakitButton>
                                )}
                                {(isExecuting || loading) && (
                                    <YakitButton
                                        danger={true}
                                        onClick={stopServer}
                                        style={{ 
                                            minWidth: '120px',
                                            height: '38px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        停止服务
                                    </YakitButton>
                                )}
                            </div>
                        </Form.Item>
                    </Form>
                </div>
                <div className={styles["mcp-server-result-wrapper"]}>
                    {serverUrl && (
                        <Card title="服务器URL" style={{ marginTop: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ marginRight: 8, fontWeight: 'bold' }}>{serverUrl}</span>
                                <Tooltip title="复制URL">
                                    <Button 
                                        icon={<CopyOutlined />} 
                                        size="small" 
                                        type="text" 
                                        onClick={() => {
                                            setClipboardText(serverUrl);
                                        }}
                                    />
                                </Tooltip>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default McpServer; 