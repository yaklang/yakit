const fs = require("fs");
const path = require("path");
const packager = require("electron-packager");

const pruductName = `EnpriTrace`;
const platform = `linux`;
const arch = `loong64`;

const packaegJson = require("./package.json");
// Generate Version
let version = packaegJson.version;
// CE
if (version.endsWith("-ce")) {
    version = version.replace("-ce", "");
}
// EE
if (version.endsWith("-ee")) {
    version = version.replace("-ee", "");
}

packager({
    dir: ".",
    out: `dist`,
    name: `${pruductName}`,
    appVersion: `${version}`,
    platform: `${platform}`,
    arch: `${arch}`,
    ignore: ["app/renderer/src", "multibuilder", "buildHooks"],
    icon: "app/assets/yakiteelogo.png",
    electronVersion: "26.4.3",
    electronZipDir: "electron-bin",
    asar: true,
}).then(() => {
    const oldPath = path.join(__dirname, `dist/${pruductName}-${platform}-${arch}`); // 替换为实际路径
    const newPath = path.join(__dirname, `dist/${pruductName}`); // 替换为实际路径
    if (fs.existsSync(newPath)) {
        try {
            fs.rmSync(newPath, { recursive: true, force: true });
        } catch (error) {}
    }
    fs.rename(oldPath, newPath, (err) => {
        if (err) {
            console.error("Error renaming folder:", err);
        } else {
            console.log("Folder renamed successfully!");
        }
    });
});
