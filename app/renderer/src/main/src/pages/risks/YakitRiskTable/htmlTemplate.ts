/**漏洞与风险 导出html模板 */
export const getHtmlTemplate = () => {
    const html = `<!DOCTYPE html>
    <html>
    
    <head>
        <meta charset="UTF-8" />
        <title>Yakit</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/antd/4.21.7/antd.min.css" />
    
    </head>
    
    <body>
        <div id="root"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.19.3/babel.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>
    
        <script src="https://cdnjs.cloudflare.com/ajax/libs/antd/4.21.7/antd.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/ant-design-icons/5.3.7/index.umd.min.js"></script>

        <script src="./data.js"></script>
    
        <script type="text/babel">
            const { Table, Tag, Descriptions, Input, Space, Button } = antd
            const { SearchOutlined } = icons
            const data = initData||[]
            const SeverityMapTag = [
                {
                    key: ["info", "fingerprint", "infof", "default"],
                    value: "title-info",
                    name: "信息",
                    tag: "#56c991"
                },
                { key: ["low"], value: "title-low", name: "低危", tag: "#ffb660" },
                {
                    key: ["middle", "warn", "warning", "medium"],
                    value: "title-middle",
                    name: "中危",
                    tag: "#f28b44"
                },
                { key: ["high"], value: "title-high", name: "高危", tag: "#f4736b" },
                {
                    key: ["fatal", "critical", "panic"],
                    value: "title-fatal",
                    name: "严重",
                    tag: "#cb2318"
                }
            ]
            const handleSearch = (
                selectedKeys,
                confirm,
                dataIndex,
            ) => {
                confirm();
            };
    
            const handleReset = (clearFilters) => {
                clearFilters();
            };
            const getColumnSearchProps = (dataIndex) => ({
                filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
                    <div style={{ padding: 8 }}>
                        <Input
                            placeholder='Search'
                            value={selectedKeys[0]}
                            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
                            onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
                            style={{ marginBottom: 8, display: 'block' }}
                        />
                        <Space>
                            <Button
                                type="primary"
                                onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
                                icon={<SearchOutlined />}
                                size="small"
                                style={{ width: 90 }}
                            >
                                Search
                            </Button>
                            <Button
                                onClick={() => clearFilters && handleReset(clearFilters)}
                                size="small"
                                style={{ width: 90 }}
                            >
                                Reset
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => {
                                    confirm({ closeDropdown: false });
                                }}
                            >
                                Filter
                            </Button>
                        </Space>
                    </div>
                ),
                filterIcon: (filtered) => (
                    <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
                ),
                onFilter: (value, record) =>
                    record[dataIndex]
                        .toString()
                        .toLowerCase()
                        .includes((value).toLowerCase())
            });
            const columns = [
                {
                    title: "序号",
                    dataIndex: "Id",
                    key: "Id",
                    sorter: (a, b) => +a.Id - +b.Id,
                    sortDirections: ['descend', 'ascend'],
                },
                {
                    title: "标题",
                    dataIndex: "TitleVerbose",
                    key: "TitleVerbose",
                    render: (_, record) => record?.TitleVerbose || record.Title || "-",
                    ...getColumnSearchProps('TitleVerbose'),
                },
                {
                    title: "类型",
                    dataIndex: "RiskTypeVerbose",
                    key: "RiskTypeVerbose"
                },
                {
                    title: "等级",
                    dataIndex: "Severity",
                    key: "Severity",
                    filters: [
                        {
                            text: '信息',
                            value: '信息',
                        },
                        {
                            text: '低危',
                            value: '低危',
                        },
                        {
                            text: '中危',
                            value: '中危',
                        },
                        {
                            text: '高危',
                            value: '高危',
                        },
                        {
                            text: '严重',
                            value: '严重',
                        },
                    ],
                    onFilter: (value, record) => {
                        const v = SeverityMapTag.filter((item) => item.key.includes(record.Severity || ""))[0]
                        const severity = v ? v.name : record.Severity || "-"
                        return severity.includes(value)
                    },
                    render: (_, i) => {
                        const title = SeverityMapTag.filter((item) => item.key.includes(i.Severity || ""))[0]
                        return (
                            <Tag color={title?.tag}>
                                {title ? title.name : i.Severity || "-"}
                            </Tag>
                        )
                    },
                },
                {
                    title: "IP",
                    dataIndex: "IP",
                    key: "IP"
                },
                {
                    title: "Url",
                    dataIndex: "Url",
                    key: "Url"
                },
                {
                    title: "Tag",
                    dataIndex: "Tags",
                    key: "Tag",
                    render: (text) => !!text ? text.replaceAll("|", ",") : "-"
                },
                {
                    title: "发现时间",
                    dataIndex: "CreatedAt",
                    key: "CreatedAt",
                    render: (time) => moment.unix(+time).format('YYYY-MM-DD HH:mm:ss'),
                    sorter: (a, b) => +a.CreatedAt - +b.CreatedAt,
                    sortDirections: ['descend', 'ascend'],
                },
            ]
            const App = () => (
                <Table
                    style={{ padding: 24 }}
                    columns={columns}
                    expandable={{
                        expandedRowRender: (info) => {
                            const details = {
                                request: '',
                                response: ''
                            };
                            if (info.Details) {
                                const value = !!info.Details ? JSON.parse(info.Details) : {
                                    request: '',
                                    response: ''
                                }
                                details.request = !!value.request ? value.request : ''
                                details.response = !!value.response ? value.response : ''
                            }
                            return (
                                <>
                                    <Descriptions bordered size='small' column={3}>
                                        <Descriptions.Item label='IP' contentStyle={{ minWidth: 120 }}>
                                            {info.IP || "-"}
                                        </Descriptions.Item>
                                        <Descriptions.Item label='ID'>{info.Id || "-"}</Descriptions.Item>
                                        <Descriptions.Item label='端口'>{info.Port || "-"}</Descriptions.Item>
                                        <Descriptions.Item label='Host'>{info.Host || "-"}</Descriptions.Item>
                                        <Descriptions.Item label='类型'>
                                            {(info?.RiskTypeVerbose || info.RiskType).replaceAll("NUCLEI-", "")}
                                        </Descriptions.Item>
                                        <Descriptions.Item label='来源'>{info?.FromYakScript || "漏洞检测"}</Descriptions.Item>
                                        <Descriptions.Item label='反连Token' contentStyle={{ minWidth: 120 }}>
                                            {info?.ReverseToken || "-"}
                                        </Descriptions.Item>
                                        <Descriptions.Item label='Hash'>{info?.Hash || "-"}</Descriptions.Item>
                                        <Descriptions.Item label='验证状态'>
                                            <Tag color={!info.WaitingVerified ? "success" : "info"}>
                                                {!info.WaitingVerified ? "已验证" : "未验证"}
                                            </Tag>
                                        </Descriptions.Item>
    
                                        <>
                                            <Descriptions.Item label='漏洞描述' span={3} contentStyle={{ whiteSpace: "pre-wrap" }}>
                                                {info.Description || "-"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label='解决方案' span={3} contentStyle={{ whiteSpace: "pre-wrap" }}>
                                                {info.Solution || "-"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label='Parameter' span={3}>
                                                {info.Parameter || "-"}
                                            </Descriptions.Item>
                                            <Descriptions.Item label='Payload' span={3}>
                                                {info.Payload || "-"}
                                            </Descriptions.Item>
                                            {
                                                !!details.request && <>
                                                    <Descriptions.Item label='Request' span={3}>
                                                        <div style={{ height: 300, overflow: 'auto', }}>
                                                            <pre style={{ whiteSpace: 'pre-wrap' }}><code>{details.request}</code></pre>
                                                        </div>
                                                    </Descriptions.Item>
                                                </>
                                            }
                                            {
                                                !!details.response && <>
                                                    <Descriptions.Item label='Response' span={3}>
                                                        <div style={{ height: 300, overflow: 'auto', }}>
                                                            <pre style={{ whiteSpace: 'pre-wrap' }}><code>{details.response}</code></pre>
                                                        </div>
                                                    </Descriptions.Item>
                                                </>
                                            }
                                            <Descriptions.Item label='详情' span={3}>
                                                <div style={{ maxHeight: 180, overflow: "auto" }}>{info.Details || "-"}</div>
                                            </Descriptions.Item>
                                        </>
                                    </Descriptions>
                                </>
                            )
                        },
                    }}
                    dataSource={data}
                    rowKey='Id'
                    pagination={
                        {
                            defaultPageSize: 100
                        }
                    }
                />
            )
            ReactDOM.render(<App />, document.getElementById("root"))
        </script>
    </body>
    
    </html>`
    return html
}
