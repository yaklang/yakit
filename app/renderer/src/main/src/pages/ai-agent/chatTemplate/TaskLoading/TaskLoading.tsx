import Loading from "@/components/Loading/Loading"
import {PlanLoadingStatus} from "@/pages/ai-re-act/hooks/type"
import {FC, memo, useEffect, useRef, useState} from "react"
import styles from "./TaskLoading.module.scss"
import useAISystemStream from "@/pages/ai-re-act/hooks/useAISystemStream"

export const ScrollText: FC<{ text?: string }> = ({ text = "" }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(10);

  useEffect(() => {
    if (!wrapperRef.current || !textRef.current) return;
    const wrapperWidth = wrapperRef.current.offsetWidth;
    const textWidth = textRef.current.offsetWidth;

    if (textWidth <= wrapperWidth) {
      setAnimationDuration(0);
    } else {
      setAnimationDuration((textWidth + wrapperWidth) * 0.02);
    }
  }, [text]);

  if (!text) return null;

  return (
    <div ref={wrapperRef} className={styles.scrollWrapper}>
      <div
        ref={textRef}
        className={styles.scrollText}
        style={{
          animationDuration: `${animationDuration}s`,
        }}
      >
        {text}&nbsp;&nbsp;&nbsp;{text}
      </div>
    </div>
  );
};

const TaskLoading: FC<{
    taskStatus: PlanLoadingStatus
    systemStream?: string
}> = ({taskStatus, systemStream}) => {
    const {displayValue, mode} = useAISystemStream({
        value: taskStatus.task,
        systemStream
    })
    return (
        <div className={styles["task-loading"]}>
            {taskStatus.loading && (
                <>
                    <Loading
                        size={16}
                        style={{
                            marginTop: 8
                        }}
                    >
                        <div className={styles["plan-text"]}>{taskStatus.plan}</div>
                    </Loading>
                    <div className={styles["task-text"]}>
                        {mode === "value" ? displayValue : <ScrollText text={displayValue as string} />}
                    </div>
                </>
            )}
        </div>
    )
}
export default memo(TaskLoading)
