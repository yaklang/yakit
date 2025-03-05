import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useCreation, useMemoizedFn, useDebounceFn} from "ahooks"
import React, {useState, useEffect} from "react"
import {YChangeProps} from "../YChange/YChangeType"
import classNames from "classnames"
import styles from "./CustomImageBlock.module.scss"
import {YChange} from "../YChange/YChange"
import {OutlineAnnotationIcon} from "@/assets/icon/outline"
import {useStore} from "@/store"
import {HttpUploadImgBaseRequest, httpUploadImgPath} from "@/apiUtils/http"
import {yakitNotify} from "@/utils/notification"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
interface CustomImageBlock {
    type: HttpUploadImgBaseRequest["type"]
    notepadHash?: string
}
export const CustomImageBlock: React.FC<CustomImageBlock> = (props) => {
    const {notepadHash, type} = props
    const userInfo = useStore((s) => s.userInfo)
    const {node, selected, getPos, setAttrs, view, contentRef} = useNodeViewContext()

    const {attrs} = node

    const [hidden, setHidden] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const [caption, setCaption] = useState(attrs.caption || "")

    useEffect(() => {
        console.log("CustomImageBlock-node", node, selected)
    }, [node, selected])

    useEffect(() => {
        const {src, path, uploadUserId = "0"} = attrs
        if (src) {
            setLoading(false)
        }
        if (!path) return

        if (uploadUserId === "0" || uploadUserId !== userInfo.user_id) return
        httpUploadImgPath({path, type, filedHash: notepadHash})
            .then((src) => {
                setAttrs({src, uploadUserId: 0, path: ""})
            })
            .catch((e) => {
                yakitNotify("error", `上传图片失败:${e}`)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoading(false)
                }, 200)
            )
    }, [attrs.src, attrs.path, attrs.uploadUserId])

    useEffect(() => {
        if (selected) return
        if (attrs) {
            setHidden(attrs?.caption?.length > 0)
        }
    }, [selected])

    const onHidden = useMemoizedFn((e) => {
        e.preventDefault()
        e.stopPropagation()
        if (readonly) return
        setHidden((v) => !v)
    })
    const onInput = useMemoizedFn((e) => {
        if (readonly) return
        const {value} = e.target
        setCaption(value)
        onSetCaption(value)
    })
    const onSetCaption = useDebounceFn(
        useMemoizedFn((value: string) => {
            if (readonly) return
            // setAttrs({...attrs,caption: value})
            onSetAttr("caption", value)
        }),
        {wait: 200, leading: true}
    ).run
    const onSetAttr = useMemoizedFn((attr, value) => {
        const pos = getPos()
        if (pos == null) return
        const tr = view.state.tr.setNodeAttribute(pos, attr, value).setMeta("addToHistory", true)
        view.dispatch(tr)
        console.log(view.state.tr.docChanged)
    })
    const ychange: YChangeProps = useCreation(() => attrs?.ychange || {}, [attrs])
    const readonly: boolean = useCreation(() => !view.editable, [view.editable])
    return (
        <div
            className={classNames(styles["image-custom-block"], {
                [styles["image-custom-diff-history-block"]]: ychange,
                [styles["image-custom-block-selected"]]: selected
            })}
            style={{color: ychange ? ychange.color?.dark : ""}}
            contentEditable={false}
        >
            {loading ? (
                <YakitSpin wrapperClassName={styles["image-loading"]} spinning={true} tip='图片加载中...' />
            ) : (
                <>
                    {attrs?.src ? (
                        <>
                            <div
                                className={classNames(styles["image-wrapper"], {
                                    [styles["image-wrapper-disable"]]: readonly
                                })}
                            >
                                <img ref={contentRef} {...attrs} />
                                <div className={styles["operation-item"]} onPointerDown={onHidden}>
                                    <OutlineAnnotationIcon />
                                </div>
                            </div>
                            {hidden && (
                                <input
                                    placeholder='Write Image Caption'
                                    value={caption}
                                    onChange={onInput}
                                    className={styles["image-caption"]}
                                />
                            )}
                        </>
                    ) : (
                        <div className={styles["image-none-block"]}>图片不存在或已被删除</div>
                    )}
                </>
            )}

            <YChange {...ychange} diffWrapClassName={styles["diff-warp"]} />
        </div>
    )
}
