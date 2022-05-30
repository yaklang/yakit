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
import {useGetState, useMemoizedFn} from "ahooks"
import cloneDeep from "lodash/cloneDeep"
import {failed, success} from "../../utils/notification"
import {TagColor} from "./YakitStoreOnline"
import {CollapseParagraph} from "./CollapseParagraph"
import {OnlineCommentIcon, OnlineThumbsUpIcon} from "@/assets/icons"
import {PluginStoreProps, PagemetaProps} from "./YakitPluginInfo.d"
import {AutoSpin} from "@/components/AutoSpin"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import {showFullScreenMask} from "@/components/functionTemplate/showByContext"
import moment from "moment"
import numeral from "numeral"
import "./YakitPluginInfo.scss"
import {getCommentRange} from "typescript"
import Item from "antd/lib/list/Item"

const {ipcRenderer} = window.require("electron")
export interface YakitPluginInfoProp {
    info: PluginStoreProps
    onBack: () => any
    index: number
    isAdmin: boolean
    isLogin: boolean
}
interface uploadImgInfo {
    name: string
    path: string | ArrayBuffer | null
}

interface CommentListProps {
    id: number
    created_at: number
    updated_at: number
    plugin_id: number
    root_id: number
    parent_id: number
    user_id: number
    user_name: string
    head_img: string
    message: string
    message_img: string
    like_num: number
    child: string
    is_stars?: boolean
}
interface CommentResponsesProps {
    data: CommentListProps[]
    pagemeta: PagemetaProps | null
}

