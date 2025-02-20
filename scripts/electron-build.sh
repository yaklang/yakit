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
    max_attempts=3
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        echo "Start to building ${item}"
        if [ "${item}" = "ce" ]; then
            yarn electron-publish && break # 如果成功则退出循环
        elif [ "${item}" = "ee" ]; then
            yarn electron-publish-ee && break # 如果成功则退出循环
        else
            echo "Unknown packaged version: ${item}" >&2
            exit 1
        fi
        attempt=$((attempt + 1))
        sleep 2 # 失败后等待2000ms再重试
    done
    [ $attempt -gt $max_attempts ] && {
        echo "${item} legacy build xceeded retry attempts" >&2
        exit 1
    } # 超过重试次数则失败

    yarn remove electron && yarn add electron@22.3.27 --dev
    cp ./bins/yak_windows_legacy_amd64.zip ./bins/yak_windows_amd64.zip
    max_attempts=3
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        echo "Start to building ${item}"
        if [ "${item}" = "ce" ]; then
            yarn electron-publish-legacy && break # 如果成功则退出循环
        elif [ "${item}" = "ee" ]; then
            yarn electron-publish-ee-legacy && break # 如果成功则退出循环
        else
            echo "Unknown packaged version: ${item}" >&2
            exit 1
        fi
        attempt=$((attempt + 1))
        sleep 2 # 失败后等待2000ms再重试
    done
    [ $attempt -gt $max_attempts ] && {
        echo "${item} legacy build xceeded retry attempts" >&2
        exit 1
    } # 超过重试次数则失败
done

exit 0 # 打包完全成功后退出
