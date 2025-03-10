#!/bin/sh
# 用法: ./electron-builder.sh <version>
# 示例: ./electron-builder.sh sast

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

item="$1"

rm -rf ./app/renderer/pages
rm -rf ./release

./packageScript/script/installRender.sh ${item} || { exit 1; }

yarn remove electron && yarn add electron@27.0.0 --dev
cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
if [ "${item}" = "sast" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-sastScan" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-sastScan" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-sastScan" || { exit 1; }
elif [ "${item}" = "sastee" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-sastScan-ee" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-sastScan-ee" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-sastScan-ee" || { exit 1; }
else
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi

yarn remove electron && yarn add electron@22.3.27 --dev
cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
if [ "${item}" = "sast" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-sastScan-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-sastScan-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-sastScan-legacy" || { exit 1; }
elif [ "${item}" = "sastee" ]; then
    ./packageScript/script/retryScript.sh "yarn pack-win-sastScan-ee-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-linux-sastScan-ee-legacy" || { exit 1; }
    ./packageScript/script/retryScript.sh "yarn pack-mac-sastScan-ee-legacy" || { exit 1; }
else
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi
