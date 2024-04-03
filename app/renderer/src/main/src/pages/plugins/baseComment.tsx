import {API} from "@/services/swagger/resposeType"
import {useGetState, useMemoizedFn, useSize} from "ahooks"
import React, {useState, useEffect, memo,  useRef, useMemo} from "react"
import {useStore} from "@/store"
import {NetWorkApi} from "@/services/fetch"
import {failed, warn} from "@/utils/notification"
import {
    Upload,
    Input,
    Modal,
    Image,
    Avatar,
    InputRef
} from "antd"
import {
    LoadingOutlined,
    ExclamationCircleOutlined
} from "@ant-design/icons"
import numeral from "numeral"
import styles from "./baseComment.module.scss"
import moment from "moment"
import cloneDeep from "lodash/cloneDeep"
import {useCommenStore} from "@/store/comment"
import {SecondConfirm} from "@/components/functionTemplate/SecondConfirm"
import Login from "@/pages/Login"
import {fail} from "assert"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import classNames from "classnames"
import {UserPlatformType} from "../globalVariable"
import yakitImg from "@/assets/yakit.jpg"
import {randomAvatarColor} from "@/components/layout/FuncDomain"
import {PaperAirplaneIcon, ResizerIcon} from "@/assets/newIcon"
import {OutlinePhotographIcon, OutlineThumbupActiveIcon, OutlineThumbupIcon} from "@/assets/icon/outline"
import {CloseIcon} from "@/components/configNetwork/icon"
import {NewYakitTimeLineList} from "@/components/yakitUI/NewYakitTimeLineList/NewYakitTimeLineList"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {OnlineJudgment} from "./onlineJudgment/OnlineJudgment"
import {YakitTimeLineListRefProps} from "@/components/yakitUI/YakitTimeLineList/YakitTimeLineListType"
import {YakitCollapseText} from "@/components/yakitUI/YakitCollapseText/YakitCollapseText"
import {YakitModal} from "@/components/yakitUI/YakitModal/YakitModal"
const {ipcRenderer} = window.require("electron")

const limit = 20
interface PluginCommentProps {
    plugin: API.YakitPluginDetail
    isLogin: boolean
}

interface SearchCommentRequest {
    plugin_id: number
    limit: number
    page: number
}

interface CommentStarsProps {
    comment_id: number
    operation: string
}

