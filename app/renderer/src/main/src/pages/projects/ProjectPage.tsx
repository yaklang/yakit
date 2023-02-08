import React, {useEffect, useState} from "react";
import {Alert, Button, Empty, Form, PageHeader, Popconfirm, Progress, Space, Spin, Table, Tag} from "antd";
import {AutoCard} from "@/components/AutoCard";
import {formatTimestamp} from "@/utils/timeUtil";
import {useMemoizedFn} from "ahooks";
import {failed, info} from "@/utils/notification";
import {InputFileNameItem, InputItem, OneLine} from "@/utils/inputUtil";
import {showByCursorMenuByEvent, showByCursorMenu} from "@/utils/showByCursor";
import {openABSFileLocated} from "@/utils/openWebsite";
import {callCopyToClipboard} from "@/utils/basic";
import {DeleteOutlined, ReloadOutlined} from "@ant-design/icons/lib";
import {showModal} from "@/utils/showModal";
import {randomString} from "@/utils/randomUtil";

export interface ProjectPageProp {

}

export interface ProjectDescription {
    Id: number
    ProjectName: string
    Description: string
    CreatedAt: number
    DatabasePath: string
}

interface ProjectsResponse {
    Pagination: { Page: number, Limit: number },
    Projects: ProjectDescription[],
    Total: number
};

const {ipcRenderer} = window.require("electron");

