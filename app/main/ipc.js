const {ipcMain, nativeImage, Notification, app} = require("electron")
const path = require("path")
const fs = require("fs")
const PROTO_PATH = path.join(__dirname, "../protos/grpc.proto")
const grpc = require("@grpc/grpc-js")
const protoLoader = require("@grpc/proto-loader")
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
})
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const {ypb} = protoDescriptor
const {Yak} = ypb

const global = {
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: ""
}

let _client

const options = {
    "grpc.max_receive_message_length": 1024 * 1024 * 1000,
    "grpc.max_send_message_length": 1024 * 1024 * 1000,
    "grpc.enable_http_proxy": 0
}

function newClient() {
    const md = new grpc.Metadata()
    md.set("authorization", `bearer ${global.password}`)
    if (global.caPem !== "") {
        const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
            return callback(null, md)
        })
        return new Yak(
            global.defaultYakGRPCAddr,
            // grpc.credentials.createInsecure(),
            grpc.credentials.combineChannelCredentials(
                grpc.credentials.createSsl(Buffer.from(global.caPem, "latin1"), null, null, {
                    checkServerIdentity: (hostname, cert) => {
                        return undefined
                    }
                }),
                creds
            ),
            options
        )
    } else {
        return new Yak(global.defaultYakGRPCAddr, grpc.credentials.createInsecure(), options)
    }
}

function getClient(createNew) {
    if (!!createNew) {
        return newClient()
    }

    if (_client) {
        return _client
    }

    _client = newClient()
    return getClient()
}

/**
 * @name 测试远程连接引擎是否成功
 * @param {Object} params
 * @param {String} params.host 域名
 * @param {String} params.port 端口
 * @param {String} params.caPem 证书
 * @param {String} params.password 密钥
 */
function testRemoteClient(params, callback) {
    const {host, port, caPem, password} = params

    const md = new grpc.Metadata()
    md.set("authorization", `bearer ${password}`)
    const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
        return callback(null, md)
    })
    const yak = !caPem
        ? new Yak(`${host}:${port}`, grpc.credentials.createInsecure(), options)
        : new Yak(
              `${host}:${port}`,
              // grpc.credentials.createInsecure(),
              grpc.credentials.combineChannelCredentials(
                  grpc.credentials.createSsl(Buffer.from(caPem, "latin1"), null, null, {
                      checkServerIdentity: (hostname, cert) => {
                          return undefined
                      }
                  }),
                  creds
              ),
              options
          )

    yak.Echo({text: "hello yak? are u ok?"}, callback)
}

module.exports = {
    testRemoteClient,
    clearing: () => {
        require("./handlers/yakLocal").clearing()
    },
    registerIPC: (win) => {
        ipcMain.handle("relaunch", () => {
            app.relaunch({})
            app.exit(0)
        })

        ipcMain.handle("yakit-connect-status", () => {
            return {
                addr: global.defaultYakGRPCAddr,
                isTLS: !!global.caPem
            }
        })

        // asyncEcho wrapper
        const asyncEcho = (params) => {
            return new Promise((resolve, reject) => {
                getClient().Echo(params, (err, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(data)
                })
            })
        }
        ipcMain.handle("Echo", async (e, params) => {
            return await asyncEcho(params)
        })

        /** 获取 yaklang引擎 配置参数 */
        ipcMain.handle("fetch-yaklang-engine-addr", () => {
            return {
                addr: global.defaultYakGRPCAddr,
                isTLS: !!global.caPem
            }
        })

        /** 登录相关监听 */
        require("./handlers/userInfo")(win, getClient)

        /** 注册本地缓存数据查改通信 */
        require("./localCache").register(win, getClient)
        /** 启动、连接引擎 */
        require("./handlers/engineStatus")(
            win,
            (addr, pem, password) => {
                // 清空老数据
                if (_client) _client.close()
                _client = null

                // 设置新引擎参数
                global.defaultYakGRPCAddr = addr
                global.caPem = pem
                global.password = password
            },
            getClient,
            newClient
        )
        /** 远程控制 */
        require("./handlers/dynamicControl")(win, getClient)

        require("./handlers/execYak")(win, getClient)
        require("./handlers/listenPort")(win, getClient)
        require("./handlers/yakRunnerTerminal")(win, getClient)
        require("./handlers/mitm")(win, getClient)
        require("./handlers/queryHTTPFlow")(win, getClient)
        require("./handlers/httpFuzzer")(win, getClient)
        require("./handlers/httpAnalyzer")(win, getClient)
        require("./handlers/codec")(win, getClient)
        require("./handlers/yakLocal").register(win, getClient)
        require("./handlers/openWebsiteByChrome")(win, getClient)
        require("./handlers/manageYakScript")(win, getClient)
        require("./handlers/payloads")(win, getClient)
        require("./handlers/completion")(win, getClient)
        require("./handlers/portScan")(win, getClient)
        require("./handlers/startBrute")(win, getClient)
        require("./handlers/webshell")(win, getClient)

        // start chrome manager
        try {
            require("./handlers/chromelauncher")(win, getClient)
        } catch (e) {
            console.info("Import chrome launcher failed")
            console.error(e)
        }

        //assets
        require("./handlers/assets")(win, getClient)

        // 加载更多的 menu
        require("./handlers/menu")(win, getClient)

        // 管理 yak 引擎版本 / 升级等
        const upgradeUtil = require("./handlers/upgradeUtil")
        upgradeUtil
            .initial()
            .then(() => {
                upgradeUtil.register(win, getClient)
            })
            .catch((e) => {
                new Notification({
                    title: "Loading upgradeUtil.js failed",
                    body: `${e}`,
                    icon: nativeImage.createEmpty(),
                    urgency: "critical"
                }).show()
            })

        require("./handlers/version")(win, getClient)

        // global config
        require("./handlers/configNetwork")(win, getClient)

        // misc
        require("./handlers/misc")(win, getClient)

        // traffic
        require("./handlers/traffic")(win, getClient)

        // project
        require("./handlers/project")(win, getClient)

        // 数据对比
        require("./handlers/dataCompare")(win, getClient)

        // 增加一个通用的导出功能
        require("./handlers/generalExport")(win, getClient)

        //
        require("./handlers/facadeServer")(win, getClient)
        // 小工具插件
        require("./handlers/pluginTool")(win, getClient)

        // terminal
        require("./handlers/terminal")(win, getClient)

        // 通信
        require("./handlers/communication")(win, getClient)

        // reverse logger
        require("./handlers/reverse-connlogger").register(win, getClient)

        // 接口注册
        const api = fs.readdirSync(path.join(__dirname, "./api"))
        api.forEach((item) => {
            require(path.join(__dirname, `./api/${item}`))(win, getClient)
        })

        // 各类UI层面用户操作
        const uiOp = fs.readdirSync(path.join(__dirname, "./uiOperate"))
        uiOp.forEach((item) => {
            require(path.join(__dirname, `./uiOperate/${item}`))(win, getClient)
        })

        // 工具类 例如node文件处理
        const utils = fs.readdirSync(path.join(__dirname, "./utils"))
        utils.forEach((item) => {
            require(path.join(__dirname, `./utils/${item}`))(win, getClient)
        })

        // new plugins store
        require("./handlers/plugins")(win, getClient)

        // (render|print)-error-log
        require("./errorCollection")(win, getClient)
    }
}
