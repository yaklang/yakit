#!/bin/sh

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <file_name>"
    exit 1
fi

prefix="$1"

# 定义模式（保持原样）
patterns="
./release/${prefix}-*-darwin-arm64.dmg
./release/${prefix}-*-darwin-x64.dmg
./release/${prefix}-*-windows-amd64.exe
./release/${prefix}-*-linux-amd64.AppImage
./release/${prefix}-*-linux-arm64.AppImage
./release/${prefix}-*-darwin-legacy-arm64.dmg
./release/${prefix}-*-darwin-legacy-x64.dmg
./release/${prefix}-*-linux-legacy-amd64.AppImage
./release/${prefix}-*-linux-legacy-arm64.AppImage
./release/${prefix}-*-windows-legacy-amd64.exe
"

echo "所有模式列表："
echo "$patterns"
echo "===="

# 保存原始的 IFS
OLDIFS="$IFS"
# 设置 IFS 只包含换行符，避免空格分割
IFS='
'

# 遍历模式（每行一个模式）
for pattern in $patterns; do
    # 跳过空行
    [ -z "$pattern" ] && continue

    echo "检查模式: '$pattern'"

    # 临时恢复默认 IFS 用于文件扩展
    IFS="$OLDIFS"

    count=0
    file_found=""
    found_files=""

    # 方法1：使用 find 命令（推荐，更可靠）
    found_files=$(find ./release -path "$pattern" 2>/dev/null)

    if [ -n "$found_files" ]; then
        # 计算找到的文件数量
        count=$(echo "$found_files" | wc -l | tr -d ' ')

        if [ "$count" -eq 1 ]; then
            file_found="$found_files"
        fi
    fi

    # 恢复换行符作为分隔符继续循环
    IFS='
    '

    if [ "$count" -eq 0 ]; then
        echo "Error: No file found matching pattern: $pattern" >&2
        IFS="$OLDIFS"
        exit 1
    elif [ "$count" -gt 1 ]; then
        echo "Error: Multiple files found matching pattern: $pattern" >&2
        echo "找到的文件："
        echo "$found_files"
        IFS="$OLDIFS"
        exit 1
    else
        echo "Found: $file_found"
    fi
done

# 恢复原始 IFS
IFS="$OLDIFS"
echo "所有文件验证通过！"
