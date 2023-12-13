import {YakURLTree, YakURLTreeProp} from "@/pages/yakURLTree/YakURLTree";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {ResizeBox} from "@/components/ResizeBox";
import cveStyles from "@/pages/cve/CVETable.module.scss";
import {
    ChevronLeftIcon,
    RefreshIcon, TrashIcon,
} from "@/assets/newIcon";
import {TableVirtualResize} from "@/components/TableVirtualResize/TableVirtualResize";
import {RequestYakURLResponse, YakURL, YakURLResource} from "@/pages/yakURLTree/data";
import {useDebounceFn, useMemoizedFn} from "ahooks";
import {ColumnsTypeProps, SortProps} from "@/components/TableVirtualResize/TableVirtualResizeType";
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag";
import {formatTimestamp} from "@/utils/timeUtil";
import {genDefaultPagination, PaginationSchema} from "@/pages/invoker/schema";
import {Button, Divider, Form, Space, Tooltip} from "antd";
import {FileOutlined, FolderOpenOutlined} from "@ant-design/icons";
import {InputItem} from "@/utils/inputUtil";
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {ShellType, WebShellDetail} from "@/pages/webShell/models";
import {showByCustom} from "@/components/functionTemplate/showByContext";
import mitmStyles from "@/pages/mitm/MITMServerHijacking/MITMServerHijacking.module.scss";
import {YakitMenu, YakitMenuItemProps} from "@/components/yakitUI/YakitMenu/YakitMenu";
import {showModal} from "@/utils/showModal";
import {WebShellCreatorForm} from "@/pages/webShell/WebShellComp";
import {deleteWebShell, featurePing} from "@/pages/webShell/WebShellManager";
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor";
import {requestYakURLList} from "@/pages/yakURLTree/netif";
import {showYakitModal, YakitModalConfirm} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import {yakitFailed} from "@/utils/notification";
import {goBack} from "@/pages/webShell/FileManager";
import {TreeNode, WebTree} from "@/components/WebTree/WebTree";

interface WebShellURLTreeAndTableProp {
    Id: string
    shellType: ShellType
}

