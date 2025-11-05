#!/bin/bash

# BayMax-Trader nof0主题启动脚本
# Start nof0 theme interface for BayMax-Trader

echo "🚀 启动BayMax-Trader nof0主题界面..."
echo "🚀 Starting BayMax-Trader nof0 theme interface..."

# 检查nof0目录是否存在
if [ ! -d "nof0" ]; then
    echo "❌ 错误: nof0目录不存在"
    echo "❌ Error: nof0 directory not found"
    exit 1
fi

# 进入nof0目录
cd nof0

echo "📂 当前目录: $(pwd)"
echo "📂 Current directory: $(pwd)"

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: Python3未安装"
    echo "❌ Error: Python3 not installed"
    exit 1
fi

echo "🌐 启动HTTP服务器在端口8080..."
echo "🌐 Starting HTTP server on port 8080..."
echo "🔗 访问地址: http://localhost:8080"
echo "🔗 Access URL: http://localhost:8080"
echo ""
echo "💡 提示: 按Ctrl+C停止服务器"
echo "💡 Tip: Press Ctrl+C to stop the server"
echo ""

# 启动HTTP服务器
python3 -m http.server 8080