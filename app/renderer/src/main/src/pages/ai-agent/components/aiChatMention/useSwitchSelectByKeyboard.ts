import {useDebounceFn, useInViewport, useKeyPress} from "ahooks"
import {RefObject} from "react"

function useSwitchSelectByKeyboard<T>(
    ref: RefObject<HTMLDivElement>,
    params: {
        data: T[]
        selected?: T
        rowKey: string
        onSelectNumber: (m: number) => void
        onEnter: () => void
    }
): void {
    const {data, selected, rowKey, onSelectNumber, onEnter} = params

    const [inViewport = true] = useInViewport(ref)

    useKeyPress(
        "uparrow",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onUpArrow()
        },
        {
            exactMatch: true,
            useCapture: true
        }
    )
    useKeyPress(
        "downarrow",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onDownArrow()
        },
        {
            exactMatch: true,
            useCapture: true
        }
    )
    useKeyPress(
        "enter",
        (e) => {
            e.stopPropagation()
            e.preventDefault()
            onEnterKey()
        },
        {
            exactMatch: true,
            useCapture: true
        }
    )

    const onUpArrow = useDebounceFn(
        () => {
            if (!inViewport) return
            if (!selected) {
                onSelectNumber(0)
                return
            }
            const currentIndex = data.findIndex((item) => item[rowKey] === selected[rowKey])
            if (currentIndex > 0) {
                const newScrollToNumber = currentIndex - 1
                onSelectNumber(newScrollToNumber)
            }
        },
        {wait: 200, leading: true}
    ).run

    const onDownArrow = useDebounceFn(
        () => {
            if (!inViewport) return
            if (!selected) {
                onSelectNumber(0)
                return
            }
            const currentIndex = data.findIndex((item) => item[rowKey] === selected[rowKey])
            if (currentIndex > -1 && currentIndex < data.length - 1) {
                const number = currentIndex + 1
                onSelectNumber(number)
            }
        },
        {wait: 200, leading: true}
    ).run

    const onEnterKey = useDebounceFn(
        () => {
            if (inViewport) onEnter()
        },
        {wait: 200, leading: true}
    ).run
}

export default useSwitchSelectByKeyboard
