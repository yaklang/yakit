export const cliCommands = {
    "start-electron": "electron .",
    "electron-yakit-win":
        "env-cmd -e nonSignNormal -r packageScript/.env-cmdrc electron-builder build --win --config ./packageScript/electron-builder.config.js"
}
