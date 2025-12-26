import type {FC, CSSProperties, ReactNode} from "react"
import classNames from "classnames"
import styles from "./Loading.module.scss"

export interface LoaderProps {
    size?: number
    color?: string
    loading?: boolean
    className?: string
    style?: CSSProperties
    children?: ReactNode
}

const Loader: FC<LoaderProps> = ({size = 32, color, loading = true, className, children, style}) => {
    return (
        <div
            className={classNames(
                styles.codeLoader,
                {
                    [styles.paused]: !loading
                },
                className
            )}
            style={{
                fontSize: size,

                ...style
            }}
        >
            <div style={{color}}>
                <span>{"{"}</span>
                <span>{"}"}</span>
            </div>
          <div className={styles.text}>
              {children}
          </div>
        </div>
    )
}

export default Loader
