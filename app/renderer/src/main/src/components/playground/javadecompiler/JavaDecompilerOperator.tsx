import React, {useEffect, useState, useRef} from "react"
import {AutoCard} from "@/components/AutoCard"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {Empty, message, Tree, Upload, Space} from "antd"
import {YakEditor} from "@/utils/editors"
import {useMemoizedFn} from "ahooks"
import {loadFromYakURLRaw} from "@/pages/yakURLTree/netif"
import {YakURLResource} from "@/pages/yakURLTree/data"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {failed, yakitInfo} from "@/utils/notification"
import {InboxOutlined} from "@ant-design/icons"
import {TreeNode} from "@/components/WebTree/WebTree"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

const {DirectoryTree} = Tree
const {ipcRenderer} = window.require("electron")

export interface JavaDecompilerOperatorProp {}

export const JavaDecompilerOperator: React.FC<JavaDecompilerOperatorProp> = (props) => {
    const {t} = useI18nNamespaces(["playground"])
    const [treeData, setTreeData] = useState<TreeNode[]>([])
    const [jarPath, setJarPath] = useState<string>("")
    const [selectedResource, setSelectedResource] = useState<YakURLResource>()
    const [decompileContent, setDecompileContent] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [selectedClassName, setSelectedClassName] = useState<string>("")

    // Load JAR file structure when jarPath changes
    useEffect(() => {
        if (!jarPath) {
            return
        }

        setLoading(true)
        const yakURL = `javadec:///jar?jar=${jarPath}`
        loadJarStructure(yakURL)
    }, [jarPath])

    const loadJarStructure = useMemoizedFn((yakURL: string) => {
        loadFromYakURLRaw(yakURL, (rsp) => {
            setTreeData(
                rsp.Resources.map((i, index) => ({
                    title: i.VerboseName,
                    key: `${index}`,
                    data: i,
                    isLeaf: !i.HaveChildrenNodes
                }))
            )
            setLoading(false)
        }).catch((e) => {
            failed(t("JavaDecompilerOperator.loadJarStructureFailed", {error: String(e)}))
            setTreeData([])
            setLoading(false)
        })
    })

    const refreshChildrenByParent = useMemoizedFn((parentKey: string, nodes: TreeNode[]) => {
        const pathsBlock: string[] = parentKey.split("-")
        const paths: string[] = pathsBlock.map((_, index) => {
            return pathsBlock.slice(undefined, index + 1).join("-")
        })

        function visitData(d: TreeNode[], depth: number) {
            if (depth + 1 > paths.length) {
                return
            }
            d.forEach((i) => {
                if (i.key !== paths[depth]) {
                    return
                }

                if (depth + 1 !== paths.length) {
                    visitData(i.children || [], depth + 1)
                    return
                }
                i.children = nodes
            })
        }

        visitData(treeData, 0)
        return [...treeData]
    })

    const handleJarUpload = async (file: any) => {
        const filePath = file.path
        if (!filePath) {
            failed(t("JavaDecompilerOperator.invalidFilePath"))
            return false
        }

        setJarPath(filePath)
        yakitInfo(t("JavaDecompilerOperator.loadedJarFile", {filePath}))
        return false // Prevent default upload behavior
    }

    const handleNodeSelect = useMemoizedFn((selectedKeys, info) => {
        const node = info.node as any as TreeNode
        if (node.data === undefined) {
            return
        }
        const resource = node.data as YakURLResource
        setSelectedResource(resource)

        // Skip directories
        if (resource.HaveChildrenNodes) {
            setDecompileContent("")
            setSelectedClassName("")
            return
        }

        setLoading(true)
        setSelectedClassName(resource.Path)

        // Use different handling for .class files (decompilation) vs other files (raw content)
        if (resource.ResourceName.endsWith(".class")) {
            const classPath = resource.Path
            const decompileURL = `javadec:///class?class=${classPath}&jar=${jarPath}`

            loadFromYakURLRaw(decompileURL, (rsp) => {
                if (rsp.Resources && rsp.Resources.length > 0) {
                    // Assuming the decompiled content is stored in the Extra field
                    const decompiled = rsp.Resources[0].Extra.find((kv) => kv.Key === "content")
                    if (decompiled) {
                        const content = Buffer.from(decompiled.Value, "hex")
                        setDecompileContent(content.toString("utf8"))
                    } else {
                        setDecompileContent(t("JavaDecompilerOperator.noDecompiledContent"))
                    }
                } else {
                    setDecompileContent(t("JavaDecompilerOperator.noDecompiledContent"))
                }
                setLoading(false)
            }).catch((e) => {
                failed(t("JavaDecompilerOperator.decompileClassFailed", {error: String(e)}))
                setDecompileContent(t("JavaDecompilerOperator.error", {error: String(e)}))
                setLoading(false)
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
                            setDecompileContent(content.toString("utf8"))
                        } catch (err) {
                            setDecompileContent(t("JavaDecompilerOperator.errorDecodingFileContent", {error: String(err)}))
                        }
                    } else {
                        setDecompileContent(t("JavaDecompilerOperator.noContentForFileType"))
                    }
                } else {
                    setDecompileContent(t("JavaDecompilerOperator.noContentForFile", {resourceName: resource.ResourceName}))
                }
                setLoading(false)
            }).catch((e) => {
                failed(t("JavaDecompilerOperator.loadFileContentFailed", {error: String(e)}))
                setDecompileContent(t("JavaDecompilerOperator.error", {error: String(e)}))
                setLoading(false)
            })
        }
    })

    return (
        <AutoCard style={{backgroundColor: "#fff"}} bodyStyle={{overflow: "hidden", padding: 0}}>
            <YakitResizeBox
                firstNode={
                    <AutoCard title={t("JavaDecompilerOperator.title")} size='small' bodyStyle={{padding: 8}}>
                        {!jarPath ? (
                            <Upload.Dragger
                                name='file'
                                multiple={false}
                                showUploadList={false}
                                beforeUpload={handleJarUpload}
                                accept='.jar,.war,.ear'
                            >
                                <p className='ant-upload-drag-icon'>
                                    <InboxOutlined />
                                </p>
                                <p className='ant-upload-text'>{t("JavaDecompilerOperator.dropHint")}</p>
                                <p className='ant-upload-hint'>{t("JavaDecompilerOperator.supportHint")}</p>
                            </Upload.Dragger>
                        ) : (
                            <div style={{height: "100%", overflowY: "auto"}}>
                                <Space style={{marginBottom: 12}}>
                                    <YakitButton
                                        onClick={() => {
                                            setJarPath("")
                                            setTreeData([])
                                            setSelectedResource(undefined)
                                            setDecompileContent("")
                                            setSelectedClassName("")
                                        }}
                                    >
                                        {t("JavaDecompilerOperator.reset")}
                                    </YakitButton>
                                    <div style={{wordBreak: "break-all"}}>{jarPath}</div>
                                </Space>
                                <DirectoryTree<TreeNode>
                                    loadData={(node) => {
                                        const originData = node.data
                                        return new Promise((resolve, reject) => {
                                            if (originData === undefined) {
                                                reject("node.data is empty")
                                                return
                                            }

                                            // For directories, construct the proper URL with dir parameter
                                            let requestURL = originData.Url.FromRaw

                                            // If it's a directory node and not using directory structure already,
                                            // reconstruct the URL to use javadec:///jar?jar=${jarPath}&dir=${dirPath}
                                            if (!requestURL.includes("&dir=") && originData.HaveChildrenNodes) {
                                                const dirPath = originData.Path
                                                requestURL = `javadec:///jar?jar=${jarPath}&dir=${dirPath}`
                                            }

                                            loadFromYakURLRaw(
                                                requestURL,
                                                (rsp) => {
                                                    const newNodes: TreeNode[] = rsp.Resources.map((i, index) => ({
                                                        title: i.VerboseName,
                                                        key: `${node.key}-${index}`,
                                                        data: i,
                                                        isLeaf: !i.HaveChildrenNodes
                                                    }))
                                                    setTreeData([...refreshChildrenByParent(node.key + "", newNodes)])
                                                    resolve(rsp)
                                                },
                                                reject
                                            )
                                        })
                                    }}
                                    onSelect={handleNodeSelect}
                                    treeData={treeData}
                                />
                            </div>
                        )}
                    </AutoCard>
                }
                firstMinSize='300px'
                firstRatio='350px'
                secondNode={
                    <AutoCard
                        title={selectedClassName ? t("JavaDecompilerOperator.decompiledClassTitle", {selectedClassName}) : t("JavaDecompilerOperator.decompiledCodeTitle")}
                        size='small'
                        bodyStyle={{padding: 0}}
                    >
                        {decompileContent ? (
                            <YakEditor type='java' value={decompileContent} readOnly={true} />
                        ) : (
                            <Empty
                                description={t("JavaDecompilerOperator.selectClassHint")}
                                style={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center"
                                }}
                            />
                        )}
                    </AutoCard>
                }
            />
        </AutoCard>
    )
}
