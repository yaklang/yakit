/**
 * 存放着软件不同版本的环境变量，用于控制构建出不同版本的软件
 * 例如：社区版、专业版、AI版本等
 */

module.exports = {
    yakit: {
        PLATFORM: "yakit"
    },
    "enpritrace": {
        PLATFORM: "yakitee"
    },
    "yakit-se": {
        PLATFORM: "yakitse"
    },
    irify: {
        PLATFORM: "irify"
    },
    "irify-ee": {
        PLATFORM: "irify-ee"
    },
    memfit: {
        PLATFORM: "memfit"
    }
}
