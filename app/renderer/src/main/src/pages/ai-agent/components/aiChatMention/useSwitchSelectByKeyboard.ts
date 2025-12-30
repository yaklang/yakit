import {useCreation, useDebounceFn, useInViewport, useKeyPress, useMemoizedFn} from "ahooks"
import {RefObject} from "react"

function useSwitchSelectByKeyboard<T>(
    ref: RefObject<HTMLDivElement | null> | null,
    params: {
        data: T[]
        selected?: T
        rowKey: string | ((v: T) => string)
        onSelectNumber: (m: number, isScroll: boolean) => void
        onEnter: () => void
        defItemHeight?: number
    }
): void {
    const {data, selected, rowKey, onSelectNumber, onEnter} = params

    const defItemHeight = useCreation(() => {
        return params.defItemHeight ?? 24
    }, [params.defItemHeight])

    const [inViewport = true] = useInViewport(ref)

    const getRowKey = useMemoizedFn((item: T) => {
        if (typeof rowKey === "string") {
            return rowKey
        }
        return rowKey(item)
    })

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
                onSelectNumber(0, true)
                return
            }
            const currentRowKey = getRowKey(selected)
            const currentIndex = data.findIndex((item) => getRowKey(item) === currentRowKey)
            if (currentIndex === -1) return
            const newScrollToNumber = currentIndex - 1
            const id = data[newScrollToNumber] ? getRowKey(data[newScrollToNumber]) : ""
            if (!id) return
            const currentDom = document.getElementById(id)
            if (!currentDom) return
            isVisible(currentDom, (isScroll) => {
                onSelectNumber(newScrollToNumber, isScroll)
            })
        },
        {wait: 100, leading: true}
    ).run

    const onDownArrow = useDebounceFn(
        () => {
            if (!inViewport) return
            if (!ref?.current) return
            if (!selected) {
                onSelectNumber(0, true)
                return
            }
            const currentRowKey = getRowKey(selected)
            const currentIndex = data.findIndex((item) => getRowKey(item) === currentRowKey)
            if (currentIndex > -1 && currentIndex < data.length - 1) {
                const number = currentIndex + 1
                const id = data[number] ? getRowKey(data[number]) : ""
                if (!id) return
                const currentDom = document.getElementById(id)
                if (!currentDom) return
                isVisible(currentDom, (isScroll) => {
                    const clientHeight = ref?.current?.clientHeight || 0
                    const dom = ref.current
                    if (dom && clientHeight && isScroll) {
                        const rowNumber = clientHeight / defItemHeight // 24 列表高度
                        const y = 1 - (rowNumber - Math.trunc(rowNumber))
                        dom.scrollTop = (number - Math.floor(rowNumber) + y) * defItemHeight + 6 // +6 让其更多的显示完整
                    }
                    onSelectNumber(number, false)
                })
            }
        },
        {wait: 100, leading: true}
    ).run

    const isVisible = useMemoizedFn((dom: HTMLElement, callback: (b: boolean) => void) => {
        const observer = new IntersectionObserver(
            (entries) => {
                // 观察一次后立即断开连接
                observer.disconnect()
                if (entries.length > 0) {
                    const entry = entries[0]
                    return callback(entry.intersectionRatio < 1 && entry.intersectionRatio >= 0)
                }

                return callback(false)
            },
            {
                threshold: [0, 0.9]
            }
        )
        observer.observe(dom)
    })

    const onEnterKey = useDebounceFn(
        () => {
            if (inViewport) onEnter()
        },
        {wait: 200, leading: true}
    ).run
}

export default useSwitchSelectByKeyboard