export const PluginComment: React.FC<PluginCommentProps> = (props) => {
    const {plugin, isLogin} = props
    const [commentLoading, setCommentLoading] = useState<boolean>(false)
    const [commentText, setCommentText] = useState<string>("")
    const [files, setFiles] = useState<string[]>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [commentResponses, setCommentResponses] = useGetState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })
    const [commentInputText, setCommentInputText] = useState<string>("")
    const [commentFiles, setCommentFiles] = useState<string[]>([])
    const [currentComment, setCurrentComment] = useState<API.CommentListData | null>()
    const [commentShow, setCommentShow] = useState<boolean>(false)
    const [parentComment, setParentComment] = useState<API.CommentListData>()
    const [commentChildVisible, setCommentChildVisible] = useState<boolean>(false)
    const [commentSecondShow, setCommentSencondShow] = useState<boolean>(false)

    const ref = useRef(null)
    const size = useSize(ref)
    useEffect(() => {
        getComment(1)
        setFiles([])
        setCommentText("")
        handleClearTimeList()
    }, [plugin.id])
    useEffect(() => {
        if (!isLogin) {
            setFiles([])
            setCommentText("")
        }
    }, [isLogin])

    const getComment = useMemoizedFn((page: number = 1) => {
        const params: SearchCommentRequest = {
            plugin_id: plugin.id,
            limit,
            page
        }
        setLoading(true)
        NetWorkApi<SearchCommentRequest, API.CommentListResponse>({
            method: "get",
            url: "comment",
            params
        })
            .then((res) => {
                console.log("comment---", res.data)

                if (!res.data) {
                    res.data = []
                }
                const newCommentResponses = {
                    data: page === 1 ? res.data : commentResponses.data.concat(res.data),
                    pagemeta: res.pagemeta
                }
                const isMore =
                    res.data.length < limit || newCommentResponses.data.length === commentResponses.pagemeta.total
                ishasMore.current = !isMore
                setCommentResponses({
                    data: [...newCommentResponses.data],
                    pagemeta: res.pagemeta
                })
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const isLoading = useMemoizedFn(() => {
        Modal.confirm({
            title: "未登录",
            icon: <ExclamationCircleOutlined />,
            content: "登录后才可评论",
            cancelText: "取消",
            okText: "登录",
            onOk() {
                setLoginShow(true)
            },
            onCancel() {}
        })
    })
    // 新增评论
    const pluginComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!isLogin) {
            isLoading()
            return
        }
        if (!commentText && files.length === 0) {
            failed("请输入评论内容或者上传图片")
            return
        }
        const params = {
            plugin_id: plugin.id,
            message_img: files,
            parent_id: 0,
            root_id: 0,
            by_user_id: 0,
            message: commentText
        }
        addComment(params)
    })

    // 全局监听是否刷新子评论列表状态
    const {setCommenData} = useCommenStore()
    // 登录框状态
    const [loginshow, setLoginShow] = useState<boolean>(false)
    const addComment = useMemoizedFn((data: API.NewComment) => {
        NetWorkApi<API.NewComment, API.ActionSucceeded>({
            method: "post",
            url: "comment",
            data
        })
            .then((res) => {
                if (data.by_user_id && data.by_user_id > 0) {
                    // 刷新modal中子评论列表
                    setCommenData({
                        isRefChildCommentList: true
                    })
                }
                if (data.parent_id === 0) getComment(1)
                if (commentText) setCommentText("")
                if (files.length > 0) setFiles([])
                if (commentInputText) setCommentInputText("")
                if (currentComment?.id) setCurrentComment(null)
                if (commentFiles.length > 0) setCommentFiles([])
                if (commentShow) setCommentShow(false)
            })
            .catch((err) => {
                failed("评论错误" + err)
            })
            .finally(() => {
                setTimeout(() => setCommentLoading(false), 200)
            })
    })
    const pluginReply = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        setCurrentComment(item)
        setCommentShow(true)
    })
    const pluginReplyComment = useMemoizedFn(() => {
        if (!plugin) return
        if (!isLogin) {
            isLoading()
            return
        }
        if (!currentComment?.id) return
        if (!commentInputText && commentFiles.length === 0) {
            failed("请输入评论内容或者上传图片")
            return
        }
        const params = {
            plugin_id: plugin.id,
            message_img: commentFiles,
            parent_id: currentComment.root_id === 0 ? 0 : currentComment.id,
            root_id: currentComment.root_id || currentComment.id,
            by_user_id: currentComment.user_id,
            message: commentInputText
        }
        addComment(params)
    })
    const pluginCommentStar = useMemoizedFn((item: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        const params: CommentStarsProps = {
            comment_id: item.id,
            operation: item.is_stars ? "remove" : "add"
        }

        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                if (!commentResponses) return
                const index: number = commentResponses.data.findIndex((ele: API.CommentListData) => ele.id === item.id)
                if (index !== -1) {
                    if (item.is_stars) {
                        commentResponses.data[index].like_num -= 1
                        commentResponses.data[index].is_stars = false
                    } else {
                        commentResponses.data[index].like_num += 1
                        commentResponses.data[index].is_stars = true
                    }
                    setCommentResponses({
                        ...commentResponses,
                        data: [...commentResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("点赞失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoading(false), 200)
            })
    })
    const openCommentChildModel = (visible) => {
        setCommentChildVisible(visible)
    }

    const pluginCancelComment = useMemoizedFn((flag: number) => {
        if (flag === 2) {
            setCurrentComment(null)
            setCommentInputText("")
            setCommentFiles([])
            setCommentShow(false)
        }
        setCommentSencondShow(false)
    })
    const onSetValue = useMemoizedFn((value) => {
        if (!isLogin) {
            isLoading()
            return
        }
        setCommentText(value)
    })

    const timeListRef = useRef<YakitTimeLineListRefProps>(null)
    const ishasMore = useRef<boolean>(true)
    const handleClearTimeList = useMemoizedFn(() => {
        timeListRef.current?.onClear()
    })
    const loadMoreData = useMemoizedFn(() => {
        getComment(commentResponses.pagemeta.page + 1)
    })

    const rowsNum = useMemo(() => {
        if (size?.height) {
            if (size.height < 200) {
                return 1
            } else if (size?.height < 300) {
                return 2
            } else if (size?.height < 400) {
                return 3
            }
        }
    }, [size?.height])

    return (
        <div className={styles["comment-box"]} id='online-plugin-info-scroll' ref={ref}>
            {loginshow && <Login visible={loginshow} onCancel={() => setLoginShow(false)}></Login>}
            <div className={styles["info-comment-box"]}>
                <div className={styles["box-header"]}>
                    <span className={styles["header-title"]}>评论</span>
                    <span className={styles["header-subtitle"]}>{plugin.comment_num || 0}</span>
                </div>
                {isLogin && (
                    <PluginCommentUpload
                        loading={commentLoading}
                        value={commentText}
                        setValue={onSetValue}
                        files={files}
                        setFiles={setFiles}
                        onSubmit={pluginComment}
                        rows={rowsNum}
                    />
                )}
            </div>
            <div className={styles["comment-list-box"]}>
                {commentResponses.data.length > 0 ? (
                    <OnlineJudgment>
                        <NewYakitTimeLineList
                            ref={timeListRef}
                            loading={loading}
                            data={commentResponses.data}
                            renderItem={(info) => {
                                return (
                                    <PluginCommentInfo
                                        key={info.id}
                                        info={info}
                                        onReply={pluginReply}
                                        onStar={pluginCommentStar}
                                        isStarChange={info.is_stars}
                                        setParentComment={setParentComment}
                                        openCommentChildModel={openCommentChildModel}
                                    />
                                )
                            }}
                            hasMore={ishasMore.current}
                            loadMore={loadMoreData}
                        />
                    </OnlineJudgment>
                ) : (
                    <YakitEmpty style={{paddingTop: 48}} />
                )}
            </div>

            <PluginCommentChildModal
                visible={commentChildVisible}
                parentInfo={parentComment}
                onReply={pluginReply}
                onCancel={(val) => {
                    setParentComment(undefined)
                    setCommentChildVisible(val)
                }}
                isLogin={isLogin}
            />

            <YakitModal
                title={<div className={styles["header-title"]}>回复@{currentComment?.user_name}</div>}
                centered={true}
                footer={null}
                keyboard={false}
                maskClosable={false}
                width={560}
                visible={commentShow}
                destroyOnClose={true}
                bodyStyle={{padding: 0}}
                onCancel={() => setCommentSencondShow(true)}
            >
                <div style={{padding: "16px 24px 24px"}}>
                    {isLogin ? (
                        <PluginCommentUpload
                            loading={commentLoading}
                            value={commentInputText}
                            setValue={setCommentInputText}
                            files={commentFiles}
                            setFiles={setCommentFiles}
                            onSubmit={pluginReplyComment}
                            isAlwaysShow={true}
                        />
                    ) : (
                        <>请先登录</>
                    )}
                </div>
            </YakitModal>
            <SecondConfirm visible={commentSecondShow} onCancel={pluginCancelComment}></SecondConfirm>
        </div>
    )
}

interface PluginCommentInfoProps {
    info: API.CommentListData
    key: number
    isStarChange?: boolean
    isOperation?: boolean
    onReply: (name: API.CommentListData) => any
    onStar: (name: API.CommentListData) => any
    openCommentChildModel?: (visible: boolean) => any
    setParentComment?: (name: API.CommentListData) => any
}
// 评论内容单条组件
const PluginCommentInfo = memo((props: PluginCommentInfoProps) => {
    const {
        info,
        onReply,
        onStar,
        key,
        isStarChange,
        openCommentChildModel,
        setParentComment,
        isOperation = true
    } = props

    const message_img: string[] = (info.message_img && JSON.parse(info.message_img)) || []
    return (
        <div className={styles["plugin-comment-opt"]} key={key}>
            <div className={styles["opt-author-img"]}>
                <img src={info.head_img} className={styles["author-img-style"]} />
            </div>

            <div className={styles["opt-comment-body"]}>
                <div className={styles["comment-body-header"]}>
                    <div className={styles["comment-body-name"]}>{info.user_name || "anonymous"}</div>
                    <div className={styles["comment-dot"]}>·</div>
                    <div className={styles["comment-body-time"]}>
                        {moment.unix(info.created_at).format("YYYY-MM-DD HH:mm")}
                    </div>
                </div>

                <div className={styles["comment-body-content"]}>
                    {/* <CollapseParagraph value={`${info.message}`} rows={2} valueConfig={{className: "content-style"}}>
                        {info.by_user_name && (
                            <span>
                                回复<span className={styles["content-by-name"]}>{info.by_user_name}</span>:
                            </span>
                        )}
                    </CollapseParagraph> */}
                    <YakitCollapseText content={info.message} rows={2} lineHeight={20} fontSize={14} />
                </div>
                <PluginCommentImages images={message_img} key={info.id} size={90} />
                {/* <Space>
                    {message_img.map((url) => (
                        <Image key={url + info.id} src={url as any} className={styles["comment-pic"]} />
                    ))}
                </Space> */}
                <div className={styles["comment-body-option"]}>
                    {isOperation && (
                        <div className={styles["func-comment-and-star"]}>
                            <div className={styles["comment-and-star"]} onClick={() => onReply(info)}>
                                <YakitButton type='secondary2' className={styles["reply-btn"]}>
                                    回复
                                </YakitButton>
                            </div>
                            <div
                                style={{marginLeft: 16}}
                                className={classNames(styles["comment-and-star"])}
                                onClick={() => onStar(info)}
                            >
                                {(isStarChange && (
                                    <OutlineThumbupActiveIcon
                                        className={classNames(styles["hover-active"], styles["icon-style-start"])}
                                    />
                                )) || (
                                    <OutlineThumbupIcon
                                        className={classNames(styles["hover-active"], styles["icon-style"])}
                                    />
                                )}
                                <span className={classNames(styles["num-style"])}>
                                    {numeral(info.like_num).format("0,0")}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                {isOperation && info.reply_num > 0 && (
                    <a
                        className={styles["comment-reply"]}
                        onClick={() => {
                            if (openCommentChildModel && setParentComment) {
                                setParentComment(info)
                                setTimeout(() => {
                                    openCommentChildModel(true)
                                }, 1)
                            }
                        }}
                    >
                        共 12 条回复，点击查看
                    </a>
                )}
            </div>
        </div>
    )
})
interface PluginCommentImagesProps {
    images: string[]
    onDelete?: (v: string[]) => void
    onOpen?: () => void
    onClose?: () => void
    // 辅助key值
    key?: string | number
    // 展示图片大小 默认56
    size?: number
}

const PluginCommentImages: React.FC<PluginCommentImagesProps> = (props) => {
    const {images, onDelete, onOpen, onClose, key, size = 56} = props
    const [imageShow, setImageShow] = useState<ImageShowProps>({
        src: "",
        visible: false
    })
    return (
        <div className={styles["plugin-comment-images"]}>
            {images.map((item, index) => {
                return (
                    <div
                        key={`${item}-${key || ""}`}
                        className={styles["upload-img-opt"]}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                    >
                        <img src={item as any} className={styles["opt-pic"]} style={{width: size, height: size}} />
                        <div
                            className={styles["mask-box"]}
                            onClick={() => {
                                onOpen && onOpen()
                                setImageShow({
                                    visible: true,
                                    src: item
                                })
                            }}
                        >
                            预览
                        </div>
                        {onDelete && (
                            <div
                                className={styles["close"]}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const arr: string[] = cloneDeep(images)
                                    arr.splice(index, 1)
                                    onDelete && onDelete(arr)
                                }}
                            >
                                <CloseIcon />
                            </div>
                        )}
                    </div>
                )
            })}
            <Image
                src={imageShow.src}
                style={{display: "none"}}
                preview={{
                    visible: imageShow.visible,
                    src: imageShow.src,
                    onVisibleChange: (value) => {
                        if (!value) {
                            onClose && onClose()
                            setImageShow({
                                visible: false,
                                src: ""
                            })
                        }
                    }
                }}
            />
        </div>
    )
}

interface PluginCommentUploadProps {
    value: string
    setValue: (value: string) => any
    // 限制输入字数，默认150字
    limit?: number
    loading: boolean
    files: string[]
    setFiles: (files: string[]) => any
    onSubmit: () => void
    submitTxt?: string
    // TextArea行数 默认4行
    rows?: number
    // 是否常驻显示操作按钮（默认为聚焦显示）
    isAlwaysShow?: boolean
}

interface ImageShowProps {
    src: string
    visible: boolean
}

export const PluginCommentUpload: React.FC<PluginCommentUploadProps> = (props) => {
    const {
        value,
        setValue,
        limit = 150,
        loading,
        files,
        setFiles,
        onSubmit,
        submitTxt = "发布评论",
        rows = 4,
        isAlwaysShow = false
    } = props
    const {userInfo} = useStore()
    const {platform, companyHeadImg, companyName} = userInfo
    const avatarColor = useRef<string>(randomAvatarColor())
    const [filesLoading, setFilesLoading] = useState<boolean>(false)
    const textAreRef = useRef<InputRef>(null)
    const [isFocused, setIsFocused] = useState<boolean>(false)

    // 是否允许其失焦
    const isAllowBlur = useRef<boolean>(true)
    const uploadFiles = (file) => {
        setFilesLoading(true)
        ipcRenderer
            .invoke("upload-img", {path: file.path, type: file.type})
            .then((res) => {
                setFiles(files.concat(res.data))
            })
            .catch((err) => {
                fail("图片上传失败")
            })
            .finally(() => {
                setTimeout(() => setFilesLoading(false), 1)
            })
    }

    const disabled = useMemo(() => {
        if (value.length > limit || value.length === 0) {
            return true
        }
        return false
    }, [value, limit])

    // 是否展示底部元素
    const isShowdDom = useMemo(() => {
        if (files.length > 0 || value.length > 0 || isAlwaysShow || isFocused) {
            return true
        } else {
            return false
        }
    }, [isFocused, files, value])

    return (
        <div className={styles["plugin-comment-upload"]}>
            <div className={styles["upload-author-img"]}>
                {platform === "company" ? (
                    <div>
                        {companyHeadImg && !!companyHeadImg.length ? (
                            <Avatar size={32} style={{cursor: "pointer"}} src={companyHeadImg} />
                        ) : (
                            <Avatar
                                size={32}
                                style={{backgroundColor: avatarColor.current}}
                                className={classNames(styles["judge-avatar-avatar"])}
                            >
                                {companyName && companyName.slice(0, 1)}
                            </Avatar>
                        )}
                    </div>
                ) : (
                    <img
                        src={userInfo[UserPlatformType[platform || ""].img] || yakitImg}
                        style={{width: 32, height: 32, borderRadius: "50%"}}
                    />
                )}
            </div>
            <div
                className={classNames(styles["input-upload-box"], {
                    [styles["input-upload-box-active"]]: isFocused
                })}
                onClick={() => {
                    textAreRef.current!.focus({
                        cursor: "end"
                    })
                }}
            >
                {/* 将原本padding: 12px;拆分为4个div的原因是为了解决控件闪烁 */}
                <div
                    className={styles["padding-top"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
                <div className={styles["padding-left-right"]}>
                    <div
                        className={styles["padding-left"]}
                        onMouseDown={(e) => {
                            e.preventDefault()
                        }}
                    ></div>
                    <div className={styles["input-upload"]}>
                        <div
                            className={styles["input-box"]}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            <Input.TextArea
                                className={styles["input-box-textArea"]}
                                onFocus={() => {
                                    setIsFocused(true)
                                }}
                                onBlur={() => {
                                    if (isAllowBlur.current) {
                                        setIsFocused(false)
                                    } else {
                                        isAllowBlur.current = true
                                        textAreRef.current?.focus()
                                    }
                                }}
                                value={value}
                                ref={textAreRef}
                                bordered={false}
                                rows={rows}
                                placeholder='说点什么...'
                                onChange={(e) => setValue(e.target.value)}
                            />
                            <ResizerIcon className={styles["textArea-resizer-icon"]} />
                        </div>
                        {isShowdDom && (
                            <div
                                style={{paddingTop: 12}}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                }}
                            >
                                <PluginCommentImages
                                    images={files}
                                    onDelete={setFiles}
                                    onOpen={() => {
                                        isAllowBlur.current = false
                                    }}
                                    onClose={() => {
                                        isAllowBlur.current = true
                                    }}
                                />
                            </div>
                        )}
                        {isShowdDom && (
                            <div
                                className={styles["upload-box"]}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                }}
                            >
                                <div
                                    className={styles["upload-box-left"]}
                                    onClick={() => {
                                        isAllowBlur.current = false
                                    }}
                                >
                                    <Upload
                                        accept='image/jpeg,image/png,image/jpg,image/gif'
                                        multiple={false}
                                        disabled={files.length >= 3}
                                        showUploadList={false}
                                        beforeUpload={(file: any) => {
                                            if (filesLoading) {
                                                return false
                                            }
                                            if (file.size / 1024 / 1024 > 10) {
                                                failed("图片大小不超过10M")
                                                return false
                                            }
                                            if (!"image/jpeg,image/png,image/jpg,image/gif".includes(file.type)) {
                                                failed("仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif")
                                                return false
                                            }
                                            if (file) {
                                                uploadFiles(file)
                                            }
                                            return true
                                        }}
                                    >
                                        <div
                                            className={classNames(styles["photograph-icon"], {
                                                [styles["photograph-icon-disabled"]]: files.length >= 3,
                                                [styles["photograph-icon-loading"]]: filesLoading
                                            })}
                                        >
                                            {filesLoading ? <LoadingOutlined /> : <OutlinePhotographIcon />}
                                        </div>
                                    </Upload>
                                </div>
                                <div className={styles["upload-box-right"]}>
                                    <div className={styles["limit-count"]}>
                                        {value.length}/{limit}
                                    </div>
                                    <>
                                        {
                                            // 由于Button的disabled为true时会被阻止默认事件向上传递 因此disable样式由自己实现
                                            disabled ? (
                                                <div className={styles["disabled-btn"]}>
                                                    <PaperAirplaneIcon />
                                                    {submitTxt}
                                                </div>
                                            ) : (
                                                <YakitButton
                                                    icon={<PaperAirplaneIcon />}
                                                    loading={loading}
                                                    onClick={() => {
                                                        onSubmit()
                                                    }}
                                                >
                                                    {submitTxt}
                                                </YakitButton>
                                            )
                                        }
                                    </>
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        className={styles["padding-right"]}
                        onMouseDown={(e) => {
                            e.preventDefault()
                        }}
                    ></div>
                </div>

                <div
                    className={styles["padding-bottom"]}
                    onMouseDown={(e) => {
                        e.preventDefault()
                    }}
                ></div>
            </div>
        </div>
    )
}

interface PluginCommentChildModalProps {
    visible: boolean
    isLogin: boolean
    parentInfo?: API.CommentListData
    onReply: (info: API.CommentListData) => any
    onCancel: (visible: boolean) => any
}

interface CommentQueryProps extends API.PageMeta {
    root_id?: number
    plugin_id?: number
}

const PluginCommentChildModal = (props: PluginCommentChildModalProps) => {
    const {parentInfo, visible, onReply, onCancel, isLogin} = props

    const [loadingChild, setLoadingChild] = useState<boolean>(false)
    const [commentChildResponses, setCommentChildResponses] = useState<API.CommentListResponse>({
        data: [],
        pagemeta: {
            page: 1,
            limit,
            total: 0,
            total_page: 0
        }
    })

    const onCommentChildCancel = useMemoizedFn(() => {
        setCommentChildResponses({
            data: [],
            pagemeta: {
                page: 1,
                limit,
                total: 0,
                total_page: 0
            }
        })
        onCancel(false)
    })
    const loadMoreData = useMemoizedFn(() => {
        if (commentChildResponses?.pagemeta?.page) {
            getChildComment(commentChildResponses?.pagemeta?.page + 1)
        }
    })
    // 全局监听是否刷新子评论列表状态
    const {commenData, setCommenData} = useCommenStore()
    // 获取子评论列表
    const getChildComment = useMemoizedFn((page: number = 1, payload: any = {}) => {
        const params = {
            root_id: parentInfo?.id,
            plugin_id: parentInfo?.plugin_id,
            limit,
            page,
            order_by: "created_at",
            ...payload
        }
        NetWorkApi<CommentQueryProps, API.CommentListResponse>({
            method: "get",
            url: "comment/reply",
            params
        })
            .then((res) => {
                if (!res.data) {
                    res.data = []
                }
                const item = res
                const newCommentChildResponses = {
                    data: page === 1 ? item.data : commentChildResponses.data.concat(item.data),
                    pagemeta: item.pagemeta
                }
                const isMore =
                    item.data.length < limit ||
                    newCommentChildResponses.data.length === commentChildResponses.pagemeta.total
                ishasMore.current = !isMore
                setCommentChildResponses({
                    data: [...newCommentChildResponses.data],
                    pagemeta: item.pagemeta
                })
                // 刷新modal中子评论列表
                setCommenData({
                    isRefChildCommentList: false
                })
            })
            .catch((err) => {
                failed("评论查询失败:" + err)
            })
            .finally(() => {
                setTimeout(() => setLoadingChild(false), 200)
            })
    })
    const onCommentChildStar = useMemoizedFn((childItem: API.CommentListData) => {
        if (!isLogin) {
            warn("请先登录")
            return
        }
        const params = {
            comment_id: childItem.id,
            operation: childItem.is_stars ? "remove" : "add"
        }
        NetWorkApi<CommentStarsProps, API.ActionSucceeded>({
            method: "post",
            url: "comment/stars",
            params: params
        })
            .then((res) => {
                const index: number = commentChildResponses.data.findIndex(
                    (ele: API.CommentListData) => ele.id === childItem.id
                )
                if (index !== -1) {
                    if (childItem.is_stars) {
                        commentChildResponses.data[index].like_num -= 1
                        commentChildResponses.data[index].is_stars = false
                    } else {
                        commentChildResponses.data[index].like_num += 1
                        commentChildResponses.data[index].is_stars = true
                    }
                    setCommentChildResponses({
                        ...commentChildResponses,
                        data: [...commentChildResponses.data]
                    })
                }
            })
            .catch((err) => {
                failed("点赞失败:" + err)
            })
            .finally(() => {})
    })
    useEffect(() => {
        if (!commenData.isRefChildCommentList) return
        if (!parentInfo) return
        const refParams = {
            root_id: parentInfo?.id,
            plugin_id: parentInfo?.plugin_id
        }
        getChildComment(1, refParams)
    }, [commenData.isRefChildCommentList])

    useEffect(() => {
        if (visible) {
            setLoadingChild(true)
            getChildComment(1)
        }
    }, [visible])

    const timeListChildRef = useRef<YakitTimeLineListRefProps>(null)
    const ishasMore = useRef<boolean>(true)
    const handleClearTimeList = useMemoizedFn(() => {
        timeListChildRef.current?.onClear()
    })

    if (!parentInfo) return <></>
    return (
        <Modal visible={visible} onCancel={onCommentChildCancel} footer={null} width='70%' centered>
            <div id='scroll-able-div' className={styles["comment-child-body"]}>
                <PluginCommentInfo
                    key={parentInfo.id}
                    info={parentInfo}
                    isOperation={false}
                    onStar={() => {}}
                    onReply={() => {}}
                />
                {/* 10条以上使用不定高虚拟列表 10条以下正常渲染 */}
                {commentChildResponses.data.length > 10 ? (
                    <div className={styles["child-comment-list"]}>
                        <OnlineJudgment>
                            <NewYakitTimeLineList
                                ref={timeListChildRef}
                                loading={loadingChild}
                                data={commentChildResponses.data}
                                DefaultItemHeight={76}
                                renderItem={(childItem) => {
                                    return (
                                        <PluginCommentInfo
                                            key={childItem.id}
                                            info={childItem}
                                            onReply={onReply}
                                            onStar={onCommentChildStar}
                                            isStarChange={childItem.is_stars}
                                        />
                                    )
                                }}
                                hasMore={ishasMore.current}
                                loadMore={loadMoreData}
                            />
                        </OnlineJudgment>
                    </div>
                ) : (
                    <div className={styles["little-child-comment-list"]}>
                        {commentChildResponses.data.map((childItem) => {
                            return (
                                <PluginCommentInfo
                                    key={childItem.id}
                                    info={childItem}
                                    onReply={onReply}
                                    onStar={onCommentChildStar}
                                    isStarChange={childItem.is_stars}
                                />
                            )
                        })}
                    </div>
                )}
            </div>
        </Modal>
    )
}
