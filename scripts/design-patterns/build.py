"""Bundle the design-pattern handbook as a self-contained HTML page."""

import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parent
source = root / "src"
output = root.parent.parent / "public" / "design-patterns" / "index.html"

page = (source / "template.html").read_text(encoding="utf-8")
style = (source / "styles.css").read_text(encoding="utf-8")
data = "\n".join((source / name).read_text(encoding="utf-8") for name in ("data-creation.js", "data-behavior.js"))
subprocess.run(["node", str(root / "check-i18n.cjs")], check=True)
translations = json.loads((source / "en-data.json").read_text(encoding="utf-8"))
translations.update(json.loads((source / "en-overrides.json").read_text(encoding="utf-8")))
english = "window.PATTERN_EN = " + json.dumps(translations, ensure_ascii=False, separators=(",", ":")) + ";"
app = (source / "app.js").read_text(encoding="utf-8")

if "</script" in (data + english + app).lower():
    raise ValueError("Inline JavaScript must not contain a closing script tag")

page = page.replace("/*STYLE*/", style).replace("/*DATA*/", data).replace("/*EN_DATA*/", english).replace("/*APP*/", app)
output.write_text(page, encoding="utf-8")
print(f"Built {output} ({output.stat().st_size:,} bytes)")
