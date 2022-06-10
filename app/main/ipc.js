const {ipcMain, nativeImage, Notification} = require("electron");
const path = require("path");
const PROTO_PATH = path.join(__dirname, "../protos/grpc.proto")
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader")
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    }
);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const {ypb} = protoDescriptor;
const {Yak} = ypb;

const global = {
    defaultYakGRPCAddr: "127.0.0.1:8087",
    password: "",
    caPem: "",
}

let _client;

const options = {
    "grpc.max_receive_message_length": 1024 * 1024 * 1000,
    "grpc.max_send_message_length": 1024 * 1024 * 1000
}

function newClient() {
    const md = new grpc.Metadata();
    md.set("authorization", `bearer ${global.password}`)

    if (global.caPem !== "") {
        const creds = grpc.credentials.createFromMetadataGenerator((params, callback) => {
            return callback(null, md)
        });
        return new Yak(
            global.defaultYakGRPCAddr,
            // grpc.credentials.createInsecure(),
            grpc.credentials.combineChannelCredentials(grpc.credentials.createSsl(
                (Buffer.from(global.caPem, "latin1")), null, null, {
                    checkServerIdentity: ((hostname, cert) => {
                        return undefined
                    }),
                }
            ), creds),
            options,
        )
    } else {
        return new Yak(
            global.defaultYakGRPCAddr,
            grpc.credentials.createInsecure(),
            options,
        )
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

module.exports = {
    clearing: () => {
        require("./handlers/yakLocal").clearing();
    },
    registerIPC: (win) => {
        ipcMain.handle("yakit-connect-status", () => {
            return {
                addr: global.defaultYakGRPCAddr,
                isTLS: !!global.caPem,
            }
        })
        ipcMain.handle("echo", async (e, text) => {
            getClient().Echo({
                text: text,
            }, (err, rsp) => {
            });
            return text
        })
        require("./handlers/execYak")(win, getClient);
        require("./handlers/listenPort")(win, getClient);
        require("./handlers/mitm")(win, getClient);
        require("./handlers/checkYakEnv")(win, (addr, password, caPem) => {
            // 清空老数据
            if (_client) _client.close();
            _client = null;
            global.password = "";
            global.caPem = "";

            // 设置地址
            global.defaultYakGRPCAddr = addr;
            global.password = password;
            global.caPem = caPem;
        }, getClient);
        require("./handlers/queryHTTPFlow")(win, getClient);
        require("./handlers/httpFuzzer")(win, getClient);
        require("./handlers/httpAnalyzer")(win, getClient);
        require("./handlers/engineStatus")(win, getClient);
        require("./handlers/codec")(win, getClient);
        require("./handlers/yakLocal").register(win, getClient);
        require("./handlers/openWebsiteByChrome")(win, getClient);
        require("./handlers/manageYakScript")(win, getClient);
        require("./handlers/payloads")(win, getClient);
        require("./handlers/completion")(win, getClient);
        require("./handlers/portScan")(win, getClient);
        require("./handlers/startBrute")(win, getClient);

        // start chrome manager
        try {
            require("./handlers/chromelauncher")(win, getClient);
        } catch (e) {
            console.info("Import chrome launcher failed")
            console.error(e)
        }

        //assets
        require("./handlers/assets")(win, getClient);

        // 加载更多的 menu
        require("./handlers/menu")(win, getClient);

        // 管理 yak 引擎版本 / 升级等
        const upgradeUtil = require("./handlers/upgradeUtil");
        upgradeUtil.initial().then(() => {
            upgradeUtil.register(win, getClient)
        }).catch(e => {
            new Notification({
                title: "Loading upgradeUtil.js failed", body: `${e}`,
                icon: nativeImage.createEmpty(), urgency: "critical",
            }).show()
        })

        require("./handlers/version")(win, getClient);

        // misc
        require("./handlers/misc")(win, getClient);

        // 数据对比
        require("./handlers/dataCompare")(win, getClient);

        // 增加一个通用的导出功能
        require("./handlers/generalExport")(win, getClient);

        //
        require("./handlers/facadeServer")(win, getClient);
        // 小工具插件
        require("./handlers/pluginTool")(win, getClient);

        // terminal
        require("./handlers/terminal")(win, getClient);

        // 通信
        require('./handlers/communication')(win, getClient);

        // reverse logger
        require("./handlers/reverse-connlogger").register(win, getClient);
    }
}