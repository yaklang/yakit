#!/bin/sh
# 用法: ./installRender.sh <version>
# 示例: ./installRender.sh ce

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

link_file_name="$1.zip"
echo "Start to download link render: ${link_file_name}"
wget -O ${link_file_name} https://yaklang.oss-accelerate.aliyuncs.com/link/render/${LINK_RENDER_VERSION}/${link_file_name} || {
    echo "Error: Download link render Failed" >&2
    exit 1
}
unzip -n ${link_file_name} -d ./app/renderer/engine-link-startup
rm ./${link_file_name}

file_name="$1.zip"
echo "Start to download ${file_name}"
wget -O ${file_name} https://yaklang.oss-accelerate.aliyuncs.com/yak/render/${RENDER_VERSION}/${file_name} || {
    echo "Error: Download Render Failed" >&2
    exit 1
}
unzip -n ${file_name} -d ./app/renderer
rm ./${file_name}
