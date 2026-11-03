---
title: "GameFX：把 34 个游戏开发概念做成可调用的 AI Skill"
published: 2026-11-03
description: "介绍 GameFX 如何将 34 个游戏开发概念整理为 AI Skill 配方与斜杠命令，以及通过 K7s-Arsenal 安装、生成和验证游戏机制与动效的方法。"
tags: ["GameFX", "游戏开发", "AI Skill"]
category: "开源项目"
draft: false
---

最近看到 [Game Development Cheat Sheet](https://gamedev-cheatsheet.com/)，这个网站用 34 个动画解释游戏开发中的常见概念。射线击中物体时如何显示命中点和法线，角色离开平台后为什么还能跳一次，高速子弹为什么会穿过薄墙，都可以用一小段动态演示讲清楚。

看完 3D & Rendering 部分后，我产生了一个想法。既然每个动画背后都有一套明确的制作规则，能不能把这些规则整理成 Skill，让 AI 接到一个命令后，直接在当前项目里实现对应的机制和动效？

于是有了 [GameFX](https://github.com/wnz27/K7s-Arsenal)。它目前覆盖网站的全部 34 个条目，并通过 K7s-Arsenal 仓库提供 npx 安装。

## GameFX 是什么

GameFX 由一套核心制作流程、34 份独立配方和 34 个斜杠命令组成，不提供视频或现成游戏素材。

每份配方记录一个概念的核心规则、动画分镜、常见错误和验收标准。调用命令后，Agent 会读取对应配方，检查当前项目的引擎、语言和渲染循环，再生成实现并运行验证。

已有游戏项目时，它会优先沿用项目已有架构。没有工程且没有指定技术栈时，默认可生成一个使用原生 Canvas 2D 或 WebGL 的单文件 HTML，不要求额外安装前端依赖。

GameFX 提供制作方法，具体效果需要在项目中生成和验证。

## 34 个条目覆盖了什么

内容分为四组。

| 分类 | 数量 | 包含内容 |
| --- | --- | --- |
| 3D & Rendering | 8 | 射线检测、法线、LOD、视锥剔除、片元着色器、公告牌、四元数、深度冲突 |
| Game feel | 10 | 帧间隔时间、土狼时间、缓动、屏幕震动、挤压拉伸、相机死区、输入缓冲、加速减速、命中停顿、无敌帧 |
| Systems | 9 | 对象池、有限状态机、攻击盒与受击盒、A* 寻路、粒子系统、固定时间步、转向行为、隧穿、种子噪声 |
| Performance | 7 | 帧预算、绘制调用、空间划分、重复绘制、时间分片、纹理图集、分块流式加载 |

这些条目有些直接表现为视觉效果，有些属于内部机制。GameFX 会把两者拆开处理，内部逻辑必须真实运行，可视化层负责把状态变化展示出来。

比如 A* 寻路需要维护开放节点、已关闭节点、实际代价和父节点，路径通过搜索过程产生，不能画一条预先写好的路线代替。对象池也需要有真实行为，包括获取、重置、释放和容量耗尽。

## 动效背后需要具体规则

只告诉 AI「做一个屏幕震动」，通常能得到一个会抖的画面，但抖动是否自然、轻击和重击是否有区别、相机最终会不会漂移，仍然没有答案。

GameFX 的屏幕震动配方把这些要求写成可执行规则。命中增加一个限制在 0 到 1 之间的 trauma，随时间衰减，振幅使用 trauma 的平方，再通过连续噪声计算相机偏移。震动只作用于视觉相机，不改变瞄准和碰撞使用的逻辑位姿，同时保留降低或关闭震动的设置。

命中停顿也有类似问题。简单做法是把整个游戏暂停一下，但这样可能连菜单、输入和结束停顿所需的计时器一起冻结。配方要求只冻结攻击者和受击者，停顿计时使用未缩放时间，输入继续采集，粒子和 UI 是否继续运行则需要明确选择。

LOD 除了准备不同精度的模型，还要处理频繁换档。物体在切换距离附近往返时，如果每帧换档，画面会不断闪烁。因此配方加入约 10% 的滞回带，并要求隐藏的高细节网格停止昂贵的动画或 CPU 更新。

这些规则比一句「让效果更有打击感」更长，却更接近实际开发需要完成的工作。

## 用命令调用

安装后，可以直接输入：

```text
/gamefx-screen-shake
```

也可以在命令后继续补充要求：

```text
/gamefx-pathfinding 制作一个可以切换障碍物的 A* 网格演示
/gamefx-particle-system 使用现有项目的引擎实现火花和烟雾
/gamefx-lod 做一个可以手动调整距离的 LOD 演示
```

每个命令对应一份独立参考文件，Agent 不需要一次读取全部 34 个条目，可以减少无关上下文。

## 一条 npx 命令安装

K7s-Arsenal 根目录提供了无第三方依赖的 Node.js 安装器。环境需要 Node.js 18 或更高版本，以及支持 Agent Skills 的 Kimi Code。

查看仓库里可以安装的 Skill：

```bash
npx --yes github:wnz27/K7s-Arsenal --list
```

在目标项目根目录安装 GameFX：

```bash
npx --yes github:wnz27/K7s-Arsenal gamefx
```

文件会进入当前项目的 `.agents/skills/`。需要安装到其他项目时，可以指定路径：

```bash
npx --yes github:wnz27/K7s-Arsenal gamefx --project /path/to/project
```

安装到用户级目录，则使用：

```bash
npx --yes github:wnz27/K7s-Arsenal gamefx --user
```

为避免静默覆盖本地修改，目标文件已存在时安装会停止。确认更新后，加上 `--force`：

```bash
npx --yes github:wnz27/K7s-Arsenal gamefx --force
```

安装或更新完成后，在 Kimi Code 中执行 `/reload` 刷新列表。

安装流程已用真实 GitHub 地址做过端到端验证，包括 Skill 发现、项目安装、用户级路径、重复安装保护和强制更新。

## 仓库如何支持更多 Skill

K7s-Arsenal 采用一个根目录对应一个 Skill 的组织方式，目录名就是安装时使用的名称。

```text
K7s-Arsenal/
├── gamefx/
│   ├── SKILL.md
│   ├── references/
│   └── commands/
├── <future-skill>/
│   ├── SKILL.md
│   ├── references/
│   └── commands/
├── bin/cli.mjs
└── package.json
```

`SKILL.md` 保存核心流程，`references/` 保存按需读取的知识，`commands/` 保存可选的斜杠命令入口。安装器只发现根目录下包含 `SKILL.md` 的目录，所以以后新增 Skill 不需要修改 CLI。

安装时，核心文件和参考资料会复制到目标 Skill 目录，命令文件则复制到目标 `.agents/skills/` 根目录。用户只需要记住仓库地址和 Skill 名，不需要理解内部目录细节。

## 当前边界

GameFX 当前面向 Kimi Code 的 Skill 机制。其他 Agent 是否兼容，需要分别确认目录扫描、参数替换和斜杠命令行为。

配方也不会替代项目测试。生成结果仍然需要在目标引擎和真实场景中验证，尤其是 GPU 性能、深度精度、碰撞和帧率相关问题。教学演示中的模拟数据必须明确标注，不能当成项目已经优化的证据。

GameFX 把 34 个容易只停留在名词层面的游戏开发概念，整理成 34 条可以调用、实现和验收的制作路径。

项目地址：[https://github.com/wnz27/K7s-Arsenal](https://github.com/wnz27/K7s-Arsenal)。代码采用 MIT License。
