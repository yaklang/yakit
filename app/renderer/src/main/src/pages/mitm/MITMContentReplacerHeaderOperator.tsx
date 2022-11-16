import React, {useEffect, useState} from "react";
import {Button, Divider, Form, Space, Spin, Tag} from "antd";
import {showModal} from "@/utils/showModal";
import {InputInteger, InputItem, SelectOne, SwitchItem} from "@/utils/inputUtil";


export interface HTTPHeader {
    Header: string
    Value: string
}

export interface HTTPCookieSetting {
    Key: string
    Value: string
    Path: string
    Domain: string
    Expires: number
    MaxAge: number
    Secure: boolean
    HttpOnly: boolean
    SameSiteMode: "default" | "lax" | "strict" | "none"
}


export interface InputHTTPHeaderProp {
    onHeaderChange: (headers: HTTPHeader[]) => any
    headers: HTTPHeader[]
}

interface InputHTTPCookieFormProp {
    onChange: (i: HTTPCookieSetting) => any
}

const InputHTTPCookieForm: React.FC<InputHTTPCookieFormProp> = (props) => {
    const [params, setParams] = useState<HTTPCookieSetting>({
        Domain: "",
        Expires: 0,
        HttpOnly: false,
        Key: "",
        MaxAge: 0,
        Path: "",
        SameSiteMode: "default",
        Secure: false,
        Value: ""
    });
    const [advanced, setAdvanced] = useState(false);

    return <>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()

                props.onChange(params)
            }}
        >
            <InputItem
                label={"Cookie Key"} required={true}
                setValue={Key => setParams({...params, Key})}
                value={params.Key}
                autoComplete={[
                    "JSESSION", "PHPSESSION",
                    "SESSION", "admin",
                    "test", "debug",
                ]}
            />
            <InputItem required={true} label={"Cookie Value"} setValue={Value => setParams({...params, Value})}
                       value={params.Value}/>
            <Divider orientation={"left"}>
                <Space>
                    高级配置
                    <SwitchItem
                        value={advanced} setValue={setAdvanced} formItemStyle={{marginBottom: 0, width: 100}}
                        size={"small"}
                    />
                </Space>
            </Divider>
            {advanced && <>
                <InputItem label={"Path"} setValue={Path => setParams({...params, Path})} value={params.Path}/>
                <InputItem label={"Domain"} setValue={Domain => setParams({...params, Domain})} value={params.Domain}/>
                <SwitchItem label={"HttpOnly"} setValue={HttpOnly => setParams({...params, HttpOnly})}
                            value={params.HttpOnly}/>
                <SwitchItem
                    label={"Secure"} setValue={Secure => setParams({...params, Secure})} value={params.Secure}
                    help={"仅允许 Cookie 在 HTTPS 生效"}
                />
                <SelectOne label={"SameSite 策略"} data={[
                    {value: "default", text: "默认策略"},
                    {value: "lax", text: "Lax 策略"},
                    {value: "strict", text: "Strict 策略"},
                    {value: "none", text: "不设置"},
                ]} setValue={SameSiteMode => setParams({...params, SameSiteMode})} value={params.SameSiteMode}/>
                <InputInteger label={"Expires 时间戳"} setValue={Expires => setParams({...params, Expires})}
                              value={params.Expires}/>
                <InputInteger label={"MaxAge"} setValue={MaxAge => setParams({...params, MaxAge})}
                              value={params.MaxAge}/>
            </>}
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 添加该 Cookie </Button>
            </Form.Item>
        </Form>
    </>
};

interface InputHTTPHeaderFormProps {
    onChange: (h: HTTPHeader) => any
}

