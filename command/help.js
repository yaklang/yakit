/**
 * @name 第一命令选项说明
 * - command 命令标识
 * - description 命令描述
 */
const commandOptions = [
    {
        command: "start-render",
        description: "start-up render process"
    },
    {
        command: "start-electron",
        description: "start-up yakit process"
    },
    {
        command: "build-render",
        description: "build render package"
    },
    {
        command: "build-electron",
        description: "build yakit package"
    }
]

/**
 * @name 第二命令选项说明
 * - option 选项标识
 * - prefixCommand 前置命令
 * - description 选项详情
 */
const flagOptions = [
    {
        option: "-ce",
        prefixCommand: "(start-render|build-render)",
        description: "Community Edition Version"
    },
    {
        option: "-ee",
        prefixCommand: "(start-render|build-render)",
        description: "Enterprise Edition Version"
    },
    {
        option: "-se",
        prefixCommand: "(start-render|build-render)",
        description: "Simple Edition Version"
    },
    {option: "-d", prefixCommand: "(start-render|build-render [flag])", description: "Show Developer Tools"},
    {option: "-w", prefixCommand: "(build-electron)", description: "Window System"},
    {option: "-l", prefixCommand: "(build-electron)", description: "Linux System"},
    {option: "-m", prefixCommand: "(build-electron)", description: "Mac System"},
    {option: "-mwl", prefixCommand: "(build-electron)", description: "Mac Window Linux System"},
    {option: "-p", prefixCommand: "(build-electron)", description: "Mac Window Linux System"},
    {option: "-mwl", prefixCommand: "(build-electron)", description: "Mac Window Linux System"}
]

/** 打印输出帮助文档方法 */
