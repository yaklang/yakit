import cloneDeep from "lodash/cloneDeep"
import {SplitViewPositionProp} from "./SplitViewType"

interface GenerateKnownSplitSizeParams {
    isVertical: boolean
    wrapperLong: number
    minLong: number
    length: number
    /** 所有屏的宽度和是否比容器的宽度多 */
    isOver: boolean
}
/**
 * @name 生成分屏的每个屏尺寸(横向|纵向)
 * 横向-只支持1|2|3个屏，纵向-只支持1|2个屏
 * 里面计算中的<减1|加1>，这个1是分隔符的占位宽度
 */
export const generateKnownSplitSize: (params: GenerateKnownSplitSizeParams) => SplitViewPositionProp[] = ({
    isVertical,
    wrapperLong,
    minLong,
    length,
    isOver
}) => {
    const defaultSize: SplitViewPositionProp = {width: 0, height: 0, left: 0, top: 0}
    const sizes: SplitViewPositionProp[] = []

    if (length === 2) {
        const init = wrapperLong - 1
        const first = isOver ? minLong : Math.floor(init / 2)
        const second = isOver ? minLong : Math.ceil(init / 2)
        if (isVertical) {
            sizes.push({...defaultSize, height: first, top: 0})
            sizes.push({...defaultSize, height: second, top: first + 1})
        } else {
            sizes.push({...defaultSize, width: first, left: 0})
            sizes.push({...defaultSize, width: second, left: first + 1})
        }
        return cloneDeep(sizes)
    }

    if (length === 3) {
        const init = wrapperLong - 2
        const first = isOver ? minLong : Math.floor(init / 3)
        const second = isOver ? minLong : Math.floor(init / 3)
        const third = isOver ? minLong : Math.ceil(init / 3)
        sizes.push({...defaultSize, width: first, left: 0})
        sizes.push({...defaultSize, width: second, left: first + 1})
        sizes.push({
            ...defaultSize,
            width: third,
            left: first + 1 + second + 1
        })
        return cloneDeep(sizes)
    }

    // length为其他或者1时的数据处理
    const long = isOver ? minLong : wrapperLong
    if (isVertical) {
        sizes.push({...defaultSize, height: long, top: 0})
    } else {
        sizes.push({...defaultSize, width: long, left: 0})
    }
    return cloneDeep(sizes)
}

interface ResizedSplitSizeParams {
    isVertical: boolean
    resizeLong: number
    minLong: number
    positions: SplitViewPositionProp[]
    /** 所有屏的宽度和是否比容器的宽度多 */
    isOver: boolean
}
/**
 * @name resize后重新计算所有屏的尺寸偏移量
 */
export const resizedSplitSize: (params: ResizedSplitSizeParams) => SplitViewPositionProp[] | null = ({
    isVertical,
    resizeLong,
    minLong,
    positions,
    isOver
}) => {
    if (positions.length === 0) return null
    if (resizeLong <= 0) return null

    const ps = cloneDeep(positions)

    if (isOver) {
        let offset = 0
        for (let el of ps) {
            if (isVertical) {
                el.height = minLong
                el.top = offset
            } else {
                el.width = minLong
                el.left = offset
            }
            offset += minLong + 1
        }
        return [...ps]
    }

    const {width, height, left, top} = ps[ps.length - 1]
    const oldLong = isVertical ? height + top : width + left
    const oldViewLong = ps.reduce((prev, current) => prev + (isVertical ? current.height : current.width), 0)

    const offsetLong = resizeLong - oldLong
    // 每块屏的定位
    let location = 0
    for (let i = 0; i < ps.length; i++) {
        const itemLong = isVertical ? ps[i].height : ps[i].width
        const newItemLong = itemLong + offsetLong * (itemLong / oldViewLong)

        if (isVertical) {
            ps[i] = {...ps[i], height: newItemLong, top: location}
        } else {
            ps[i] = {...ps[i], width: newItemLong, left: location}
        }

        location += newItemLong + 1
    }
    return ps
}

interface CalculateOffsetRangeParams {
    length: number
    sashIndex: number
    rect: DOMRect
    isVertical: boolean
    minLong: number
}
/**
 * @name 通过坐标计算出分割线可移动的偏移范围
 * 小数进行四舍五入计算
 * 里面的1代表分割线的占位长度-1px
 */
export const calculateOffsetRange: (params: CalculateOffsetRangeParams) => number[] = ({
    length,
    sashIndex,
    rect,
    isVertical,
    minLong
}) => {
    const {top, bottom, left, right} = rect
    let min = Math.round(isVertical ? top : left)
    let max = Math.round(isVertical ? bottom : right)
    const frontLength = sashIndex + 1
    const behindLength = length - sashIndex - 1

    min += frontLength * minLong + (frontLength - 1) * 1
    max -= behindLength * minLong + (behindLength - 1) * 1

    return [min, max]
}

interface OffsetSplitPositionParams {
    isVertical: boolean
    minLong: number
    positions: SplitViewPositionProp[]
    /** 分隔线索引 */
    index: number
    /** 偏移量 */
    offset: number
}
/**
 * @name 通过分隔线的偏移量,重新计算各个分屏的(尺寸|位置)数据
 */
export const offsetSplitPosition: (params: OffsetSplitPositionParams) => SplitViewPositionProp[] | null = ({
    isVertical,
    minLong,
    positions,
    index,
    offset
}) => {
    if (positions.length === 0 || positions.length === 1) return null
    if (offset === 0) return null

    // 是否左偏移
    const isleft = offset < 0
    const absOffset = Math.abs(offset)

    const longKey = isVertical ? "height" : "width"
    const positionKey = isVertical ? "top" : "left"

    try {
        if (isleft) {
            const unChange = positions.slice(index + 2)
            const changeView = positions[index + 1]
            let compress = positions.slice(0, index + 1).reverse()

            // 计算允许的最大偏移量
            const maxOffset = compress.reduce((prev, current) => prev + current[longKey], 0) - compress.length * minLong
            if (absOffset > maxOffset) return null

            changeView[longKey] += absOffset
            changeView[positionKey] -= absOffset

            let remainingOffset = absOffset
            for (let view of compress) {
                // 偏移量是否超过最小值
                const noMin = view[longKey] - remainingOffset >= minLong
                if (noMin) {
                    view[longKey] -= remainingOffset
                    break
                } else {
                    remainingOffset -= view[longKey] - minLong
                    if (view[positionKey] !== 0) view[positionKey] -= remainingOffset
                    view[longKey] = minLong
                }
            }

            const arr = compress.reverse().concat([changeView], unChange)
            return [...arr]
        } else {
            const unChange = positions.slice(0, index)
            const changeView = positions[index]
            const compress = positions.slice(index + 1)

            // 计算允许的最大偏移量
            const maxOffset = compress.reduce((prev, current) => prev + current[longKey], 0) - compress.length * minLong
            if (absOffset > maxOffset) return null

            changeView[longKey] += absOffset

            let remainingOffset = absOffset
            for (let view of compress) {
                // 偏移量是否超过最小值
                const noMin = view[longKey] - remainingOffset >= minLong
                if (noMin) {
                    view[positionKey] += remainingOffset
                    view[longKey] -= remainingOffset
                    break
                } else {
                    view[positionKey] += remainingOffset
                    remainingOffset -= view[longKey] - minLong
                    view[longKey] = minLong
                }
            }

            const arr = unChange.concat([changeView], compress)
            return [...arr]
        }
    } catch (error) {
        return null
    }
}
