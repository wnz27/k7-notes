# 博客部署

域名：`http://tech-blog.27k.online`。SSH 别名：`27-hermes`。
本地构建产物为 `dist/`，服务器目录为 `/var/www/k7_blog`。
站点为静态文件，不需要 Node.js 服务。

## 手动更新博客

本机需要 Node.js 20+、pnpm 9.14.4、rsync，已安装项目依赖，并可通过 `ssh 27-hermes` 登录服务器。在仓库根目录执行：

```sh
bash deploy/deploy.sh
```

脚本自动定位仓库根目录，执行 `pnpm build`，检查 `dist/index.html`，再上传全部制品。
也可从其他目录通过脚本的绝对路径执行。构建或上传失败时，脚本会立即停止。

同步会覆盖同名文件，并在传输结束后删除远端不在 `dist/` 中的旧制品。
`/var/www/k7_blog` 仅用于博客制品，请勿存放其他文件。
服务器目录由 `ubuntu:www-data` 持有。目录权限为 `755`，文件权限为 `644`。
脚本只更新博客制品，不会安装或重新加载 Nginx 配置。

## 手动启用 Nginx

配置文件为 `deploy/tech-blog.27k.online.conf`。服务器现有的 `nginx.conf` 应在 `http` 块中加载 `/etc/nginx/mime.types` 和 `/etc/nginx/conf.d/*.conf`。

先在本机仓库根目录上传配置并登录服务器：

```sh
scp deploy/tech-blog.27k.online.conf 27-hermes:/tmp/tech-blog.27k.online.conf
ssh 27-hermes
```

在服务器上安装配置：

```sh
sudo install -m 0644 /tmp/tech-blog.27k.online.conf /etc/nginx/conf.d/tech-blog.27k.online.conf
sudo nginx -t
```

确认检查通过后，再加载配置：

```sh
sudo systemctl reload nginx
curl -I http://tech-blog.27k.online/
```

配置支持文章目录的 `index.html`。不存在的页面返回 `404`。
`/_astro/` 中带哈希的构建资源缓存一年。HTML、RSS、sitemap 和 Pagefind 文件每次使用前重新验证。
Pagefind 的 `.pagefind` 文件使用默认二进制 MIME 类型。

## HTTPS

当前配置只提供 HTTP，构建配置中的 `site` 也使用 HTTP。
现有 HTTPS 服务的证书不匹配此域名。
取得匹配 `tech-blog.27k.online` 的证书后，再配置 Nginx 的 HTTPS 服务。
同时将 `astro.config.mjs` 的 `site` 改为 `https://tech-blog.27k.online`，重新构建并上传。

Nginx 配置由你手动安装和加载。

参考：[Nginx 静态文件与路由指令](https://nginx.org/en/docs/http/ngx_http_core_module.html)、[响应头指令](https://nginx.org/en/docs/http/ngx_http_headers_module.html)。
