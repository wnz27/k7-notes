#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

pnpm build

if [[ ! -f dist/index.html ]]; then
    printf '构建产物缺少 dist/index.html，停止部署。\n' >&2
    exit 1
fi

rsync -rt --delay-updates --delete-delay --chmod=D755,F644 \
    -e 'ssh -o BatchMode=yes -o ConnectTimeout=15' \
    dist/ 27-hermes:/var/www/k7_blog/

printf '博客制品已更新到 27-hermes:/var/www/k7_blog\n'
printf '站点地址：https://tech-blog.27k.online\n'
