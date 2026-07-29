#!/bin/sh
# 用法: ./retryScript.sh <script>
# 示例: ./retryScript.sh yarn pack-win

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <script>"
    exit 1
fi

script="$1"

max_attempts=3
attempt=1
while [ $attempt -le $max_attempts ]; do
    echo "Start to execute ${script}"
    eval "${script}" && break # 如果成功则退出循环
    attempt=$((attempt + 1))
    sleep 2 # 失败后等待2000ms再重试
done
[ $attempt -gt $max_attempts ] && {
    echo "${script} command exceeded retry attempts" >&2
    exit 1
} # 超过重试次数则失败
exit 0
