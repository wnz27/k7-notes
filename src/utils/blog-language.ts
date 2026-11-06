import english from "../i18n/blog-en.json";

type Language = "zh-CN" | "en";
type Original = { source: string; rendered: string };
const translations: Record<string, string> = english;
const storageKey = "k7-blog-language";
const excluded = 'script, style, pre, code, kbd, samp, svg, math, noscript, [translate="no"], [data-no-i18n], #chart-heading, #view-badge, #matrix, #months, #row-axis, #legend, #play-label, #announcement, #tooltip';
const attributes = ["title", "aria-label", "placeholder", "alt", "content"];
const originals = new WeakMap<Node, Map<string, Original>>();
let language: Language = "zh-CN";
try {
	if (localStorage.getItem(storageKey) === "en") language = "en";
} catch { /* Language switching also works when storage is unavailable. */ }

function translate(value: string) {
	const key = value.trim().replace(/\s+/g, " ");
	const count = key.match(/^(\d+)\s*(字|分钟|篇文章)$/);
	const units: Record<string, string> = { 字: "character", 分钟: "minute", 篇文章: "post" };
	const translated = translations[key] || (count ? `${count[1]} ${units[count[2]]}${Number(count[1]) === 1 ? "" : "s"}` : undefined);
	if (language !== "en" || !translated) return value;
	return value.slice(0, value.indexOf(value.trim())) + translated + value.slice(value.trimEnd().length);
}

function update(node: Node, key: string, value: string, write: (value: string) => void) {
	let entries = originals.get(node);
	if (!entries) {
		entries = new Map();
		originals.set(node, entries);
	}
	let entry = entries.get(key);
	if (!entry || value !== entry.rendered) {
		entry = { source: value, rendered: value };
		entries.set(key, entry);
	}
	let rendered = translate(entry.source);
	// Add English word boundaries where Chinese prose touches inline links or code.
	if (language === "en" && rendered !== entry.source && key === "text" && node.parentElement?.closest(".custom-md")) {
		if (node.previousSibling instanceof Element && !/^[\s,.;:!?%)\]}]/.test(rendered)) rendered = ` ${rendered}`;
		if (node.nextSibling instanceof Element && !/[\s(\[{]$/.test(rendered)) rendered += " ";
	}
	entry.rendered = rendered;
	if (value !== rendered) write(rendered);
}

function translateTree(root: Node) {
	const element = root instanceof Element ? root : root.parentElement;
	if (element?.closest(excluded)) return;
	if (root instanceof Text) {
		update(root, "text", root.data, (value) => { root.data = value; });
		return;
	}
	if (root instanceof Element) {
		if (root instanceof HTMLImageElement) {
			const src = language === "en" ? root.dataset.srcEn : root.dataset.srcZh;
			if (src && root.getAttribute("src") !== src) root.setAttribute("src", src);
		}
		for (const attribute of attributes) {
			if (attribute === "content" && !root.matches('meta[name="description"], meta[property$="title"], meta[property$="description"], meta[name$="title"], meta[name$="description"]')) continue;
			const value = root.getAttribute(attribute);
			if (value) update(root, attribute, value, (text) => root.setAttribute(attribute, text));
		}
	}
	for (const child of root.childNodes) translateTree(child);
}

const observer = new MutationObserver((records) => {
	observer.disconnect();
	for (const record of records) {
		if (record.type === "childList") {
			for (const node of record.addedNodes) translateTree(node);
		} else {
			translateTree(record.target);
		}
	}
	observe();
});

function observe() {
	observer.observe(document.documentElement, {
		subtree: true,
		childList: true,
		characterData: true,
		attributes: true,
		attributeFilter: attributes,
	});
}

function applyLanguage() {
	observer.disconnect();
	document.documentElement.lang = language;
	translateTree(document.documentElement);
	const button = document.getElementById("blog-language-switch");
	if (button) {
		button.textContent = language === "en" ? "中文" : "EN";
		button.lang = language === "en" ? "zh-CN" : "en";
		button.setAttribute("aria-label", language === "en" ? "切换为中文" : "Switch to English");
		button.setAttribute("title", button.getAttribute("aria-label") || "");
	}
	document.dispatchEvent(new CustomEvent("blog:language-change", { detail: { language } }));
	observe();
}

document.getElementById("blog-language-switch")?.addEventListener("click", () => {
	language = language === "en" ? "zh-CN" : "en";
	try { localStorage.setItem(storageKey, language); } catch { /* Keep the in-memory choice. */ }
	applyLanguage();
});

window.addEventListener("storage", (event) => {
	if (event.key !== storageKey) return;
	language = event.newValue === "en" ? "en" : "zh-CN";
	applyLanguage();
});

function setupNavigation() {
	window.swup.hooks.on("page:view", applyLanguage);
}
if (window.swup?.hooks) setupNavigation();
else document.addEventListener("swup:enable", setupNavigation, { once: true });

applyLanguage();
