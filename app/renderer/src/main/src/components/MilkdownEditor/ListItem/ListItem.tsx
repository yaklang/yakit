import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {useNodeViewContext} from "@prosemirror-adapter/react"
import React, {useEffect} from "react"
import styles from "./ListItem.module.scss"
import classNames from "classnames"
import {useCreation} from "ahooks"
import {YChange} from "../YChange/YChange"
import {YChangeProps} from "../YChange/YChangeType"
import {ySyncPluginKey} from "y-prosemirror"
import * as Y from "yjs" // eslint-disable-line

export const ListItem: React.FC = () => {
    const {node, view, contentRef, getPos, setAttrs} = useNodeViewContext()

    const {label, checked, listType, ychange} = node.attrs
    useEffect(() => {
        const ySync = ySyncPluginKey.getState(view.state)
        console.log("ySync", ySync)
        console.log("ListItem-node", node, view)
    }, [node, view])

    const disabled = useCreation(() => {
        return !view.editable
    }, [view.editable])

    const onUpdateChecked = (val: boolean) => {
        const {state, dispatch} = view
        console.log("val", val, node.attrs, state.schema.nodes)
        if (disabled) return
        // setAttrs({checked: val})

        const pos = getPos() || 0
        const tr = state.tr.setNodeMarkup(pos, undefined, {checked: val})
        dispatch(tr)

        // const ySync = ySyncPluginKey.getState(view.state)
        // console.log("ySync", ySync,view)
        // if (!ySync) return
        // // 假设你有一个全局的 Y.Doc 对象
        // const ydoc = ySync.doc
        // const yxml = ydoc.getMap().set('el', new Y.XmlElement('div'))
        // console.log('yxml',yxml,yxml.getAttributes())
    }

    const render = () => {
        if (checked === null) {
            if (listType === "bullet") {
                return (
                    <div className={styles["bullet-dot-wrapper"]} contentEditable={false}>
                        <div className={styles["bullet-dot"]} />
                    </div>
                )
            }

            return (
                <div className={styles["label-dot-wrapper"]} contentEditable={false}>
                    <div className={styles["label"]}>{label}</div>
                </div>
            )
        }

        return (
            <div
                className={styles["checked-dot-wrapper"]}
                contentEditable={false}
                // onClick={() => onUpdateChecked(!checked)}
            >
                <YakitCheckbox
                    disabled={disabled}
                    checked={checked}
                    onChange={(e) => onUpdateChecked(e.target.checked)}
                />
                <YChange {...(ychange || {})} diffWrapStyle={{height: "100%"}} />
            </div>
        )
    }
    return (
        <li
            className={classNames(styles["list-item-wrapper"], {
                [styles["list-item-checked-wrapper"]]: checked !== null
            })}
        >
            {render()}
            <div
                className={classNames(styles["list-item"], {
                    [styles["list-item-checked"]]: !!checked
                })}
                ref={contentRef}
            />
        </li>
    )
}
