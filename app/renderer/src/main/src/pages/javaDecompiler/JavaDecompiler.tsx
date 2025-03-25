import React, {useEffect, useState, useRef} from "react"
import {Empty, message, Upload, Space, Tooltip, Spin, Divider, Card, Tabs} from "antd"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {YakEditor} from "@/utils/editors"
import {useMemoizedFn} from "ahooks"
import {loadFromYakURLRaw} from "@/pages/yakURLTree/netif"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import {failed, yakitInfo, yakitNotify} from "@/utils/notification"
import {
    InboxOutlined,
    FileOutlined,
    FolderOutlined,
    ReloadOutlined,
    CopyOutlined,
    DownloadOutlined,
    CloseCircleOutlined,
    CodeOutlined,
    FolderOpenOutlined,
    LoadingOutlined
} from "@ant-design/icons"
import {TreeNode} from "@/components/WebTree/WebTree"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import styles from "./JavaDecompiler.module.scss"
import classNames from "classnames"
import {getRemoteValue, setRemoteValue} from "@/utils/kv"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCard} from "@/components/yakitUI/YakitCard/YakitCard"
import {FileNodeProps as BaseFileNodeProps} from "@/pages/yakRunner/FileTree/FileTreeType"
import {setClipboardText} from "@/utils/clipboard"
import {FileDefault, FileSuffix, FolderDefault, KeyToIcon} from "@/pages/yakRunner/FileTree/icon"
import {v4 as uuidv4} from "uuid"
import YakitTabs from "@/components/yakitUI/YakitTabs/YakitTabs"
import {RunnerFileTree} from "./RunnerFileTree"

// 扩展 FileNodeProps 接口以添加 data 字段
interface FileNodeProps extends BaseFileNodeProps {
    data?: YakURLResource
}

// 定义文件详情接口，用于标签页
interface FileTabInfo {
    key: string
    title: string
    path: string
    content: string
    resourceName: string
    language: string
    icon?: React.ReactNode
    isLoading?: boolean
}

const {ipcRenderer} = window.require("electron")

interface JavaDecompilerProps {}

