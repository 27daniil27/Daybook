#!/usr/bin/env python3
"""Минификация CSS, JS и HTML для проекта Daybook.

Использование:  python3 tools/minify.py

Результат:
  css/normalize.min.css
  css/style.min.css
  js/app.min.js
  index.min.html  (ссылки переведены на .min-файлы)
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

IDENT = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$")


def minify_js(src: str) -> str:
    """Удаляет комментарии и лишние пробелы, не трогая строки и регулярки."""
    out = []
    i, n = 0, len(src)
    prev = ""

    def is_ident(ch: str) -> bool:
        return ch in IDENT

    while i < n:
        c = src[i]

        # Строчный комментарий
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                i += 1
            continue

        # Блочный комментарий
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                i += 1
            i += 2
            continue

        # Строки и шаблонные литералы
        if c in ('"', "'", "`"):
            quote = c
            out.append(c)
            i += 1
            while i < n:
                if src[i] == "\\":
                    out.append(src[i : i + 2])
                    i += 2
                    continue
                out.append(src[i])
                done = src[i] == quote
                i += 1
                if done:
                    break
            prev = quote
            continue

        # Регулярные выражения
        if c == "/":
            if not prev or prev in "=([!&|?:;,+-*%{}<>~^":
                out.append(c)
                i += 1
                in_class = False
                while i < n:
                    ch = src[i]
                    if ch == "\\":
                        out.append(src[i : i + 2])
                        i += 2
                        continue
                    if ch == "[":
                        in_class = True
                    elif ch == "]":
                        in_class = False
                    elif ch == "/" and not in_class:
                        out.append(ch)
                        i += 1
                        break
                    elif ch == "\n":
                        break
                    out.append(ch)
                    i += 1
                while i < n and src[i].isalpha():
                    out.append(src[i])
                    i += 1
                prev = "/"
                continue
            out.append(c)
            prev = c
            i += 1
            continue

        # Пробелы: схлопываем, сохраняя нужные разделители
        if c.isspace():
            j = i
            while j < n and src[j].isspace():
                j += 1
            nxt = src[j] if j < n else ""
            last = out[-1] if out else ""
            keep = last and nxt and (
                (is_ident(last) and is_ident(nxt))
                or (last + nxt) in ("++", "--", "+ ", "- ")
            )
            if keep:
                out.append(" ")
            i = j
            continue

        out.append(c)
        prev = c
        i += 1

    return "".join(out).strip()


def minify_css(src: str) -> str:
    """Удаляет комментарии, пробелы и лишние точки с запятой."""
    out = []
    i, n = 0, len(src)

    while i < n:
        c = src[i]

        if c == "/" and i + 1 < n and src[i + 1] == "*":
            i += 2
            while i + 1 < n and not (src[i] == "*" and src[i + 1] == "/"):
                i += 1
            i += 2
            continue

        if c in ('"', "'"):
            quote = c
            out.append(c)
            i += 1
            while i < n:
                if src[i] == "\\":
                    out.append(src[i : i + 2])
                    i += 2
                    continue
                out.append(src[i])
                done = src[i] == quote
                i += 1
                if done:
                    break
            continue

        if c.isspace():
            j = i
            while j < n and src[j].isspace():
                j += 1
            nxt = src[j] if j < n else ""
            last = out[-1] if out else ""
            # Пробел нужен только между селекторами (.a .b) и значениями
            keep = last and nxt and last not in "{};:,>" and nxt not in "{},;"
            if keep and (last.isalnum() or last in "._%\")") and (
                nxt.isalnum() or nxt in "._#*("
            ):
                out.append(" ")
            i = j
            continue

        if c == ";":
            out.append(";")
            i += 1
            continue

        out.append(c)
        i += 1

    result = "".join(out)
    # ;} → }  и  {;  → {
    result = result.replace(";}", "}")
    return result.strip()


def minify_html(src: str) -> str:
    """Удаляет HTML-комментарии и схлопывает отступы между тегами."""
    out, i, n = [], 0, len(src)

    while i < n:
        if src.startswith("<!--", i):
            if src.startswith("<!--[", i):  # условные комментарии сохраняем
                end = src.find("-->", i)
                end = n if end == -1 else end + 3
                out.append(src[i:end])
                i = end
                continue
            end = src.find("-->", i)
            i = n if end == -1 else end + 3
            continue
        out.append(src[i])
        i += 1

    text = "".join(out)
    # Отступы между тегами → один пробел (в HTML он и так схлопнется)
    import re

    text = re.sub(r">\s+<", "> <", text)
    text = re.sub(r"\n\s*", "", text)
    text = re.sub(r">\s+<", "> <", text)
    return text.strip()


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    size = path.stat().st_size
    print(f"  ✓ {path.relative_to(ROOT)}  ({size:,} байт)")


def main() -> None:
    print("Минификация проекта Daybook:")

    write(
        ROOT / "css" / "normalize.min.css",
        minify_css((ROOT / "css" / "normalize.css").read_text(encoding="utf-8")),
    )
    write(
        ROOT / "css" / "style.min.css",
        minify_css((ROOT / "css" / "style.css").read_text(encoding="utf-8")),
    )
    write(
        ROOT / "js" / "app.min.js",
        minify_js((ROOT / "js" / "app.js").read_text(encoding="utf-8")),
    )

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html = html.replace("css/normalize.css", "css/normalize.min.css")
    html = html.replace("css/style.css", "css/style.min.css")
    html = html.replace("js/app.js", "js/app.min.js")
    write(ROOT / "index.min.html", minify_html(html))

    print("Готово.")


if __name__ == "__main__":
    main()
