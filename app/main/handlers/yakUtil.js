const {ipcMain, Notification} = require("electron");
const childProcess = require("child_process");
const process = require("process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const psList = require("ps-list");
const treeKill = require("tree-kill");

const homeDir = path.join(os.homedir(), "yakit-projects");
const secretDir = path.join(homeDir, "auth");
fs.mkdirSync(secretDir, {recursive: true})
const secretFile = path.join(secretDir, "yakit-remote.json");
const authMeta = [];

const loadSecrets = () => {
    authMeta.splice(0, authMeta.length)
    try {
        const data = fs.readFileSync(path.join(secretDir, "yakit-remote.json"));
        JSON.parse(data).forEach(i => {
            if (!(i["host"] && i["port"])) {
                return
            }

            authMeta.push({
                name: i["name"] || `${i["host"]}:${i["port"]}`,
                host: i["host"],
                port: i["port"],
                tls: i["tls"] | false,
                password: i["password"] || "",
                caPem: i["caPem"] || "",
            })
        })
    } catch (e) {
        console.info(e)
    }
};

function saveSecret(name, host, port, tls, password, caPem) {
    if (!host || !port) {
        throw new Error("empty host or port")
    }

    authMeta.push({
        host, port, tls, password, caPem,
        name: name || `${host}:${port}`,
    })
    saveAllSecret([...authMeta])
};

const saveAllSecret = (authInfos) => {
    try {
        fs.unlinkSync(secretFile)
    } catch (e) {

    }


    const authFileStr = JSON.stringify(
        [...authInfos.filter((v, i, arr) => {
            return arr.findIndex(origin => origin.name === v.name) === i
        })]
    );
    fs.writeFileSync(secretFile, new Buffer(authFileStr, "utf8"))
};

loadSecrets()

module.exports = {
    register: (win, getClient) => {
        ipcMain.handle("save-yakit-remote-auth", async (e, params) => {
            let {name, host, port, tls, caPem, password} = params;
            name = name || `${host}:${port}`
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets()
            saveSecret(name, host, port, tls, caPem, password)
        })
        ipcMain.handle("remove-yakit-remote-auth", async (e, name) => {
            saveAllSecret([...authMeta.filter(i => {
                return i.name !== name
            })]);
            loadSecrets();
        })
        ipcMain.handle("get-yakit-remote-auth-all", async (e, name) => {
            loadSecrets()
            return authMeta;
        })
        ipcMain.handle("get-yakit-remote-auth-dir", async (e, name) => {
            return secretDir;
        })
    },
}