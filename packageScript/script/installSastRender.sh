#!/bin/sh
# 用法: ./installRender.sh <version>
# 示例: ./installRender.sh ce

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

file_name="$1.zip"
echo "Start to download ${file_name}"
wget -O ${file_name} https://oss-qn.yaklang.com/yak/render/sast/${RENDER_VERSION}/${file_name} || {
    echo "Error: Download Render Failed" >&2
    exit 1
}
unzip -n ${file_name} -d ./app/renderer
rm ./${file_name}
