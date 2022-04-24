import React, {memo, useEffect, useRef, useState} from "react"
import {Input, Button, Divider, Upload, Empty, Modal} from "antd"
import {
    StarOutlined,
    StarFilled,
    ArrowLeftOutlined,
    PlusCircleOutlined,
    DownloadOutlined,
    PictureOutlined,
    ZoomInOutlined,
    ZoomOutOutlined
} from "@ant-design/icons"
import {YakScript} from "../invoker/schema"
import {useGetState, useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed} from "../../utils/notification"
import {TagColor} from "./YakitStoreOnline"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon} from "@/assets/icons"

import "./YakitPluginInfo.scss"
import {AutoSpin} from "@/components/AutoSpin"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import {showFullScreenMask} from "@/components/functionTemplate/showByContext"

const {ipcRenderer} = window.require("electron")

export interface YakitPluginInfoProp {
    info: YakScript
    onBack: () => any
    index: number
    isAdmin: boolean
}
interface uploadImgInfo {
    name: string
    path: string | ArrayBuffer | null
}

export const YakitPluginInfo: React.FC<YakitPluginInfoProp> = (props) => {
    const {info, onBack, index, isAdmin} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [plugin, setPlugin, getPlugin] = useGetState<YakScript>()
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<uploadImgInfo[]>([])

    useEffect(() => {
        setLoading(true)
        ipcRenderer
            .invoke("GetYakScriptById", {Id: info.Id})
            .then((e: YakScript) => {
                if (e) setPlugin(e)
            })
            .catch((e: any) => {
                failed("Query Plugin Info By ID failed")
            })
            .finally(() => setTimeout(() => setLoading(false), 300))
    }, [])

    const pluginStar = useMemoizedFn(() => {
        alert("点赞成功")
    })

    const pluginAdd = useMemoizedFn(() => {
        alert("添加成功")
    })

    const pluginComment = useMemoizedFn(() => {
        const number = files.length
        alert(`评论内容：${commentText}${number !== 0 ? "和" + number + "张图片" : ""}`)
    })

    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)
    const [commentName, setCommentName] = useState<string>("")
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<uploadImgInfo[]>([])

    const pluginReply = useMemoizedFn((name: string) => {
        setCommentName(name)
        setCommentShow(true)
    })
    const pluginReplyComment = useMemoizedFn(() => {
        setCommentName("")
        setCommentInputText("")
        setCommentFiles([])
        setCommentShow(false)
        const number = commentFiles.length
        alert(`评论内容：${commentInputText}${number !== 0 ? "和" + number + "张图片" : ""}`)
    })
    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCommentName("")
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })

    const pluginCommentStar = useMemoizedFn((name: string) => {
        alert(`给${name}点赞操作成功`)
    })

    const pluginExamine = useMemoizedFn((flag: boolean) => {
        alert(`插件审核${flag ? "通过" : "不通过"}`)
    })

    if (!plugin) {
        return (
            <div className='yakit-plugin-info-container'>
                <Empty description='无插件信息' />
            </div>
        )
    }

    return (
        <AutoSpin spinning={loading}>
            <div className='yakit-plugin-info-container'>
                <div
                    className='plugin-info-width plugin-info-body'
                    style={{padding: isAdmin ? "16px 8px 76px 0" : "16px 8px 4px 0"}}
                >
                    <div className='vertical-center info-back' onClick={onBack}>
                        <ArrowLeftOutlined />
                        <span style={{marginLeft: 4}}>返回首页</span>
                    </div>

                    <div className='info-header'>
                        <div className='header-title-body'>
                            <span className='content-ellipsis title-body-text' title={plugin.ScriptName}>
                                {plugin.ScriptName}
                            </span>
                            {isAdmin && (
                                <div className='vertical-center'>
                                    <div
                                        className={`${
                                            TagColor[["failed", "success", "not"][index % 3]].split("|")[0]
                                        } title-body-admin-tag`}
                                    >
                                        {TagColor[["failed", "success", "not"][index % 3]].split("|")[1]}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className='header-btn-body'>
                            <Button
                                className='btn-like'
                                icon={
                                    index % 5 === 4 ? (
                                        <StarFilled className='solid-star' />
                                    ) : (
                                        <StarOutlined className='empty-star' />
                                    )
                                }
                                onClick={pluginStar}
                            >
                                喜欢
                            </Button>
                            <Button className='btn-add' icon={<PlusCircleOutlined />} onClick={pluginAdd}>
                                添加
                            </Button>
                        </div>
                    </div>

                    <div className='info-preface'>
                        <div className='preface-author'>
                            <img
                                src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                                className='author-img'
                            />
                            <div className='vertical-center' style={{marginLeft: 8}}>
                                <span className='author-name'>{plugin.Author || "anonymous"}</span>
                            </div>
                        </div>

                        <Divider className='preface-divider' type='vertical' />

                        <div className='vertical-center'>
                            <div className='preface-time'>
                                <span className='time-title'>最新更新时间</span>
                                <span className='time-style'>{"2022/04/12"}</span>
                            </div>
                        </div>

                        <div className='preface-star-and-download' style={{margin: "0 24px 0 26px"}}>
                            <div className='vertical-center'>
                                <StarOutlined className='star-download-icon' />
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{index * 7 + 3}</span>
                            </div>
                        </div>

                        <div className='preface-star-and-download'>
                            <div className='vertical-center'>
                                <DownloadOutlined className='star-download-icon' />
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{index * 7 + 3}</span>
                            </div>
                        </div>
                    </div>

                    <div className='info-summary'>
                        <div className='summary-introduce'>
                            <div className='introduce-title'>概述</div>

                            <div className='introduce-content'>
                                <CollapseParagraph value={plugin.Help} isLine={true} rows={3}></CollapseParagraph>
                            </div>
                        </div>

                        {/* <div style={{marginTop: 24}}></div> */}
                    </div>

                    <div className='info-comment-box'>
                        <div className='box-header'>
                            <span className='header-title'>用户评论</span>
                            <span className='header-subtitle'>{index + 102}</span>
                        </div>

                        <PluginCommentInput
                            value={commentText}
                            setValue={setCommentText}
                            files={files}
                            setFiles={setFiles}
                            onSubmit={pluginComment}
                        ></PluginCommentInput>
                    </div>

                    <div className='info-comment-content'>
                        {[
                            {
                                name: 1,
                                value: [
                                    {name: 2, value: 1},
                                    {name: 3, value: 2}
                                ]
                            },
                            {name: 4, value: 1},
                            {name: 5, value: 1}
                        ].map((item, index) => {
                            return (
                                <div key={item.name}>
                                    <PluginCommentInfo
                                        info={plugin}
                                        value={item.value}
                                        onReply={pluginReply}
                                        onStar={pluginCommentStar}
                                    ></PluginCommentInfo>
                                    {index !== [1, 2, 3].length - 1 && <div className='comment-separator'></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {isAdmin && (
                    <div className='plugin-info-examine'>
                        <div className='plugin-info-width info-examine-body'>
                            <div className='vertical-center'>
                                <div className='examine-title'>审核意见</div>
                            </div>
                            <div className='vertical-center'>
                                <div>
                                    <Button className='examine-reject' onClick={() => pluginExamine(false)}>
                                        不通过
                                    </Button>
                                    <Button className='examine-adopt' onClick={() => pluginExamine(true)}>
                                        通过
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Modal
                    wrapClassName='comment-reply-dialog'
                    title={<div className='header-title'>回复@{commentName}</div>}
                    visible={commentShow}
                    centered={true}
                    footer={null}
                    destroyOnClose={true}
                    onCancel={() => setCommentSencondShow(true)}
                >
                    <PluginCommentInput
                        value={commentInputText}
                        setValue={setCommentInputText}
                        files={commentFiles}
                        setFiles={setCommentFiles}
                        onSubmit={pluginReplyComment}
                    ></PluginCommentInput>
                </Modal>
                <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
            </div>
        </AutoSpin>
    )
}

interface PluginCommentInputProps {
    value: string
    setValue: (value: string) => any
    files: uploadImgInfo[]
    setFiles: (files: uploadImgInfo[]) => any
    onSubmit: () => any
}
// 评论功能的部分组件-输入组件、展示图片组件、上传和提交按钮组件
const PluginCommentInput = (props: PluginCommentInputProps) => {
    const {value, setValue, files, setFiles, onSubmit} = props

    const fileRef = useRef<any[]>([])
    const time = useRef<any>(null)

    const uploadImg = () => {
        const imgs: uploadImgInfo[] = []
        for (let file of fileRef.current) {
            let reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                imgs.push({name: file.name, path: reader.result})
                if (imgs.length === fileRef.current.length) {
                    setFiles(files.concat(imgs))
                    fileRef.current = []
                }
            }
        }
    }

    return (
        <div className='plugin-info-comment-input'>
            <div className='box-input'>
                <Input.TextArea
                    className='input-stlye'
                    value={value}
                    autoSize={{minRows: 1, maxRows: 6}}
                    placeholder='说点什么...'
                    onChange={(e) => setValue(e.target.value)}
                ></Input.TextArea>
            </div>

            {files.length !== 0 && (
                <div className='box-upload'>
                    {files.map((item, index) => {
                        return (
                            <div key={item.name} className='upload-img-opt'>
                                <img
                                    key={item.name}
                                    src={item.path as any}
                                    className='opt-pic'
                                    onClick={() => {
                                        let m = showFullScreenMask(
                                            <PluginMaskImage info={item} />,
                                            "mask-img-display",
                                            undefined,
                                            (e) => {
                                                if ((e.target as any).className === "mask-img-display") m.destroy()
                                            }
                                        )
                                    }}
                                />
                                <div
                                    className='opt-del'
                                    onClick={() => {
                                        const arr = cloneDeep(files)
                                        arr.splice(index, 1)
                                        setFiles(arr)
                                    }}
                                >
                                    x
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className='box-btn'>
                <Upload
                    accept='image/jpeg,image/png,image/jpg,image/gif'
                    multiple={true}
                    disabled={files.length >= 3}
                    showUploadList={false}
                    beforeUpload={(file: any) => {
                        if (file) fileRef.current.push(file)

                        if (time.current) {
                            clearTimeout(time.current)
                            time.current = null
                        }
                        time.current = setTimeout(() => {
                            if (fileRef.current.length !== 0) uploadImg()
                        }, 200)

                        return false
                    }}
                >
                    <Button
                        type='link'
                        disabled={files.length >= 3}
                        icon={<PictureOutlined className={files.length >= 3 ? "btn-pic-disabled" : "btn-pic"} />}
                    />
                </Upload>

                <Button
                    disabled={!value && files.length === 0}
                    type={value || files.length !== 0 ? "primary" : undefined}
                    className={value || files.length !== 0 ? "" : "btn-submit"}
                    onClick={onSubmit}
                >
                    评论
                </Button>
            </div>
        </div>
    )
}

interface PluginMaskImageProps {
    info: uploadImgInfo
}
// 全屏预览图功能组件
const PluginMaskImage = memo((props: PluginMaskImageProps) => {
    const {info} = props

    const [imgSize, setImgSize] = useState<number>(0)
    const [width, setWidth, getWidth] = useGetState<number>(540)
    const [height, setHeight, getHeight] = useGetState<number>(330)

    const expandSize = useMemoizedFn(() => {
        if (imgSize >= 3) return false
        setWidth(width + 160)
        setHeight(height + 130)
        setImgSize(imgSize + 1)
    })
    const narrowSize = useMemoizedFn(() => {
        if (imgSize <= 0) return false
        setWidth(width - 160)
        setHeight(height - 130)
        setImgSize(imgSize - 1)
    })
    const downloadImg = () => {
        alert(`下载${info.name}图片成功`)
    }

    return (
        <>
            <div className='mask-display-icon-body'>
                <ZoomInOutlined className='display-icon' onClick={expandSize} />
                <ZoomOutOutlined className='display-icon display-icon-middle' onClick={narrowSize} />
                <DownloadOutlined className='display-icon' onClick={downloadImg} />
            </div>
            <img
                className='mask-disply-image'
                style={{width: getWidth(), height: getHeight()}}
                src={info.path as any}
            />
        </>
    )
})

interface PluginCommentInfoProps {
    info: YakScript
    value: number | {name: number; value: number}[]
    onReply: (name: string) => any
    onStar: (name: string) => any
}
// 评论内容单条组件
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {info, value, onReply, onStar} = props

    return (
        <div className='plugin-comment-opt'>
            <div className='opt-author-img'>
                <img
                    src='https://profile-avatar.csdnimg.cn/87dc7bdc769b44fd9b82afb51946be1a_freeb1rd.jpg'
                    className='author-img-style'
                />
            </div>

            <div className='opt-comment-body'>
                <div className='comment-body-name'>{info.Author || "anonymous"}</div>

                <div className='comment-body-content'>
                    <CollapseParagraph
                        value={info.Help}
                        rows={2}
                        valueConfig={{className: "content-style"}}
                    ></CollapseParagraph>
                </div>

                <div className='comment-body-time-func'>
                    <div>
                        <span>{"2022/04/04  12:30"}</span>
                    </div>
                    <div className='func-comment-and-star'>
                        <div className='comment-and-star' onClick={() => onReply(info.Author || "anonymous")}>
                            {/* @ts-ignore */}
                            <OnlineCommentIcon className='icon-style' />
                        </div>
                        <div
                            style={{marginLeft: 18}}
                            className='comment-and-star'
                            onClick={() => onStar(info.Author || "anonymous")}
                        >
                            {/* @ts-ignore */}
                            <OnlineThumbsUpIcon className='icon-style' />
                            <span className='num-style'>{123}</span>
                        </div>
                    </div>
                </div>

                {Array.isArray(value) && (
                    <div className='comment-body-subcomment'>
                        {value.map((item, index) => {
                            return (
                                <div key={item.name}>
                                    <PluginCommentInfo
                                        info={info}
                                        value={item.value}
                                        onReply={onReply}
                                        onStar={onStar}
                                    ></PluginCommentInfo>
                                    {index !== value.length - 1 && <div className='comment-separator'></div>}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
})
