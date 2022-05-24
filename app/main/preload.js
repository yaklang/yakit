const {ipcRenderer} = require("electron");

process.on("loaded", function () {
    window.require = function (i) {
        if (i !== "electron") {
            return
        }

        return {ipcRenderer}
    }
})
