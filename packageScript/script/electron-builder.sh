yarn add -D dmg-license

render_path="./app/renderer/pages"

versions=("ce" "ee") # 打包的版本集合
for item in "${versions[@]}"; do
    file_name="${item}.zip"
    echo "Start to download ${file_name}"
    rm -rf ${render_path}
    wget -O ${file_name} https://oss-qn.yaklang.com/yak/render/${file_name}
    unzip -n ${file_name} -d ./app/renderer
    rm ./${file_name}
    echo "End to install ${file_name}"

    yarn remove electron && yarn add electron@27.0.0 --dev
    cp ./bins/yak_windows_normal_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        yarn pack-win && yarn pack-linux && yarn pack-sign-mac
    elif [ "${item}" = "ee" ]; then
        yarn pack-win-ee && yarn pack-linux-ee && yarn pack-sign-mac-ee
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi

    yarn remove electron && yarn add electron@22.3.27 --dev
    cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
    if [ "${item}" = "ce" ]; then
        yarn pack-win-legacy && yarn pack-linux-legacy && yarn pack-sign-mac-legacy
    elif [ "${item}" = "ee" ]; then
        yarn pack-win-ee-legacy && yarn pack-linux-ee-legacy && yarn pack-sign-mac-ee-legacy
    else
        echo "Unknown packaged version: ${item}" >&2
        exit 1
    fi
done

exit 0 # 打包完全成功后退出
