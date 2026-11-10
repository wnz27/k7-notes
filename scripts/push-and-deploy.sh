#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ "$(git branch --show-current)" != "main" ]]; then
    printf '请先切换到 main 分支，再推送和部署。\n' >&2
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    printf '工作区存在未提交的修改或未跟踪文件，请先提交，或使用 git stash -u 收起改动。\n' >&2
    exit 1
fi

if [[ ! -f deploy/deploy.sh ]]; then
    printf '缺少本机部署脚本 deploy/deploy.sh。\n' >&2
    exit 1
fi

git push origin main
bash deploy/deploy.sh
