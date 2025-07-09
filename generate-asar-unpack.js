const fs = require("fs");
const path = require("path");

// 递归收集依赖
function collectDeps(pkgName, nodeModulesPath, visited = new Set()) {
    if (visited.has(pkgName)) return [];
    visited.add(pkgName);
    const pkgPath = path.join(nodeModulesPath, pkgName, "package.json");
    if (!fs.existsSync(pkgPath)) return [];
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const deps = pkgJson.dependencies ? Object.keys(pkgJson.dependencies) : [];
    let all = [`node_modules/${pkgName}/**`];
    for (const dep of deps) {
        all = all.concat(collectDeps(dep, nodeModulesPath, visited));
    }
    return all;
}

// 自动更新 electron-builder.config.js 的 asarUnpack 字段
function updateElectronBuilderConfig(asarUnpackList) {
    const configPath = path.resolve(__dirname, "packageScript/electron-builder.config.js");
    let content = fs.readFileSync(configPath, "utf-8");
    // 用正则替换 asarUnpack 字段
    const newAsarUnpack = `asarUnpack: ${JSON.stringify(asarUnpackList, null, 4)},`;
    content = content.replace(/asarUnpack:\s*\[[^\]]*\],/s, newAsarUnpack);
    fs.writeFileSync(configPath, content, "utf-8");
    console.log("已自动更新 electron-builder.config.js 的 asarUnpack 字段！");
}

// 主入口
function main() {
    const nodeModulesPath = path.resolve(__dirname, "node_modules");
    const rootPkg = "chrome-launcher";
    const asarUnpackList = Array.from(new Set(collectDeps(rootPkg, nodeModulesPath)));
    console.log("asarUnpack 配置如下：");
    console.log(JSON.stringify(asarUnpackList, null, 2));
    updateElectronBuilderConfig(asarUnpackList);
}

main();
