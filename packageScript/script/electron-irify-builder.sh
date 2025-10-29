#!/bin/sh
# 用法: ./electron-builder.sh <version>
# 示例: ./electron-builder.sh irify

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

item="$1"

rm -rf ./app/renderer/engine-link-startup/dist
rm -rf ./app/renderer/pages
rm -rf ./release

./packageScript/script/installIRifyRender.sh ${item} || { exit 1; }

yarn remove electron && yarn add electron@27.0.0 --dev
cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
if [ "${item}" = "irify" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-irify" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-irify" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-irify" || { exit 1; }
elif [ "${item}" = "irifyee" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-irify-ee" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-irify-ee" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-irify-ee" || { exit 1; }
else
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi

yarn remove electron && yarn add electron@22.3.27 --dev
cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
if [ "${item}" = "irify" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-irify-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-irify-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-irify-legacy" || { exit 1; }
elif [ "${item}" = "irifyee" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-irify-ee-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-irify-ee-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-irify-ee-legacy" || { exit 1; }
else
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi
