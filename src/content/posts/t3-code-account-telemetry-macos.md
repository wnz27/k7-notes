---
title: "T3 Code 的账号遥测改动与 macOS 更新方法"
published: 2026-11-25
description: "T3 Code 旧版如何读取 Codex 和 Claude 账号标识，以及在 macOS 上关闭上报和升级 0.1.12 的方法。"
tags: ["T3 Code", "macOS", "遥测"]
category: "开源项目"
draft: false
---

我本机装的是 T3 Code `0.1.11 (59651c1761f6)`。这个构建在启动时会从 Codex 和 Claude 的登录文件取账号标识，用于产品遥测。T3 Code 在 `0.1.12` 稳定版里移除了这项读取。

## 事件时间线

以下时间均为北京时间。

- **11 月 20 日 15:38**，T3 Code 发布 `0.1.11` 稳定版，构建号为 `59651c1761f6`。[0.1.11 发布页](https://github.com/pingdotgg/t3code/releases/tag/v0.1.11)
- **11 月 25 日 04:46**，修复合入主分支，提交为 `84e4264bb347`。产品遥测改用随机安装 ID 的哈希，移除了读取 Codex、Claude 登录文件和上报账号标识的代码。[修复 PR #42299](https://github.com/pingdotgg/t3code/pull/42299)
- **11 月 25 日 15:36**，T3 Code 发布包含修复的 `0.1.12` 稳定版，构建号为 `ca81b7b97a1c`。[0.1.12 发布页](https://github.com/pingdotgg/t3code/releases/tag/v0.1.12)

## 旧版读了什么

`0.1.11` 的服务启动时会读取 `~/.codex/auth.json` 和 `~/.claude.json`。找到账号标识后，服务会计算 SHA-256 哈希。产品遥测默认开启。这些哈希值随事件送出，可用来关联同一账号的多个安装。按当时的文档，事件发往 `ingest.t3.codes`，由 T3 留存一份并转发给 PostHog。[0.1.11 源码](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/server/src/telemetry/Identify.ts#L253-L339) · [当时的遥测文档](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/docs/user/telemetry.md#L3-L13)

比如，公司电脑和家里的电脑各跑一套旧版 T3 Code，都开了遥测，也都登录了同一个 Codex 账号。如果能接触这些遥测记录的人也知道你的账号 ID，就可能借助未加盐的哈希，把两边的使用记录归到你的账号。原本分开的工作和个人使用记录一旦合并，对方就可能从事件的时间和次数推测你通常什么时候用 AI 编程工具、用得有多频繁，比如是否经常在晚间或周末使用。

这里的「安装」按 T3 Code 服务数据目录里保存的随机 ID 来区分。遥测发送的是这个 ID 的哈希。比如两台电脑各自运行 T3 Code、各自创建数据目录，就会有两个安装 ID。升级时只要保留原来的 ID 文件，服务就会沿用原来的安装 ID。[安装 ID 的生成与复用](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/server/src/telemetry/Identify.ts#L219-L294)

## 临时方案是在 macOS 关闭上报

在 `~/.zshrc` 的末尾加上这一行。

```zsh
export T3CODE_TELEMETRY_ENABLED=false
```

保存文件，按 `⌘Q` **完全退出 T3 Code**，再重新打开。桌面应用启动时会读取 shell 配置里的这个环境变量。[0.1.11 的关闭说明](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/docs/user/telemetry.md#L22-L31)

**这个开关会停止产品遥测上报。旧构建在初始化时仍会读取两个登录文件。** 服务先读文件，发送前再检查开关。[旧版遥测实现](https://github.com/pingdotgg/t3code/blob/59651c1761f6c63e9b6056839067066968e6a406/apps/server/src/telemetry/AnalyticsService.ts#L122-L235)

## 永久方案是安装 0.1.12 稳定版

按 Mac 的芯片类型选官方安装包。

- Apple Silicon（M 系列）用 [T3-Code-0.1.12-arm64.dmg](https://github.com/pingdotgg/t3code/releases/download/v0.1.12/T3-Code-0.1.12-arm64.dmg)。
- Intel Mac 用 [T3-Code-0.1.12-x64.dmg](https://github.com/pingdotgg/t3code/releases/download/v0.1.12/T3-Code-0.1.12-x64.dmg)。

退出旧版，打开 DMG，把新版拖进「应用程序」并替换旧版。重新打开 T3 Code，在「关于 T3 Code」确认版本号为 `0.1.12`。新版用本地生成的随机安装 ID 计算遥测标识，产品遥测因此无需再读这两个登录文件。[官方安装包列表](https://github.com/pingdotgg/t3code/releases/expanded_assets/v0.1.12) · [0.1.12 遥测源码](https://github.com/pingdotgg/t3code/blob/v0.1.12/apps/server/src/telemetry/Identify.ts#L122-L151)