export const ProjectPage: React.FC<ProjectPageProp> = (props) => {
    const [current, setCurrent] = useState<ProjectDescription>();
    const [response, setResponse] = useState<ProjectsResponse>({
        Pagination: {Limit: 10, Page: 1}, Projects: [], Total: 0
    })
    const page = response.Pagination.Page || 1;
    const limit = response.Pagination.Limit || 10;
    const total = response.Total;
    const projects = response.Projects;
    const [loading, setLoading] = useState(false);

    const [reload, setReload] = useState(false);
    useEffect(() => {
        if (!reload) {
            return
        }
        setCurrent(undefined);
        setTimeout(() => setReload(false), 1000)
    }, [reload])

    const reloadPage = useMemoizedFn(() => {
        setReload(true)
    })

    useEffect(() => {
        ipcRenderer.invoke("GetCurrentProject", {}).then(rsp => {
            setCurrent(rsp)
        })
    }, [reload])

    const isDefault = current?.ProjectName === "[default]";

    const update = useMemoizedFn((iPage?: number, iLimit?: number) => {
        setLoading(true)
        ipcRenderer.invoke("GetProjects", {
            Pagination: {Page: iPage || page, Limit: iLimit || limit, Order: "desc", OrderBy: "created_at"}
        }).then((rsp: ProjectsResponse) => {
            try {
                setResponse(rsp)
            } catch (e) {
                failed("处理项目数据失败: " + `${e}`)
            }
        }).catch(e => {
            failed(`查看全部 Projects 失败：${e}`)
        }).finally(() => setTimeout(() => setLoading(false), 300))
    })

    useEffect(() => {
        if (!current) {
            return
        }
        update(1)
    }, [current])

    const exportButton = (name: string, label: string) => <Button size={"small"} onClick={(e) => {
        showByCursorMenuByEvent({
            content: [
                {title: "加密导出", onClick: () => exportProject(name, true)},
                {title: "明文导出", onClick: () => exportProject(name, false)}
            ]
        }, e)
    }}>{label}</Button>

    if (reload) {
        return <Spin tip={"重新加载项目数据"}/>
    }

    return <AutoCard bordered={false} title={<Space>
        项目管理（Beta）
        {isDefault && <Tag color={"green"}>默认数据库</Tag>}
        {current && <div>{current?.DatabasePath}</div>}
    </Space>} size={"small"} extra={<div>
        <Button.Group size={"small"}>
            <Button type={"link"} icon={<ReloadOutlined/>} onClick={() => {
                update(1)
            }}/>
            {current && exportButton(current.ProjectName, "导出当前项目")}
            <Button onClick={() => {
                importProject(() => update(1))
            }}>导入项目</Button>
            <Button type={"primary"} onClick={() => {
                createNewProject(reloadPage)
            }}>新建项目</Button>
        </Button.Group>
    </div>} loading={loading}>
        {!current && <Empty>无法找到当前项目管理信息</Empty>}
        {current && <div style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexFlow: "column"
        }}>
            <Alert message={<Space>
                <Tag color={"orange"}>{formatTimestamp(current?.CreatedAt || 0)}</Tag>
                {current?.Description}
            </Space>} type={"info"}/>
            <div style={{backgroundColor: "#fff", flex: "1"}}>
                <Table<ProjectDescription>
                    style={{marginTop: 8, height: "100%"}}
                    size={"small"} bordered={true}
                    dataSource={projects}
                    scroll={{x: "auto"}}
                    columns={[
                        {title: "ID", dataIndex: "Id", width: 50},
                        {
                            title: "项目名称",
                            render: (p: ProjectDescription) => <OneLine width={150}>{p.ProjectName}</OneLine>
                        },
                        {
                            title: "备注与描述",
                            render: (p: ProjectDescription) => <OneLine maxWidth={400}>{p.Description}</OneLine>
                        },
                        {
                            title: "项目路径", render: (p: ProjectDescription) => {
                                return <Button type={"link"} size={"small"} onClick={(e) => {
                                    showByCursorMenu({
                                        content: [
                                            {
                                                title: "打开数据库文件", onClick: () => {
                                                    openABSFileLocated(p.DatabasePath)
                                                },
                                            },
                                            {
                                                title: "复制路径", onClick: () => {
                                                    callCopyToClipboard(p.DatabasePath)
                                                }
                                            }
                                        ]
                                    }, e.clientX, e.clientY)
                                }}>
                                    <OneLine width={250} overflow={"hidden"}>
                                        {p.DatabasePath}
                                    </OneLine>
                                </Button>
                            }, width: 250,
                        },
                        {
                            title: "项目创建时间", render: (p: ProjectDescription) => {
                                return <Tag color={"geekblue"}>{formatTimestamp(p.CreatedAt)}</Tag>
                            }, width: 120,
                        },
                        {
                            title: "操作", fixed: "right", width: 250, render: (p: ProjectDescription) => {
                                return <Space>
                                    {p.ProjectName !== current?.ProjectName && <Popconfirm
                                        title={"确定要切换项目吗？"}
                                        onConfirm={() => {
                                            ipcRenderer.invoke("SetCurrentProject", {
                                                ProjectName: p.ProjectName
                                            }).then(e => {
                                                info("已切换数据库")
                                                reloadPage()
                                            }).catch(e => {
                                                failed("切换数据库失败：" + `${e}`)
                                            })
                                        }}
                                    >
                                        <Button size={"small"}>
                                            设为当前项目
                                        </Button>
                                    </Popconfirm>}
                                    <Button size={"small"} onClick={() => {
                                        openABSFileLocated(p.DatabasePath)
                                    }}>
                                        打开位置
                                    </Button>
                                    {exportButton(p.ProjectName, "导出项目")}
                                    {p.ProjectName !== '[default]' && <Popconfirm title={"确定要删除该项目？"} onConfirm={() => {
                                        ipcRenderer.invoke("RemoveProject", {ProjectName: p.ProjectName}).then(e => {
                                            info("删除成功")
                                            reloadPage()
                                        }).catch(e => {
                                            failed(`删除失败: ${e}`)
                                        })
                                    }}>
                                        <Button size={"small"} type={"link"} danger={true} icon={<DeleteOutlined/>}/>
                                    </Popconfirm>}
                                </Space>
                            }
                        }
                    ]}
                    pagination={{
                        pageSize: limit || 10,
                        showSizeChanger: true,
                        total: total,
                        showTotal: (t) => <Tag>共{t}个</Tag>,
                        pageSizeOptions: ["5", "10", "20"],
                        onChange: (page: number, limit?: number) => {
                            update(page, limit)
                        },
                        onShowSizeChange: (old, limit) => {
                            update(1, limit || 10)
                        }
                    }}
                >

                </Table>
                {/*{JSON.stringify(current)}*/}
            </div>
        </div>}
    </AutoCard>;
}

