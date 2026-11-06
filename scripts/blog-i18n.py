#!/usr/bin/env python3
"""Cache English translations of the Chinese text in the built blog."""

import argparse
import concurrent.futures
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import threading
import time
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "src/i18n/blog-en.json"
HAN = re.compile(r"[\u3400-\u9fff]")
SKIP = {"script", "style", "pre", "code", "kbd", "samp", "svg", "math", "noscript"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
ATTRIBUTES = {"aria-label", "title", "placeholder", "alt"}
# Client-rendered controls can be absent from the static HTML.
UI = {
    "主页": "Home", "关于": "About", "归档": "Archive", "搜索": "Search",
    "标签": "Tags", "分类": "Categories", "最新文章": "Recent Posts",
    "评论": "Comments", "无标题": "Untitled", "未分类": "Uncategorized",
    "无标签": "No Tags", "字": "words", "分钟": "minutes", "篇文章": "posts",
    "主题色": "Theme Color", "亮色": "Light", "暗色": "Dark",
    "跟随系统": "System", "更多": "More", "作者": "Author",
    "发布于": "Published at", "许可协议": "License",
}


def normalize(value):
    return re.sub(r"\s+", " ", value).strip()


class BlogText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.texts = set()

    def add(self, value):
        value = normalize(value)
        if HAN.search(value):
            self.texts.add(value)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        skipped = bool(self.stack and self.stack[-1][1]) or tag in SKIP or attrs.get("translate") == "no" or "data-no-i18n" in attrs
        if not skipped:
            for name in ATTRIBUTES:
                self.add(attrs.get(name) or "")
            if tag == "meta" and (attrs.get("name", "").lower() in {"description", "title"} or attrs.get("property", "").lower() in {"og:title", "og:description", "twitter:title", "twitter:description"}):
                self.add(attrs.get("content") or "")
        if tag not in VOID:
            self.stack.append((tag, skipped))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        if not self.stack or not self.stack[-1][1]:
            self.add(data)


class EnglishPage(BlogText):
    def __init__(self, translations):
        super().__init__()
        self.translations = translations
        self.output = []

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        values = dict(attrs)
        skipped = (bool(self.stack and self.stack[-1][1]) or tag in SKIP
                   or values.get("translate") == "no" or "data-no-i18n" in values)
        translated = []
        for name, value in attrs:
            if tag == "html" and name == "lang":
                value = "en"
            elif tag == "img" and name == "src":
                value = values.get("data-src-en", value)
            elif not skipped and value and (name in ATTRIBUTES or name == "content" and tag == "meta" and (values.get("name", "") in {"description", "title", "twitter:title", "twitter:description"} or values.get("property", "") in {"og:title", "og:description", "twitter:title", "twitter:description"})):
                value = self.translations.get(normalize(value), value)
            translated.append(name if value is None else f'{name}="{escape(value, quote=True)}"')
        self.output.append("<" + tag + (" " + " ".join(translated) if translated else "") + ">")

    def handle_endtag(self, tag):
        super().handle_endtag(tag)
        self.output.append(f"</{tag}>")

    def handle_data(self, data):
        skipped = bool(self.stack and self.stack[-1][1])
        raw = bool(self.stack and self.stack[-1][0] in {"script", "style"})
        value = self.translations.get(normalize(data)) if not skipped else None
        self.output.append(data if raw else escape(f" {value} " if value else data, quote=False))

    def handle_decl(self, decl):
        self.output.append(f"<!{decl}>")

    def handle_comment(self, data):
        self.output.append(f"<!--{data}-->")


def blog_pages():
    return [path for path in sorted((ROOT / "dist").rglob("*.html"))
            if path.relative_to(ROOT / "dist").parts[0] not in {"design-patterns", "pagefind"}]


def write_english_site(directory, translations):
    directory = ROOT / directory
    if directory.resolve() != (ROOT / ".astro/blog-en").resolve():
        raise ValueError("English search pages must use .astro/blog-en")
    sources = blog_pages()
    expected = {path.relative_to(ROOT / "dist") for path in sources}
    for stale in directory.rglob("*.html"):
        if stale.relative_to(directory) not in expected:
            stale.unlink()
    for source in sources:
        page = EnglishPage(translations)
        page.feed(source.read_text(encoding="utf-8"))
        target = directory / source.relative_to(ROOT / "dist")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("".join(page.output), encoding="utf-8")
    print(f"English search pages: {len(sources)}", flush=True)


def source_strings():
    strings = set(UI)
    pages = 0
    for path in blog_pages():
        parser = BlogText()
        parser.feed(path.read_text(encoding="utf-8"))
        strings.update(parser.texts)
        pages += 1
    if not pages:
        raise RuntimeError("No built blog pages found; run astro build first")
    return sorted(strings), pages


def chat(prompt, max_tokens):
    request = Request(
        "http://127.0.0.1:8001/v1/chat/completions",
        data=json.dumps({
            "model": "Index-Translate-2B",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0, "max_tokens": max_tokens, "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=240) as response:
        return json.load(response)["choices"][0]["message"]["content"].strip()


def request_translation(batch):
    prompt = (
        "你是技术博客的英文译者。把以下 JSON 数组中的每个中文字符串逐一翻译为自然、准确的英文。"
        "保持项目数量和顺序，保留代码标识符、产品名、数字、链接与符号。短标签不要加句号。"
        "不要保留中文，不要解释，仅输出合法的 JSON 字符串数组。\n\n"
        + json.dumps(batch, ensure_ascii=False)
    )
    raw = chat(prompt, 4096)
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    translated = json.loads(raw)
    if not isinstance(translated, list) or len(translated) != len(batch) or any(not isinstance(value, str) or not value.strip() or HAN.search(value) for value in translated):
        raise ValueError("Translation must contain one nonempty English string per source string")
    return dict(zip(batch, (value.strip() for value in translated)))


def request_single(value):
    prompt = (
        "把下面这段中文翻译成自然、准确的英文。保留代码标识符、产品名、数字和链接。"
        "只输出英文译文，不要说明、引号或代码块。\n\n" + value
    )
    translated = chat(prompt, 1024).strip()
    if not translated or HAN.search(translated):
        raise ValueError(f"Could not translate: {value[:120]}")
    return translated


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check coverage without calling the translation service")
    parser.add_argument("--english-site", type=Path, help="Write .astro/blog-en for the English search index")
    args = parser.parse_args()
    started = time.monotonic()
    strings, pages = source_strings()
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    missing = [value for value in strings if not isinstance(cache.get(value), str) or not cache[value].strip() or HAN.search(cache[value])]
    print(f"Blog translation: {pages} pages, {len(strings)} strings, {len(missing)} missing", flush=True)
    if args.check:
        if missing:
            for value in missing[:20]:
                print(f"  Missing: {value[:120]}")
            raise SystemExit("Run pnpm translate:blog with the local service on port 8001")
        if args.english_site:
            write_english_site(args.english_site, cache)
        return

    lock = threading.Lock()
    completed = 0

    def save(translated):
        nonlocal completed
        with lock:
            cache.update(translated)
            temporary = CACHE.with_suffix(".json.tmp")
            temporary.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            temporary.replace(CACHE)
            completed += len(translated)
            print(f"Translated {completed}/{len(missing)} strings ({time.monotonic() - started:.0f}s)", flush=True)

    seed = {value: UI[value] for value in missing if value in UI}
    if seed:
        save(seed)
    pending = [value for value in missing if value not in UI]
    batches = []
    batch = []
    characters = 0
    for value in pending:
        if batch and (len(batch) >= 6 or characters + len(value) > 1250):
            batches.append(batch)
            batch = []
            characters = 0
        batch.append(value)
        characters += len(value)
    if batch:
        batches.append(batch)

    def translate(batch):
        try:
            translated = request_translation(batch)
        except Exception:
            if len(batch) == 1:
                save({batch[0]: request_single(batch[0])})
                return
            middle = (len(batch) + 1) // 2
            translate(batch[:middle])
            translate(batch[middle:])
        else:
            save(translated)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for future in concurrent.futures.as_completed([pool.submit(translate, batch) for batch in batches]):
            future.result()
    print(f"Done: {len(strings)} strings covered in {time.monotonic() - started:.0f}s", flush=True)
    if args.english_site:
        write_english_site(args.english_site, cache)


if __name__ == "__main__":
    main()
