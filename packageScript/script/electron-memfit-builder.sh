#!/bin/sh
# 用法: ./electron-memfit-builder.sh <version>
# 示例: ./electron-memfit-builder.sh memfit

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

item="$1"
if [ "${item}" != "memfit" ]; then
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi

edition="memfit"

electron_version=$(node -p "require('./package.json').devDependencies.electron")
[ -n "$electron_version" ] && [ "$electron_version" != "undefined" ] || { echo "Failed to read electron version from package.json" >&2; exit 1; }

rm -rf ./app/renderer/engine-link-startup/dist
rm -rf ./app/renderer/pages
rm -rf ./release

./packageScript/script/installMemfitRender.sh ${item} || { exit 1; }

# Electron 44 无 postinstall，只 add 不 remove，避免失败时 package.json 丢失 electron 且本地 dist 被清空
yarn add "electron@${electron_version}" --dev && node node_modules/electron/install.js || { exit 1; }
cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
./packageScript/script/retryScript.sh "yarn cli pack -s win -v ${edition}" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s linux -v ${edition}" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s mac -v ${edition} --sign" || { exit 1; }

# legacy 段会改写 package.json 的 electron 版本，用 trap 保证任何退出路径都还原；
# Electron 44 无 postinstall，还原后需显式补跑 install.js 恢复本地 dist
trap 'yarn add "electron@${electron_version}" --dev && node node_modules/electron/install.js' EXIT
yarn add electron@22.3.27 --dev || { exit 1; }
cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
./packageScript/script/retryScript.sh "yarn cli pack -s win -v ${edition} --legacy" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s linux -v ${edition} --legacy" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s mac -v ${edition} --legacy" || { exit 1; }
