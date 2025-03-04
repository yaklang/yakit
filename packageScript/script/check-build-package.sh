#!/bin/sh
# 用法: ./verify_packages.sh <file_name>
# 示例: ./verify_packages.sh Yakit

if [ "$#" -lt 1 ]; then
    echo "Usage: $0 <file_name>"
    exit 1
fi

prefix="$1"

# 定义在 ./release 目录下的预期文件模式，每个模式都用传入的前缀替换
patterns="
./release/${prefix}-*-darwin-arm64.dmg
./release/${prefix}-*-darwin-x64.dmg
./release/${prefix}-*-linux-amd64.AppImage
./release/${prefix}-*-linux-arm64.AppImage
./release/${prefix}-*-windows-amd64.exe
./release/${prefix}-*-darwin-legacy-arm64.dmg
./release/${prefix}-*-darwin-legacy-x64.dmg
./release/${prefix}-*-linux-legacy-amd64.AppImage
./release/${prefix}-*-linux-legacy-arm64.AppImage
./release/${prefix}-*-windows-legacy-amd64.exe
"

# 对每个模式进行遍历检查
for pattern in $patterns; do
    count=0
    file_found=""
    # 遍历匹配该模式的所有文件（如果没有匹配，模式会原样返回）
    for file in $pattern; do
        # 如果 file 等于模式本身且该文件不存在，则说明没有匹配
        if [ "$file" = "$pattern" ] && [ ! -e "$file" ]; then
            break
        fi
        if [ -f "$file" ]; then
            count=$((count + 1))
            file_found="$file"
        fi
    done

    if [ "$count" -eq 0 ]; then
        echo "Error: No file found matching pattern: $pattern" >&2
        exit 1
    elif [ "$count" -gt 1 ]; then
        echo "Error: Multiple files found matching pattern: $pattern" >&2
        exit 1
    else
        echo "Found: $file_found"
    fi
done
