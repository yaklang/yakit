import {useNodeViewContext} from "@prosemirror-adapter/react"
import {useCreation} from "ahooks"
import classNames from "classnames"
import styles from "./CustomAlter.module.scss"
import {YChangeProps} from "../YChange/YChangeType"
import {YChange} from "../YChange/YChange"

export const CustomAlter: React.FC = () => {
    const {node, contentRef} = useNodeViewContext()
    const {attrs} = node

    const ychange: YChangeProps = useCreation(() => attrs?.ychange || {}, [attrs])

    return (
        <div
            className={classNames(styles["alter-custom-block"], {
                [styles["alter-custom-diff-history-block"]]: ychange
            })}
            style={{color: ychange ? ychange.color?.dark : ""}}
        >
            <div
                className={classNames(styles["alter-custom"], styles[`alter-custom-${attrs.type}`])}
                ref={contentRef}
            />
            <YChange {...ychange} />
        </div>
    )
}
