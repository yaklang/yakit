#!/bin/sh
# 用法: ./electron-irify-builder.sh <version>
# 示例: ./electron-irify-builder.sh irify

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

item="$1"
if [ "${item}" = "irify" ]; then
    edition="irify"
elif [ "${item}" = "irifyee" ]; then
    edition="irifyEE"
else
    echo "Unknown packaged version: ${item}" >&2
    exit 1
fi

rm -rf ./app/renderer/engine-link-startup/dist
rm -rf ./app/renderer/pages
rm -rf ./release

./packageScript/script/installIRifyRender.sh ${item} || { exit 1; }

yarn remove electron && yarn add electron@27.0.0 --dev
cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
./packageScript/script/retryScript.sh "yarn cli pack -s win -v ${edition}" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s linux -v ${edition}" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s mac -v ${edition} --sign" || { exit 1; }

yarn remove electron && yarn add electron@22.3.27 --dev
cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
./packageScript/script/retryScript.sh "yarn cli pack -s win -v ${edition} --legacy" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s linux -v ${edition} --legacy" || { exit 1; }
./packageScript/script/retryScript.sh "yarn cli pack -s mac -v ${edition} --legacy" || { exit 1; }
