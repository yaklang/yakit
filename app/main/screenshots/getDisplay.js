const {screen} = require("electron")

/**
 * @typedef {Object} Display - 窗口坐标和宽高相关信息
 * @property {number} x - 显示窗口的原点中x坐标
 * @property {number} y - 显示窗口的原点中y坐标
 * @property {number} width - 显示窗口的宽
 * @property {number} height - 显示窗口的高
 * @property {number} id - 与显示相关联的唯一的标志符
 * @property {number} scaleFactor - 输出设备的像素比例因子
 */

/**
 * @return {Display}
 */
module.exports = () => {
    const point = screen.getCursorScreenPoint()
    const {id, bounds, scaleFactor} = screen.getDisplayNearestPoint(point)

    return {
        id,
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y),
        width: Math.floor(bounds.width),
        height: Math.floor(bounds.height),
        scaleFactor
    }
}