export const JavaDecompiler: React.FC<JavaDecompilerProps> = (props) => {
    const [treeData, setTreeData] = useState<FileNodeProps[]>([])
    const [jarPath, setJarPath] = useState<string>("")
    const [selectedResource, setSelectedResource] = useState<YakURLResource>()
    const [decompileContent, setDecompileContent] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [fileLoading, setFileLoading] = useState<boolean>(false)
    const [selectedClassName, setSelectedClassName] = useState<string>("")
    const [recentJars, setRecentJars] = useState<string[]>([])
    const [showRecentJars, setShowRecentJars] = useState<boolean>(false)
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])
    const [focusedKey, setFocusedKey] = useState<string>("")

    // 新增状态 - 标签页管理
    const [activeTabKey, setActiveTabKey] = useState<string>("")
    const [tabs, setTabs] = useState<FileTabInfo[]>([])

    useEffect(() => {
        // Load recent JARs from storage
        getRemoteValue("java-decompiler-recent-jars").then((val) => {
            if (val) {
                try {
                    const jars = JSON.parse(val)
                    if (Array.isArray(jars)) {
                        setRecentJars(jars)
                    }
                } catch (e) {
                    console.error("Failed to parse recent JARs:", e)
                }
            }
        })
    }, [])

    // Save recent JARs when updated
    useEffect(() => {
        if (recentJars.length > 0) {
            setRemoteValue("java-decompiler-recent-jars", JSON.stringify(recentJars))
        }
    }, [recentJars])

    // Load JAR file structure when jarPath changes
    useEffect(() => {
        if (!jarPath) {
            return
        }

        setLoading(true)
        const yakURL = `javadec:///jar?jar=${jarPath}`
        loadJarStructure(yakURL)

        // Add to recent JARs
        if (!recentJars.includes(jarPath)) {
            setRecentJars((prev) => {
                const newList = [jarPath, ...prev].slice(0, 10) // Keep only 10 recent JARs
                return newList
            })
        }
    }, [jarPath])

    // 将 YakURLResource 转换为 FileNodeProps
    const convertToFileNodeProps = useMemoizedFn(
        (resources: YakURLResource[], parentPath: string | null, depth: number = 0): FileNodeProps[] => {
            return resources.map((resource, index) => {
                const isFolder = resource.HaveChildrenNodes
                const fileSuffix = resource.ResourceName.split(".").pop() || ""
                let icon = isFolder ? FolderDefault : FileDefault

                // 为文件设置图标
                if (!isFolder && fileSuffix && FileSuffix[fileSuffix]) {
                    icon = FileSuffix[fileSuffix]
                }

                return {
                    parent: parentPath,
                    name: resource.VerboseName,
                    path: resource.Path,
                    isFolder,
                    icon,
                    depth,
                    isLeaf: !isFolder,
                    data: resource // 存储原始数据
                }
            })
        }
    )

    const loadJarStructure = useMemoizedFn((yakURL: string) => {
        loadFromYakURLRaw(yakURL, (rsp) => {
            const fileNodes = convertToFileNodeProps(rsp.Resources, null)
            setTreeData(fileNodes)
            setLoading(false)
            yakitInfo("JAR 文件结构加载成功")
        }).catch((e) => {
            failed(`加载 JAR 结构失败: ${e}`)
            setTreeData([])
            setLoading(false)
        })
    })

    const handleJarUpload = async (file: any) => {
        const filePath = file.path
        if (!filePath) {
            failed("无效的文件路径")
            return false
        }

        setJarPath(filePath)
        return false // Prevent default upload behavior
    }

    // 更新：现在为每个文件加载内容时创建一个新的标签页
    const loadFileContent = useMemoizedFn((resource: YakURLResource) => {
        // 检查是否已经有这个文件的标签页
        const existingTabIndex = tabs.findIndex((tab) => tab.path === resource.Path)

        // 如果标签页已存在，只需激活它
        if (existingTabIndex >= 0) {
            setActiveTabKey(tabs[existingTabIndex].key)
            return
        }

        // 创建新标签
        const newTabKey = uuidv4()
        const fileType = resource.ResourceName.endsWith(".class") ? "class" : "file"
        const newTab: FileTabInfo = {
            key: newTabKey,
            title: resource.VerboseName,
            path: resource.Path,
            content: "",
            resourceName: resource.ResourceName,
            language: getEditorLang(resource.ResourceName),
            icon: <CodeOutlined />,
            isLoading: true
        }

        // 添加新标签页并设置为活动标签页
        setTabs([...tabs, newTab])
        setActiveTabKey(newTabKey)

        // 根据文件类型决定加载方式
        if (resource.ResourceName.endsWith(".class")) {
            const classPath = resource.Path
            const decompileURL = `javadec:///class?class=${classPath}&jar=${jarPath}`

            loadFromYakURLRaw(decompileURL, (rsp) => {
                if (rsp.Resources && rsp.Resources.length > 0) {
                    // Assuming the decompiled content is stored in the Extra field
                    const decompiled = rsp.Resources[0].Extra.find((kv) => kv.Key === "content")
                    if (decompiled) {
                        try {
                            const content = Buffer.from(decompiled.Value, "hex")
                            const contentStr = content.toString("utf8")

                            // 更新标签页内容
                            setTabs((prevTabs) =>
                                prevTabs.map((tab) =>
                                    tab.key === newTabKey ? {...tab, content: contentStr, isLoading: false} : tab
                                )
                            )
                        } catch (err) {
                            // 更新标签页内容为错误信息
                            setTabs((prevTabs) =>
                                prevTabs.map((tab) =>
                                    tab.key === newTabKey
                                        ? {...tab, content: `// 解析 class 内容错误: ${err}`, isLoading: false}
                                        : tab
                                )
                            )
                        }
                    } else {
                        setTabs((prevTabs) =>
                            prevTabs.map((tab) =>
                                tab.key === newTabKey
                                    ? {...tab, content: "// 没有可用的反编译内容", isLoading: false}
                                    : tab
                            )
                        )
                    }
                } else {
                    setTabs((prevTabs) =>
                        prevTabs.map((tab) =>
                            tab.key === newTabKey ? {...tab, content: "// 没有可用的反编译内容", isLoading: false} : tab
                        )
                    )
                }
            }).catch((e) => {
                failed(`反编译 class 失败: ${e}`)
                setTabs((prevTabs) =>
                    prevTabs.map((tab) =>
                        tab.key === newTabKey ? {...tab, content: `// 错误: ${e}`, isLoading: false} : tab
                    )
                )
            })
        } else {
            // For non-class files, fetch the raw content
            const filePath = resource.Path
            const fileURL = `javadec:///file?jar=${jarPath}&file=${filePath}`

            loadFromYakURLRaw(fileURL, (rsp) => {
                if (rsp.Resources && rsp.Resources.length > 0) {
                    const fileContent = rsp.Resources[0].Extra.find((kv) => kv.Key === "content")
                    if (fileContent) {
                        try {
                            const content = Buffer.from(fileContent.Value, "hex")
                            const contentStr = content.toString("utf8")

                            // 更新标签页内容
                            setTabs((prevTabs) =>
                                prevTabs.map((tab) =>
                                    tab.key === newTabKey ? {...tab, content: contentStr, isLoading: false} : tab
                                )
                            )
                        } catch (err) {
                            setTabs((prevTabs) =>
                                prevTabs.map((tab) =>
                                    tab.key === newTabKey
                                        ? {...tab, content: `// 解析文件内容错误: ${err}`, isLoading: false}
                                        : tab
                                )
                            )
                        }
                    } else {
                        setTabs((prevTabs) =>
                            prevTabs.map((tab) =>
                                tab.key === newTabKey
                                    ? {...tab, content: `// 此文件类型没有可用内容`, isLoading: false}
                                    : tab
                            )
                        )
                    }
                } else {
                    setTabs((prevTabs) =>
                        prevTabs.map((tab) =>
                            tab.key === newTabKey
                                ? {...tab, content: `// 文件 ${resource.ResourceName} 没有可用内容`, isLoading: false}
                                : tab
                        )
                    )
                }
            }).catch((e) => {
                failed(`加载文件内容失败: ${e}`)
                setTabs((prevTabs) =>
                    prevTabs.map((tab) =>
                        tab.key === newTabKey ? {...tab, content: `// 错误: ${e}`, isLoading: false} : tab
                    )
                )
            })
        }
    })

    // 处理节点加载
    const onLoadData = useMemoizedFn((node: FileNodeProps) => {
        return new Promise<void>((resolve, reject) => {
            if (!node.isFolder) {
                resolve()
                return
            }

            const dirPath = node.path
            const requestURL = `javadec:///jar?jar=${jarPath}&dir=${dirPath}`

            loadFromYakURLRaw(requestURL, (rsp) => {
                if (rsp.Resources && rsp.Resources.length > 0) {
                    const childNodes = convertToFileNodeProps(rsp.Resources, node.path, node.depth + 1)

                    // 更新节点的子节点
                    const updateTreeData = (
                        data: FileNodeProps[],
                        key: string,
                        children: FileNodeProps[]
                    ): FileNodeProps[] => {
                        return data.map((node) => {
                            if (node.path === key) {
                                return {
                                    ...node,
                                    children
                                }
                            }
                            if (node.children) {
                                return {
                                    ...node,
                                    children: updateTreeData(node.children, key, children)
                                }
                            }
                            return node
                        })
                    }

                    setTreeData((prev) => updateTreeData(prev, node.path, childNodes))
                }
                resolve()
            }).catch((e) => {
                failed(`加载目录内容失败: ${e}`)
                reject(e)
            })
        })
    })

    const getEditorLang = useMemoizedFn((fileName: string) => {
        if (fileName.endsWith(".class")) return "java"
        if (fileName.endsWith(".xml")) return "xml"
        if (fileName.endsWith(".properties")) return "properties"
        if (fileName.endsWith(".json")) return "json"
        if (fileName.endsWith(".yml") || fileName.endsWith(".yaml")) return "yaml"
        if (fileName.endsWith(".html")) return "html"
        if (fileName.endsWith(".js")) return "javascript"
        return "text"
    })

    const resetDecompiler = () => {
        setJarPath("")
        setTreeData([])
        setSelectedResource(undefined)
        setDecompileContent("")
        setSelectedClassName("")
        setLoading(false)
        setFileLoading(false)
        setFocusedKey("")
        setExpandedKeys([])
        // 清空标签页
        setTabs([])
        setActiveTabKey("")
    }

    const importProject = () => {
        console.log("importProject")
    }

    const importProjectAndCompile = () => {
        console.log("importProjectAndCompile")
    }
    // 复制当前活动标签页的内容
    const copyContent = () => {
        const activeTab = tabs.find((tab) => tab.key === activeTabKey)
        if (!activeTab || !activeTab.content) {
            return
        }

        setClipboardText(activeTab.content)
        yakitNotify("success", "内容已复制到剪贴板")
    }

    // 下载当前活动标签页的内容
    const downloadDecompiledFile = () => {
        const activeTab = tabs.find((tab) => tab.key === activeTabKey)
        if (!activeTab || !activeTab.content) {
            return
        }

        const fileName = activeTab.resourceName
        const a = document.createElement("a")
        const blob = new Blob([activeTab.content], {type: "text/plain"})
        a.href = URL.createObjectURL(blob)

        // 如果是class文件，将下载的文件名改为.java
        const downloadName = fileName.endsWith(".class") ? fileName.replace(".class", ".java") : fileName

        a.download = downloadName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    // 处理标签页的关闭
    const handleTabClose = (key: string) => {
        const newTabs = tabs.filter((tab) => tab.key !== key)
        setTabs(newTabs)

        // 如果关闭的是当前活动的标签页，则激活最后一个标签页
        if (key === activeTabKey && newTabs.length > 0) {
            setActiveTabKey(newTabs[newTabs.length - 1].key)
        } else if (newTabs.length === 0) {
            setActiveTabKey("")
        }
    }

    // 处理文件树节点选择
    const handleNodeSelect = useMemoizedFn(
        (selectedKeys: string[], e: {selected: boolean; selectedNodes: FileNodeProps[]; node: FileNodeProps}) => {
            if (!e.selected || !e.node) return

            const node = e.node

            // 如果是文件夹，不加载内容
            if (node.isFolder) {
                return
            }

            // 设置为焦点节点
            setFocusedKey(node.path)

            // 加载文件内容
            if (node.data) {
                setSelectedResource(node.data)
                loadFileContent(node.data)
            }
        }
    )

    // 渲染标签页内容
    const renderTabContent = (tab: FileTabInfo) => {
        if (tab.isLoading) {
            return (
                <div className={styles["loading-area"]}>
                    <YakitSpin spinning={true} tip='正在加载文件内容...' />
                </div>
            )
        }

        return <YakEditor type={tab.language} value={tab.content} readOnly={true} />
    }

    return (
        <div className={styles["java-decompiler-page"]}>
            <YakitResizeBox
                firstNode={
                    <div className={styles["file-explorer-container"]}>
                        {!jarPath ? (
                            <div className={styles["upload-area"]}>
                                <div className={styles["upload-section"]}>
                                    <Upload.Dragger
                                        name='file'
                                        multiple={false}
                                        showUploadList={false}
                                        beforeUpload={handleJarUpload}
                                        accept='.jar,.war,.ear'
                                        className={styles["yakit-dragger"]}
                                    >
                                        <div className={styles["upload-content"]}>
                                            <p className={styles["upload-icon"]}>
                                                <InboxOutlined />
                                            </p>
                                            <p className={styles["upload-text"]}>点击或拖拽 JAR 文件到此处反编译</p>
                                            <p className={styles["upload-subtext"]}>支持 .jar, .war, .ear 文件</p>
                                        </div>
                                    </Upload.Dragger>
                                </div>

                                {recentJars.length > 0 && (
                                    <YakitCard
                                        title={
                                            <div
                                                className={styles["recent-header"]}
                                                onClick={() => setShowRecentJars(!showRecentJars)}
                                            >
                                                <span>最近使用的 JAR 文件</span>
                                                <span>{showRecentJars ? "▼" : "▶"}</span>
                                            </div>
                                        }
                                        className={styles["recent-jars-card"]}
                                    >
                                        {showRecentJars && (
                                            <div className={styles["recent-list"]}>
                                                {recentJars.map((jar, index) => (
                                                    <div
                                                        key={index}
                                                        className={styles["recent-item"]}
                                                        onClick={() => setJarPath(jar)}
                                                        title={jar}
                                                    >
                                                        <FileOutlined className={styles["recent-icon"]} />
                                                        <span className={styles["recent-name"]}>
                                                            {jar.split("/").pop()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </YakitCard>
                                )}
                            </div>
                        ) : (
                            <RunnerFileTree
                                jarPath={jarPath}
                                treeData={treeData}
                                loading={loading}
                                focusedKey={focusedKey}
                                setFocusedKey={setFocusedKey}
                                expandedKeys={expandedKeys}
                                setExpandedKeys={setExpandedKeys}
                                loadJarStructure={loadJarStructure}
                                onLoadData={onLoadData}
                                onNodeSelect={handleNodeSelect}
                                resetDecompiler={resetDecompiler}
                                importProject={importProject}
                                importProjectAndCompile={importProjectAndCompile}
                            />
                        )}
                    </div>
                }
                secondNode={
                    <div className={styles["code-viewer-container"]}>
                        <div className={styles["code-viewer-header"]}>
                            <div className={styles["code-actions"]}>
                                {activeTabKey && (
                                    <>
                                        <YakitButton
                                            type='text'
                                            icon={<CopyOutlined />}
                                            onClick={copyContent}
                                            size='small'
                                        >
                                            复制
                                        </YakitButton>
                                        <YakitButton
                                            type='text'
                                            icon={<DownloadOutlined />}
                                            onClick={downloadDecompiledFile}
                                            size='small'
                                        >
                                            下载
                                        </YakitButton>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={styles["editor-wrapper"]}>
                            {tabs.length === 0 ? (
                                <YakitEmpty title='选择文件查看内容' description='从左侧 JAR 结构中选择一个文件' />
                            ) : (
                                <div className={styles["tabs-container"]}>
                                    <YakitTabs
                                        type='card'
                                        activeKey={activeTabKey}
                                        onChange={setActiveTabKey}
                                        onTabClick={(key) => {
                                            setActiveTabKey(key)
                                        }}
                                        onEdit={(targetKey, action) => {
                                            if (action === "remove") {
                                                handleTabClose(targetKey as string)
                                            }
                                        }}
                                    >
                                        {tabs.map((tab) => (
                                            <YakitTabs.YakitTabPane
                                                key={tab.key}
                                                tab={
                                                    <div className={styles["tab-label"]}>
                                                        {tab.icon}
                                                        <span className={styles["tab-title"]}>{tab.title}</span>
                                                    </div>
                                                }
                                                closable={true}
                                            >
                                                {renderTabContent(tab)}
                                            </YakitTabs.YakitTabPane>
                                        ))}
                                    </YakitTabs>
                                </div>
                            )}
                        </div>
                    </div>
                }
                isVer={false}
                firstRatio='320px'
                lineStyle={{
                    backgroundColor: "var(--yakit-border-color)"
                }}
            />
        </div>
    )
}