export const WebShellURLTreeAndTable: React.FC<WebShellURLTreeAndTableProp> = (props) => {
    const [params, setParams] = useState<RequestYakURLResponse>({
        Page: 1,
        PageSize: 20,
        Total: 0,
        Resources: []
    })
    const [isRefresh, setIsRefresh] = useState<boolean>(false)
    const [selected, setSelected] = useState<TreeNode>({} as TreeNode)
    const [selectedNode, setSelectedNode] = useState<TreeNode[]>([])
    const [data, setData] = useState<TreeNode[]>([])
    // const [treeData, setTreeData] = useState<TreeNode[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const onRowClick = useMemoizedFn((record: TreeNode) => {
        setSelected(record) // 更新当前选中的行
        // setWebShell(record)
        console.log(record)
    })
    const [pagination
        , setPagination] = useState<PaginationSchema>({
        ...genDefaultPagination(20, 1),
        OrderBy: "created_at",
        Order: "desc"
    })

    const [total, setTotal] = useState(0)


    const columns: ColumnsTypeProps[] = useMemo<ColumnsTypeProps[]>(() => {
        return [
            {
                title: "类型",
                dataKey: "Type",
                width: 40,
                render: (_, t: TreeNode) => (
                    t.data?.ResourceType === "dir" ? <FolderOpenOutlined/> : <FileOutlined/>
                )
            },
            {
                title: "名称",
                dataKey: "Name",
                width: 300,
                render: (_, t: TreeNode) => (
                    t.data?.ResourceName
                )
            },
            {
                title: "大小",
                dataKey: "Size",
                width: 300,
                render: (_, t: TreeNode) => (
                    t.data?.SizeVerbose
                )
            },
            {
                title: "修改时间",
                dataKey: "ModifiedTimestamp",
                width: 300,
                render: (_, t: TreeNode) => t.data?.ModifiedTimestamp ? formatTimestamp(t.data?.ModifiedTimestamp) : "-"
            },
            {
                title: "权限",
                dataKey: "Permission",
                width: 300,
                render: (_, t: TreeNode) =>
                    <YakitTag color='bluePurple'>
                        {t.data?.Extra.filter(i => i.Key === 'perm').map(i => i.Value).join('')}
                    </YakitTag>
            }
        ]
    }, [])

    const [currentSelectItem, setCurrentSelectItem] = useState<TreeNode>()
    useEffect(() => {
        if (!selected) return
        setCurrentSelectItem(selected)
    }, [selected])

    useEffect(() => {
        if (loading) return
        setLoading(true)
    }, [])

    const update = useMemoizedFn(
        (page?: number, limit?: number, order?: string, orderBy?: string, extraParam?: any) => {
            const paginationProps = {
                ...pagination,
                Page: page || 1,
                PageSize: 20,
            }
            // setLoading(true)
            const finalParams = {
                ...params,
                ...(extraParam ? extraParam : {}),
                Pagination: paginationProps
            }
        })
    const onTableChange = useDebounceFn(
        (page: number, limit: number, sorter: SortProps, filter: any) => {

            setTimeout(() => {
                // setData()
            }, 10)
        },
        {wait: 500}
    ).run

    const refList = useMemoizedFn(() => {
        setParams({
            Page: 1,
            PageSize: 20,
            Total: 0,
            Resources: []
        })
        setTimeout(() => {
            setLoading(false)
        }, 10)
    })

    // const [currentPath, setCurrentPath] = useState<string>("behinder:///C:/Vuln/apache-tomcat-8.5.84/webapps/S2-032?mode=list&id=" + props.Id)
    const [currentPath, setCurrentPath] = useState<string>(props.shellType + ":///C:/Users/Administrator/Desktop/apache-tomcat-8.5.84/?mode=list&id=" + props.Id)

    const fileMenuData = [
        {
            key: "file-curd", label: "文件操作",
            children: [
                {key: "file-curd-open", label: "打开"},
                {key: "file-curd-edit", label: "编辑"},
                {key: "file-curd-copy", label: "复制文件名"},
                {key: "file-curd-delete", label: "删除", itemIcon: <TrashIcon/>},
            ]
        }
    ]

    const [yakUrl, setYakUrl] = useState<YakURL>({} as YakURL);

    const [content, setContent] = useState<string>('');

    const [shouldEdit, setShouldEdit] = useState(false);
    const contentRef = useRef(content);

    useEffect(() => {
        if (shouldEdit && content) {
            const edit = showYakitModal({
                title: "编辑文件",
                width: "60%",
                onCancelText: "返回",
                onOkText: "保存",
                content: (
                    <>
                        <div style={{height: 500, overflow: "hidden"}}>
                            <YakitEditor
                                type={"text"}
                                value={content}
                                setValue={value => {
                                    setContent(value);
                                    contentRef.current = value;
                                }}
                            />
                        </div>
                        <Divider type='vertical' style={{margin: "5px 0px 0px 5px", top: 1}}/>
                    </>
                ),
                onOk: () => {
                    const newYakUrl = {...yakUrl};  // 创建一个新的对象，复制 yakUrl 的所有属性
                    newYakUrl.Query = newYakUrl.Query.map(queryItem => {
                        if (queryItem.Key === 'mode') {
                            return {...queryItem, Value: 'append'};  // 如果键是 'mode'，则将值改为 'show'
                        } else {
                            return queryItem;  // 否则保持原样
                        }
                    });

                    console.log("content: ", contentRef.current)  // 使用 ref 的值
                    requestYakURLList({
                        url: newYakUrl,
                        method: "PUT",
                        body: Buffer.from(contentRef.current)
                    }).then((r) => {
                        console.log(r);
                        edit.destroy();
                    }).catch((e) => {
                            yakitFailed(`更新失败: ${e}`);
                        }
                    );
                    setShouldEdit(false);  // 在保存后重置 shouldEdit
                    edit.destroy();
                },
                onCancel: () => {
                    edit.destroy();
                    setShouldEdit(false);  // 在保存后重置 shouldEdit
                },

                modalAfterClose: () => edit && edit.destroy(),
            });
            setShouldEdit(false); // 在弹出模态框后重置 shouldEdit
        }

    }, [content, shouldEdit]);

    const showFile = (url: YakURL) => {
        const newYakUrl = {...url};  // 创建一个新的对象，复制 yakUrl 的所有属性
        console.log("newYakUrl", newYakUrl)
        newYakUrl.Query = newYakUrl.Query.map(queryItem => {
            if (queryItem.Key === 'mode') {
                return {...queryItem, Value: 'show'};  // 如果键是 'mode'，则将值改为 'show'
            } else {
                return queryItem;  // 否则保持原样
            }
        });

        requestYakURLList({url: newYakUrl}).then(
            (rsp) => {
                // const newContent = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.ValueBytes || '';
                // const contentStr = Buffer.from(newContent).toString()
                const contentStr = rsp.Resources[0]?.Extra.find(extra => extra.Key === 'content')?.Value || '';
                console.log(contentStr);
                setContent(contentStr);
                setShouldEdit(true);  // 设置 shouldEdit 为 true
            }
        ).finally(() => {
                setLoading(false);
            }
        );
    }

    const fileMenuSelect = useMemoizedFn((key: string) => {
        if (!selected) return
        switch (key) {
            case "file-curd-open":
                const url = selected.data!.Url
                console.log("selected.data!.Url ", selected.data!.Url)
                setYakUrl(url);
                showFile(url)
                break
            case "file-curd-edit":
            // updateFile(selected.data!.Url, setLoading)
        }
    })

    const onRowContextMenu = (rowData: TreeNode, _, event: React.MouseEvent) => {
        if (rowData.data?.HaveChildrenNodes) return
        if (rowData) {
            setSelected(rowData)
        }
        showByCustom(
            {
                reactNode: (
                    <div className={mitmStyles["context-menu-custom"]}>
                        <YakitMenu
                            data={fileMenuData as YakitMenuItemProps[]}
                            width={150}
                            onClick={({key}) => {
                                fileMenuSelect(key)
                            }}
                        />
                    </div>
                ),
                height: 266,
                width: 158
            },
            event.clientX,
            event.clientY
        )
    }
    const [goBackTree, setGoBackTree] = useState<TreeNode[]>([]);
    const webTreeRef = useRef<any>()

    const [refreshTreeFlag, setRefreshTreeFlag] = useState<boolean>(false)
    const [searchURL, setSearchURL] = useState<string>("")

    return (
        <ResizeBox
            freeze={true}
            firstRatio={'20%'}
            firstNode={
                <WebTree
                    onWebTreeData={(webTreeData) => {
                        console.log("webTreeData", webTreeData)
                        setSelectedNode(webTreeData)
                        setLoading(false)
                    }}
                    height={300}
                    ref={webTreeRef}
                    schema={"behinder"}
                    filePath={"C:/Users/Administrator/Desktop/apache-tomcat-8.5.84/"}
                    fileQuery={"mode=list&id=1"}
                    searchPlaceholder='请输入域名进行搜索，例baidu.com'
                    treeQueryparams={""}
                    refreshTreeFlag={refreshTreeFlag}
                    onSelectNodes={(nodes) => {
                        console.log()
                        setSelectedNode(nodes)
                    }}
                    // onGetUrl={(searchURL, includeInUrl) => {
                    //     setSearchURL(searchURL)
                    //     // setIncludeInUrl(includeInUrl)
                    // }}
                    // resetTableAndEditorShow={(table, editor) => {
                    //     // setOnlyShowFirstNode(table)
                    //     // setSecondNodeVisible(editor)
                    // }}
                    // raw={currentPath}
                    // goBackTree={goBackTree}
                    // onDataChange={
                    //     (newData) => {
                    //         // 在这里，你可以访问新的 `data` 的值
                    //         // setTreeData(newData)
                    //         console.log("WebShellURLTreeAndTable", newData)
                    //         setData(newData)
                    //         setTotal(newData.length)
                    //         setLoading(false)
                    //     }
                    // }
                    // onNodeSelect={
                    //     (node) => {
                    //         console.log("setSelectedNode ", node)
                    //         setSelectedNode(node)
                    //     }
                    // }
                    // onCurrentPath={
                    //     (path) => {
                    //         console.log("onCurrentPath ", path)
                    //         setCurrentPath(path)
                    //     }
                    // }
                />
            }
            secondNodeStyle={{height: "100%"}}
            secondNode={
                <div className={cveStyles["cve-list"]}>
                    <TableVirtualResize<TreeNode>
                        // query={params}
                        titleHeight={36}
                        size='middle'
                        renderTitle={
                            <div className={cveStyles["cve-list-title-body"]}>
                                <div className={cveStyles["cve-list-title-left"]}>
                                    <div className={cveStyles["cve-list-title"]}>文件列表</div>
                                    <Space>
                                        <Tooltip title='刷新会重置所有查询条件'>
                                            <Button
                                                size={"middle"}
                                                type={"link"}
                                                onClick={() => {
                                                }}
                                                icon={<RefreshIcon/>}
                                            />
                                        </Tooltip>
                                    </Space>
                                    <div className={cveStyles["cve-list-total"]}>
                                        <span>Total</span>
                                        <span className={cveStyles["cve-list-total-number"]}>{total}</span>
                                    </div>
                                </div>
                                <div className={cveStyles["cve-list-title-extra"]} style={{width: "70%"}}>
                                    <Button size={"small"}
                                            type={"link"}
                                            onClick={() => {
                                                console.log("goBackTree ", selected.data!.Url)
                                                goBack(selected.data!.Url, setLoading, setGoBackTree)
                                            }}
                                            icon={<ChevronLeftIcon/>}
                                    />
                                    <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>
                                    <span style={{paddingRight: "5px"}}>Path:</span>
                                    <YakitInput
                                        onChange={(e) => setCurrentPath(e.target.value)}
                                        value={currentPath}
                                    />

                                    <Divider type='vertical' style={{margin: "0px 8px 0px 0px", top: 1}}/>

                                </div>

                            </div>
                        }
                        isRefresh={isRefresh}
                        renderKey='key'
                        data={selectedNode.length > 0 ? selectedNode : data}
                        loading={loading}
                        enableDrag={true}
                        columns={columns}
                        onRowClick={onRowClick}
                        // onRowDoubleClick={onRowDoubleClick}
                        pagination={{
                            page: pagination.Page,
                            limit: pagination.Limit,
                            total,
                            onChange: update
                        }}
                        onRowContextMenu={onRowContextMenu}
                        currentSelectItem={currentSelectItem}
                        onChange={onTableChange}
                        isShowTotal={true}
                    />
                </div>

            }
        />
    )
}


interface WebShellURLTreeProp {
}

export const WebShellURLTree: React.FC<WebShellURLTreeProp> = (props) => {

    return (
        <>
            <p>WebShellURLTree</p>
        </>
    )
}