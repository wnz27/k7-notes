import { getCollection } from "astro:content";
import { getPostUrlBySlug, url } from "@utils/url-utils";
import type { APIRoute } from "astro";
import { profileConfig, siteConfig } from "@/config";

export const GET: APIRoute = async ({ site }) => {
	const posts = await getCollection("posts", ({ data }) => !data.draft);
	posts.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
	const absoluteUrl = (path: string) => new URL(path, site).href;
	const articles = posts
		.map(
			(post) =>
				`- [${post.data.title}](${absoluteUrl(getPostUrlBySlug(post.slug))})${post.data.description ? `: ${post.data.description}` : ""}`,
		)
		.join("\n");

	const content = `# ${siteConfig.title}

> ${profileConfig.name} 的个人技术博客，记录软件工程实践、AI 辅助开发、开源项目，以及计算机系统与设计模式知识。

文章以简体中文为主。文章列表按发布日期从新到旧排列，链接指向原文页面。
引用内容时请保留作者、文章标题与原文链接，具体内容许可见文章页。

## 站点导航

- [首页](${absoluteUrl(url("/"))}): 博客简介与最新文章。
- [文章归档](${absoluteUrl(url("/archive/"))}): 按时间、分类和标签浏览文章。

## 知识专题

- [计算机系统知识](${absoluteUrl(url("/computer-systems/"))}): 通过交互演示理解 TCP 全双工通信、双向字节流、收发缓冲区与流量控制。
- [设计模式](${absoluteUrl(url("/design-patterns/"))}): 设计模式的概念、代码示例与交互演示。

## 文章

${articles}

## Optional

- [RSS](${absoluteUrl(url("/rss.xml"))}): 文章订阅源，包含文章正文。
- [站点地图](${absoluteUrl(url("/sitemap-index.xml"))}): 站点页面索引。
`;

	return new Response(content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