export const YakitPluginInfo: React.FC<YakitPluginInfoProp> = (props) => {
    const {info, onBack, index, isAdmin, isLogin} = props

    const [loading, setLoading] = useState<boolean>(false)
    const [commentLoading, setCommentLoading] = useState<boolean>(false)
    const [plugin, setPlugin] = useGetState<PluginStoreProps>()

    const [commentResponses, setCommentResponses] = useGetState<CommentResponsesProps>()
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<uploadImgInfo[]>([])

    useEffect(() => {
        getPluginDetail()
        // getComment()
    }, [])

    const getPluginDetail = useMemoizedFn(() => {
        let url = "fetch-plugin-detail-unlogged"
        if (isLogin) {
            url = "fetch-plugin-detail"
        }
        setLoading(true)
        ipcRenderer
            .invoke(url, {id: info.id})
            .then((res) => {
                const item = (res?.from && JSON.parse(res.from)) || {}
                setPlugin(item)
            })
            .catch((e: any) => {
                failed("插件详情获取失败:" + e)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })

    const getComment = useMemoizedFn(() => {
        const params = {
            plugin_id: info.id,
            page: commentResponses?.pagemeta?.page || 1
        }
        ipcRenderer
            .invoke("fetch-plugin-comment", params)
            .then((res) => {
                const item = (res?.from && JSON.parse(res.from)) || {}
                setCommentResponses(item)
            })
            .catch((e: any) => {
                failed("评论查询失败:" + e)
            })
    })

    const pluginStar = useMemoizedFn(() => {
        if (plugin) {
            plugin.is_stars = !plugin.is_stars
            setPlugin({...plugin})
            success("点赞成功")
        }
    })

    const pluginAdd = useMemoizedFn(() => {
        alert("添加成功")
    })
    // 新增评论
    const pluginComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!commentText) {
            failed("请输入评论内容")
            return
        }
        const imgList = ["https://yakit-online.oss-cn-hongkong.aliyuncs.com/comment/20225271151321653623492jpg"]
        const params = {
            plugin_id: plugin.id,
            message_img: imgList,
            parent_id: 0,
            root_id: 0,
            message: commentText
        }
        addComment(params)
    })

    const addComment = useMemoizedFn((params: any) => {
        setCommentLoading(true)
        ipcRenderer
            .invoke("add-plugin-comment", params)
            .then((res) => {
                getComment()

                if (commentText) setCommentText("")
                if (commentInputText) setCommentInputText("")
                if (commentSecondShow) setCommentShow(false)
                if (currentComment?.id) setCurrentComment(null)
            })
            .catch((e: any) => {
                failed("评论错误" + e)
            })
            .finally(() => {
                setTimeout(() => setCommentLoading(false), 200)
            })
    })

    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)
    const [currentComment, setCurrentComment] = useState<CommentListProps | null>()
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<uploadImgInfo[]>([])

    const pluginReply = useMemoizedFn((item: CommentListProps) => {
        setCurrentComment(item)
        setCommentShow(true)
    })
    const pluginReplyComment = useMemoizedFn(() => {
        // setCommentName("")
        // setCommentInputText("")
        // setCommentFiles([])
        // setCommentShow(false)
        // const number = commentFiles.length
        // alert(`评论内容：${commentInputText}${number !== 0 ? "和" + number + "张图片" : ""}`)
        if (!plugin) return
        if (!currentComment?.id) return
        if (!commentInputText) {
            failed("请输入评论内容")
            return
        }
        const imgList = ["https://yakit-online.oss-cn-hongkong.aliyuncs.com/comment/20225271151321653623492jpg"]
        const params = {
            plugin_id: plugin.id,
            message_img: imgList,
            parent_id: currentComment?.id,
            root_id: currentComment?.id,
            message: commentInputText
        }
        addComment(params)
    })
    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCurrentComment(null)
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })

    const pluginCommentStar = useMemoizedFn((item: CommentListProps) => {
        const params = {
            comment_id: item.id,
            operation: item.is_stars ? "remove" : "add"
        }
        ipcRenderer
            .invoke("add-plugin-comment-stars", params)
            .then((res) => {
                if (!commentResponses) return
                const index: number = commentResponses.data.findIndex((ele: CommentListProps) => ele.id === item.id)
                if (index !== -1) {
                    commentResponses.data[index].is_stars = !commentResponses.data[index].is_stars
                    commentResponses.data[index].like_num += 1
                    setCommentResponses({
                        ...commentResponses,
                        data: [...commentResponses.data]
                    })
                }
            })
            .catch((e: any) => {
                failed("点赞失败" + e)
            })
            .finally(() => {})
    })

    const pluginExamine = useMemoizedFn((status: number) => {
        setLoading(true)
        ipcRenderer
            .invoke("fetch-plugin-audit", {id: plugin?.id, status})
            .then((res) => {
                if (plugin) setPlugin({...plugin, status})
                success(`插件审核${status === 1 ? "通过" : "不通过"}`)
            })
            .catch((e: any) => {
                failed("审核失败" + e)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
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
                            <span className='content-ellipsis title-body-text' title={plugin.script_name}>
                                {plugin.script_name}
                            </span>
                            {isAdmin && (
                                <div className='vertical-center'>
                                    <div
                                        className={`${
                                            TagColor[["not", "success", "failed"][plugin.status]].split("|")[0]
                                        } title-body-admin-tag`}
                                    >
                                        {TagColor[["not", "success", "failed"][plugin.status]].split("|")[1]}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className='header-btn-body'>
                            <Button
                                className='btn-like'
                                icon={
                                    plugin.is_stars ? (
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
                            <img src={plugin.head_img} className='author-img' />
                            <div className='vertical-center' style={{marginLeft: 8}}>
                                <span className='author-name'>{plugin.authors || "anonymous"}</span>
                            </div>
                        </div>

                        <Divider className='preface-divider' type='vertical' />

                        <div className='vertical-center'>
                            <div className='preface-time'>
                                <span className='time-title'>最新更新时间</span>
                                <span className='time-style'>
                                    {info?.updated_at && moment.unix(info.updated_at).format("YYYY年MM月DD日")}
                                </span>
                            </div>
                        </div>
                        <div className='preface-star-and-download' style={{margin: "0 24px 0 26px"}}>
                            <div className='vertical-center' onClick={pluginStar}>
                                {plugin.is_stars ? (
                                    <StarFilled className='solid-star' />
                                ) : (
                                    <StarOutlined className='star-download-icon' />
                                )}
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{plugin.stars}</span>
                            </div>
                        </div>

                        <div className='preface-star-and-download'>
                            <div className='vertical-center'>
                                <DownloadOutlined className='star-download-icon' />
                            </div>
                            <div className='vertical-center'>
                                <span className='star-download-num'>{plugin.downloaded_total}</span>
                            </div>
                        </div>
                    </div>

                    <div className='info-summary'>
                        <div className='summary-introduce'>
                            <div className='introduce-title'>概述</div>

                            <div className='introduce-content'>
                                <CollapseParagraph value={plugin.content} isLine={true} rows={3}></CollapseParagraph>
                            </div>
                        </div>
                    </div>

                    <div className='info-comment-box'>
                        <div className='box-header'>
                            <span className='header-title'>用户评论</span>
                            <span className='header-subtitle'>{commentResponses?.pagemeta?.total || 0}</span>
                        </div>

                        <PluginCommentInput
                            value={commentText}
                            setValue={setCommentText}
                            files={files}
                            setFiles={setFiles}
                            onSubmit={pluginComment}
                            loading={commentLoading}
                            isLogin={isLogin}
                        ></PluginCommentInput>
                    </div>

                    <div className='info-comment-content'>
                        {commentResponses?.data?.map((item: CommentListProps, index) => (
                            <>
                                <PluginCommentInfo
                                    key={item.id}
                                    info={item}
                                    onReply={pluginReply}
                                    onStar={pluginCommentStar}
                                    isStarChange={item.is_stars}
                                />
                                <div className='comment-separator'></div>
                            </>
                        ))}
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
                                    <Button className='examine-reject' onClick={() => pluginExamine(2)}>
                                        不通过
                                    </Button>
                                    <Button className='examine-adopt' onClick={() => pluginExamine(1)}>
                                        通过
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Modal
                    wrapClassName='comment-reply-dialog'
                    title={<div className='header-title'>回复@{currentComment?.user_name}</div>}
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
                        loading={commentLoading}
                    ></PluginCommentInput>
                </Modal>
                <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
            </div>
        </AutoSpin>
    )
}

interface PluginCommentInputProps {
    value: string
    loading: boolean
    isLogin?: boolean
    setValue: (value: string) => any
    files: uploadImgInfo[]
    setFiles: (files: uploadImgInfo[]) => any
    onSubmit: () => any
}
// 评论功能的部分组件-输入组件、展示图片组件、上传和提交按钮组件
const PluginCommentInput = (props: PluginCommentInputProps) => {
    const {value, loading, isLogin, setValue, files, setFiles, onSubmit} = props

    const fileRef = useRef<any[]>([])
    const time = useRef<any>(null)

    const uploadImg = (file) => {
        // const imgs: uploadImgInfo[] = []
        // for (let file of fileRef.current) {
        //   let reader = new FileReader()
        //   reader.readAsDataURL(file)
        //   reader.onload = () => {
        //     imgs.push({ name: file.name, path: reader.result })
        //     if (imgs.length === fileRef.current.length) {
        //       setFiles(files.concat(imgs))
        //       fileRef.current = []
        //     }
        //   }
        // }
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
                {isLogin && (
                    <Upload
                        accept='image/jpeg,image/png,image/jpg,image/gif'
                        method='post'
                        multiple={true}
                        disabled={files.length >= 3}
                        showUploadList={false}
                        beforeUpload={(file: any) => {
                            if (file) {
                                console.log("file", file)
                                ipcRenderer
                                    .invoke("upload-img", {path: file.path, type: file.type, name: file.name})
                                    .then((res) => {
                                        console.log(123, res)
                                    })
                                // uploadImg(file)
                            }
                            return false
                        }}
                        // customRequest={uploadImg}
                    >
                        <Button
                            type='link'
                            disabled={files.length >= 3}
                            icon={<PictureOutlined className={files.length >= 3 ? "btn-pic-disabled" : "btn-pic"} />}
                        />
                    </Upload>
                )}
                {(isLogin && (
                    <Button
                        disabled={!value && files.length === 0}
                        type={value || files.length !== 0 ? "primary" : undefined}
                        className={value || files.length !== 0 ? "" : "btn-submit"}
                        onClick={onSubmit}
                        loading={loading}
                    >
                        评论
                    </Button>
                )) || <div className='un-login'>未登录</div>}
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
    info: CommentListProps
    key: number
    isStarChange?: boolean
    onReply: (name: CommentListProps) => any
    onStar: (name: CommentListProps) => any
}
// 评论内容单条组件
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {info, onReply, onStar, key, isStarChange} = props
    const [commentChildList, setCommentChildList] = useState<CommentListProps[]>()
    // 获取子评论列表
    const getChildComment = useMemoizedFn(() => {
        const params = {
            root_id: info.id,
            plugin_id: info.plugin_id
        }
        ipcRenderer
            .invoke("fetch-plugin-comment-reply", params)
            .then((res) => {
                const item = (res?.from && JSON.parse(res.from)) || {}
                console.log("评论child列表", item?.data)
                setCommentChildList(item?.data || [])
            })
            .catch((e: any) => {
                failed("评论查询失败:" + e)
            })
    })
    const onCommentChildStar = useMemoizedFn((childItem: CommentListProps) => {
        const params = {
            comment_id: childItem.id,
            operation: childItem.is_stars ? "remove" : "add"
        }
        ipcRenderer
            .invoke("add-plugin-comment-stars", params)
            .then((res) => {
                if (!commentChildList) return
                const index: number = commentChildList.findIndex((ele: CommentListProps) => ele.id === childItem.id)
                if (index !== -1) {
                    commentChildList[index].is_stars = !commentChildList[index].is_stars
                    if(childItem.is_stars){
                      commentChildList[index].like_num -= 1
                    }else{
                      commentChildList[index].like_num += 1
                    }
                   
                    setCommentChildList({
                        ...commentChildList
                    })
                }
            })
            .catch((e: any) => {
                failed("点赞失败" + e)
            })
            .finally(() => {})
    })
    return (
        <div className='plugin-comment-opt' key={key}>
            <div className='opt-author-img'>
                <img src={info.head_img} className='author-img-style' />
            </div>

            <div className='opt-comment-body'>
                <div className='comment-body-name'>{info.user_name || "anonymous"}</div>

                <div className='comment-body-content'>
                    <CollapseParagraph
                        value={info.message}
                        rows={2}
                        valueConfig={{className: "content-style"}}
                    ></CollapseParagraph>
                </div>

                <div className='comment-body-time-func'>
                    <div>
                        <span>{moment.unix(info.created_at).format("YYYY-MM-DD HH:mm")}</span>
                    </div>
                    <div className='func-comment-and-star'>
                        <div className='comment-and-star' onClick={() => onReply(info)}>
                            {/* @ts-ignore */}
                            <OnlineCommentIcon className='icon-style' />
                        </div>
                        <div style={{marginLeft: 18}} className='comment-and-star' onClick={() => onStar(info)}>
                            {/* @ts-ignore */}
                            {(isStarChange && <OnlineThumbsUpIcon className='icon-style-start' />) || (
                                // @ts-ignore
                                <OnlineThumbsUpIcon className='icon-style' />
                            )}
                            <span className='num-style'>{numeral(info.like_num).format("0,0")}</span>
                        </div>
                    </div>
                </div>
                <span onClick={getChildComment}>展开</span>
                {commentChildList?.map((childItem: CommentListProps, index: number) => (
                    <>
                        <PluginCommentInfo
                            key={childItem.id}
                            info={childItem}
                            onReply={onReply}
                            onStar={onCommentChildStar}
                        ></PluginCommentInfo>
                        <div className='comment-separator'></div>
                    </>
                ))}
            </div>
        </div>
    )
})
