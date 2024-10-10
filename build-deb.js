const installer = require("electron-installer-debian");
const path = require("path");
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
const pruductName = `EnpriTrace-${version}-linux-loong64`;

const options = {
    src: `dist/EnpriTrace`,
    dest: `dist/installers`,
    rename: function (dest, src) {
        console.log("dest, src", dest, src);
        return path.join(dest, `${pruductName}.deb`);
    },
    options: {
        arch: "loongarch64",
        name: `EnpriTrace`,
        productName: `EnpriTrace`,
        genericName: `EnpriTrace`,
        version: version,
        bin: `EnpriTrace`,
        icon: "app/assets/yakiteelogo.png",
    },
};

installer(options, function (err) {
    if (err) {
        console.error(err, err.stack);
        process.exit(1);
    }

    console.log("Installer created");
    process.exit(0);
});