const exportProject = (name: string, allowPassword: boolean) => {
    const m = showModal({
        title: "导出项目文件",
        width: "60%", maskClosable: false,
        content: (
            <ExportProject onClose={() => m.destroy()} allowPassword={allowPassword} projectName={name}/>
        )
    })
}

interface ExportProjectProp {
    projectName: string
    allowPassword: boolean
    onClose: () => any
}

interface ProjectIOProgress {
    TargetPath: string
    Percent: number
    Verbose: string
}

const ExportProject: React.FC<ExportProjectProp> = (props) => {
    const [token, _] = useState(randomString(40));
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [infos, setInfos] = useState<string[]>([]);
    const [percent, setPercent] = useState<number>(0.0);
    const [path, setPath] = useState<string>("");

    useEffect(() => {
        if (!token) {
            return
        }
        const infos: string[] = [];
        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            if (!!data.Verbose) {
                infos.push(data.Verbose)
            }

            if (data.Percent > 0) {
                setPercent(data.Percent)
            }
            if (!!data.TargetPath) {
                setPath(data.TargetPath)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[ExportProject] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            setLoading(false)
            info("[ExportProject] finished")
        })

        const id = setInterval(() => {
            setInfos([...infos])
        }, 1000)

        return () => {
            clearInterval(id);

            ipcRenderer.invoke("cancel-ExportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [token])

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            if (props.allowPassword && password === "") {
                failed("需要设置密码")
                return
            }

            if (props.allowPassword && password.length > 15) {
                failed("密码最多15位")
                return
            }

            setLoading(true)
            ipcRenderer.invoke("ExportProject", {
                ProjectName: props.projectName,
                Password: props.allowPassword ? password : ""
            }, token)
        }}
    >
        <InputItem label={"项目名"} value={props.projectName} disable={true}/>
        {props.allowPassword &&
        <InputItem label={"密码"} help={"为导出的项目设置密码"} required={true} value={password} setValue={setPassword}
                   disable={loading}/>}
        <Form.Item colon={false} label={" "} help={<div style={{width: 230}}>
            {percent > 0 && <Progress
                percent={Math.floor((percent || 0) * 100)}
            />}
        </div>}>
            <Space>
                <Button type="primary" htmlType="submit" loading={loading}> 导出项目 </Button>
                {!!path && <Button disabled={loading} type={"link"} onClick={() => {
                    openABSFileLocated(path)
                }}><OneLine maxWidth={200} overflow={"hidden"}>
                    路径: {path}
                </OneLine></Button>}
            </Space>
        </Form.Item>
        <Form.Item label={" "} colon={false}>
            <Space direction={"vertical"}>
                {infos.map(i => <div>{i}</div>)}
            </Space>
        </Form.Item>
    </Form>
};

interface NewProjectProp {
    onChangeProject: () => any
}

const createNewProject = (onReload: () => any) => {
    const m = showModal({
        title: "创建新项目", width: "60%", content: (
            <NewProject onChangeProject={() => {
                m.destroy()
                onReload()
            }}/>
        )
    })
}

const NewProject: React.FC<NewProjectProp> = (props) => {
    const [name, setName] = useState("project-" + randomString(8));
    const [desc, setDesc] = useState("暂无描述与备注信息");

    return <Form
        labelCol={{span: 5}} wrapperCol={{span: 14}}
        onSubmitCapture={e => {
            e.preventDefault()

            ipcRenderer.invoke("IsProjectNameValid", {
                ProjectName: name
            }).then(e => {
                ipcRenderer.invoke("NewProject", {
                    ProjectName: name,
                    Description: desc,
                }).then(() => {
                    info("创建新项目成功")
                    const m = showModal({
                        title: "创建项目成功", content: (
                            <Space>
                                <Button type={"primary"} onClick={() => {
                                    ipcRenderer.invoke("SetCurrentProject", {ProjectName: name}).then(() => {
                                        info(`切换项目成功!`)
                                        props.onChangeProject()
                                        m.destroy()
                                    }).catch(e => {
                                        failed("切换项目失败：" + `${e}`)
                                    })
                                }}>立即切换项目</Button>
                                <Button onClick={() => {
                                    m.destroy()
                                }}>稍后手动操作</Button>
                            </Space>
                        ),
                    })
                }).catch(e => {
                    info(`创建新项目失败：${e}`)
                })
            }).catch(e => {
                info("创建新项目失败，项目名校验不通过：" + `${e}`)
            })
        }}
    >
        <InputItem label={`项目名`} value={name} setValue={setName}/>
        <InputItem label={`项目描述`} value={desc} setValue={setDesc}/>
        <Form.Item colon={false} label={" "}>
            <Button type="primary" htmlType="submit"> 导入当前项目 </Button>
        </Form.Item>
    </Form>
};

interface ImportProjectProp {
    onClose: () => any
    onProjectUpdate: () => any
}

const importProject = (update: () => any) => {
    const m = showModal({
        title: "从文件导入项目", content: (
            <ImportProject onClose={() => m.destroy()} onProjectUpdate={update}/>
        ), width: "70%"
    })
}

const ImportProject: React.FC<ImportProjectProp> = (props) => {
    const [name, setName] = useState("");
    const [filename, setFilename] = useState("");
    const [token, _] = useState(randomString(40));
    const [percent, setPercent] = useState(0.0);
    const [infos, setInfos] = useState<string[]>([]);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (percent >= 1) {
            props.onProjectUpdate()
        }
    }, [percent])

    useEffect(() => {
        const infos: string[] = [];
        ipcRenderer.on(`${token}-data`, async (e, data: ProjectIOProgress) => {
            if (!!data.Verbose) {
                infos.push(data.Verbose)
            }
            if (data.Percent > 0) {
                setPercent(data.Percent)
            }
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[ImportProject] error:  ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info("[ImportProject] finished")
            setLoading(false)
        })

        const id = setInterval(() => {
            setInfos([...infos])
        }, 1000);

        return () => {
            clearInterval(id)
            ipcRenderer.invoke("cancel-ImportProject", token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    return <Form labelCol={{span: 5}} wrapperCol={{span: 14}} onSubmitCapture={e => {
        e.preventDefault()

        if (filename === "") {
            failed("项目路径不能为空")
            return
        }

        setLoading(true)
        ipcRenderer.invoke(`ImportProject`, {
            LocalProjectName: name,
            ProjectFilePath: filename,
            Password: password
        }, token)
    }}>
        <InputItem disable={loading} label={"项目名"} help={"项目名如果为空，则集成项目文件中的名字"} value={name} setValue={setName}/>
        <InputFileNameItem required={true} label={"选择项目文件"} setFileName={setFilename} filename={filename}
                           loadContent={false}
                           disabled={loading}/>
        <InputItem label={"密码"} placeholder={"如无密码则不填"} value={password} setValue={setPassword} disable={loading}/>
        <Form.Item colon={false} label={" "} help={<div style={{width: 350}}>
            {loading && <Progress percent={Math.floor((percent || 0) * 100)}/>}
        </div>}>
            <Button disabled={loading} type="primary" htmlType="submit"> 导入项目 </Button>
        </Form.Item>
        <Form.Item colon={false} label={" "}>
            {infos.map(i => <div>{i}</div>)}
        </Form.Item>
    </Form>
};