const InputHTTPHeaderForm: React.FC<InputHTTPHeaderFormProps> = (props) => {
    const [header, setHeader] = useState<HTTPHeader>({Header: "", Value: ""});
    return <>
        <Form
            labelCol={{span: 5}} wrapperCol={{span: 14}}
            onSubmitCapture={e => {
                e.preventDefault()

                props.onChange(header)
            }}
        >
            <InputItem
                label={"HTTP Header"}
                autoComplete={[
                    "Authorization",
                    "Accept",
                    "Accept-Charset",
                    "Accept-Encoding",
                    "Accept-Language",
                    "Accept-Ranges",
                    "Cache-Control",
                    "Cc",
                    "Connection",
                    "Content-Id",
                    "Content-Language",
                    "Content-Length",
                    "Content-Transfer-Encoding",
                    "Content-Type",
                    "Cookie",
                    "Date",
                    "Dkim-Signature",
                    "Etag",
                    "Expires",
                    "From",
                    "Host",
                    "If-Modified-Since",
                    "If-None-Match",
                    "In-Reply-To",
                    "Last-Modified",
                    "Location",
                    "Message-Id",
                    "Mime-Version",
                    "Pragma",
                    "Received",
                    "Return-Path",
                    "Server",
                    "Set-Cookie",
                    "Subject",
                    "To",
                    "User-Agent",
                    "X-Forwarded-For",
                    "Via",
                    "X-Imforwards",
                    "X-Powered-By",
                ]}
                setValue={Header => setHeader({...header, Header})} value={header.Header}/>
            <InputItem
                label={"HTTP Value"}
                setValue={Value => setHeader({...header, Value})} value={header.Value}
            />
            <Form.Item colon={false} label={" "}>
                <Button type="primary" htmlType="submit"> 设置该 Header </Button>
            </Form.Item>
        </Form>
    </>
}

export const InputHTTPHeader: React.FC<InputHTTPHeaderProp> = (props) => {
    const [headers, setHeaders] = useState<HTTPHeader[]>(props.headers);
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        props.onHeaderChange([...headers])
    }, [headers])

    const reload = () => {
        setLoading(true)
        setTimeout(() => setLoading(false), 200)
    };

    return <Form.Item label={"HTTP Header"} help={<Space style={{marginBottom: 6}}>
        <Button.Group size={"small"}>
            <Button type={"primary"} onClick={() => {
                const m = showModal({
                    title: "输入新的 HTTP Header",
                    width: "50%",
                    content: (
                        <InputHTTPHeaderForm onChange={a => {
                            setHeaders([...headers, a])
                            m.destroy()
                        }}/>
                    )
                })
            }}>新增 HTTP Header </Button>
        </Button.Group>
        <div>新增额外 HTTP Header，强制覆盖或新增</div>
    </Space>}>
        <Space>
            <Tag color={"green"} onClick={() => {
                alert(JSON.stringify(headers))
            }}>已设置{headers.length}个额外 Header</Tag>
            {loading ? <Spin/> : headers.map((i, index) => {
                return <Tag
                    color={"geekblue"}
                    closable={true}
                    onClose={() => {
                        headers.splice(index, 1)
                        setHeaders([...headers])
                        reload()
                    }}
                >{i.Header}</Tag>
            })}
        </Space>
    </Form.Item>
};

export interface InputHTTPCookieProp {
    cookies: HTTPCookieSetting[]
    onCookiesChange: (cookies: HTTPCookieSetting[]) => any
}

export const InputHTTPCookie: React.FC<InputHTTPCookieProp> = (props) => {
    const [cookies, setCookies] = useState<HTTPCookieSetting[]>(props.cookies);
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        props.onCookiesChange([...cookies])
    }, [cookies])

    const reload = () => {
        setLoading(true)
        setTimeout(() => setLoading(false), 200)
    }

    return <Form.Item label={"HTTP Cookie"} help={<Space style={{marginBottom: 6}}>
        <Button.Group size={"small"}>
            <Button type={"primary"} onClick={() => {
                const m = showModal({
                    title: "输入新的 Cookie 值",
                    width: "50%",
                    content: (
                        <InputHTTPCookieForm onChange={(e) => {
                            setCookies([...cookies, e])
                            m.destroy()
                        }}/>
                    )
                })
            }}>新增 HTTP Cookie </Button>
        </Button.Group>
        <div>新增额外 HTTP Cookie，有较高优先级，覆盖现有设置或新增</div>
    </Space>}>
        <Space>
            <Tag color={"orange"} onClick={() => {
                alert(JSON.stringify(cookies))
            }}>已设置{cookies.length}个额外 Cookie</Tag>
            {loading ? <Spin/> : cookies.map((i, index) => {
                return <Tag
                    closable={true}
                    onClose={() => {
                        cookies.splice(index, 1)
                        setCookies([...cookies])
                        reload()
                    }}
                    color={"geekblue"}
                >{i.Key}</Tag>
            })}
        </Space>
    </Form.Item>
};