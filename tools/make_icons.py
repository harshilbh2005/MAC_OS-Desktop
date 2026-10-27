"""Draws the app icons in desktop/icons as SVG files.

Run once: python3 tools/make_icons.py
The icons are original artwork in the macOS style (rounded "squircle" tiles,
soft gradients, a light top edge), so the recording needs no downloads.
"""
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "desktop" / "icons"


def squircle(cx=50, cy=50, r=50, n=5.0, steps=96):
    """Apple-style continuous corner: the superellipse |x|^n + |y|^n = 1."""
    pts = []
    for i in range(steps):
        t = i / steps * math.tau
        c, s = math.cos(t), math.sin(t)
        x = cx + r * math.copysign(abs(c) ** (2 / n), c)
        y = cy + r * math.copysign(abs(s) ** (2 / n), s)
        pts.append(f"{x:.2f} {y:.2f}")
    return "M" + " L".join(pts) + " Z"


TILE = squircle()
INNER = squircle(r=49.4)


def svg(defs, body, tile=None, edge=True):
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">', f"<defs>{defs}"]
    parts.append(f'<clipPath id="clip"><path d="{TILE}"/></clipPath></defs>')
    if tile:
        parts.append(f'<path d="{TILE}" fill="{tile}"/>')
    parts.append(f'<g clip-path="url(#clip)">{body}</g>' if tile else body)
    if edge and tile:
        # light top edge, darker bottom edge: makes the tile look like glass-covered plastic
        parts.append('<linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">'
                     '<stop offset="0" stop-color="#fff" stop-opacity=".55"/>'
                     '<stop offset=".5" stop-color="#fff" stop-opacity=".08"/>'
                     '<stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>')
        parts.append(f'<path d="{INNER}" fill="none" stroke="url(#edge)" stroke-width="1.2"/>')
    parts.append("</svg>")
    return "".join(parts)


def grad(id, *stops, x2=0, y2=1, units=""):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    u = f' gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="{x2*100}" y2="{y2*100}"' if units else f' x1="0" y1="0" x2="{x2}" y2="{y2}"'
    return f'<linearGradient id="{id}"{u}>{s}</linearGradient>'


icons = {}

# Finder: a blue tile with a white folder
icons["finder"] = svg(
    grad("bg", (0, "#7ccfff"), (1, "#0f6ef0"))
    + grad("back", (0, "#cfe7ff"), (1, "#9ccbff"))
    + grad("front", (0, "#ffffff"), (1, "#dcebff"))
    + '<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#003b8f" flood-opacity=".35"/></filter>',
    '<path d="M21 33a5 5 0 0 1 5-5h15.5l5 5H74a5 5 0 0 1 5 5v28H21z" fill="url(#back)" filter="url(#sh)"/>'
    '<path d="M18 42a5 5 0 0 1 5-5h54a5 5 0 0 1 5 5v25a7 7 0 0 1-7 7H25a7 7 0 0 1-7-7z" fill="url(#front)" filter="url(#sh)"/>'
    '<path d="M18.5 42a4.5 4.5 0 0 1 4.5-4.5h54a4.5 4.5 0 0 1 4.5 4.5" fill="none" stroke="#fff" stroke-width=".8"/>',
    tile="url(#bg)",
)

# Notes: a paper pad with a yellow top
lines = "".join(f'<line x1="14" y1="{y}" x2="86" y2="{y}" stroke="#dedede" stroke-width="1.3"/>' for y in (50, 62, 74, 86))
icons["notes"] = svg(
    grad("bg", (0, "#ffffff"), (1, "#ececef"))
    + grad("top", (0, "#ffdc5c"), (1, "#ffb700")),
    '<rect width="100" height="31" fill="url(#top)"/>'
    '<rect y="31" width="100" height="1.4" fill="#000" opacity=".12"/>'
    '<line x1="6" y1="35.5" x2="94" y2="35.5" stroke="#b9b9be" stroke-width="1.4" stroke-dasharray=".1 3.4" stroke-linecap="round"/>'
    + lines,
    tile="url(#bg)",
)

# Terminal: a dark screen with a prompt
icons["terminal"] = svg(
    grad("bg", (0, "#5b5b61"), (1, "#202024"))
    + grad("screen", (0, "#26262b"), (1, "#0b0b0d")),
    '<rect x="9" y="11" width="82" height="76" rx="9" fill="url(#screen)" stroke="#000" stroke-opacity=".4"/>'
    '<rect x="9" y="11" width="82" height="76" rx="9" fill="none" stroke="#fff" stroke-opacity=".08"/>'
    '<path d="M22 36l13 10-13 10" fill="none" stroke="#f5f5f7" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>'
    '<path d="M41 60h17" stroke="#f5f5f7" stroke-width="5.5" stroke-linecap="round"/>',
    tile="url(#bg)",
)

# Calculator: round keys, orange column on the right
keys = []
for row in range(4):
    for col in range(4):
        x, y = 23 + col * 18, 39 + row * 15
        color = "#ff9f0a" if col == 3 else ("#a5a5aa" if row == 0 else "#5a5a60")
        keys.append(f'<circle cx="{x}" cy="{y}" r="6.6" fill="{color}"/>')
icons["calculator"] = svg(
    grad("bg", (0, "#48484e"), (1, "#141416")),
    '<rect x="14" y="13" width="72" height="14" rx="4" fill="#000" opacity=".35"/>'
    '<text x="82" y="24.5" text-anchor="end" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="11" font-weight="300" fill="#fff">0</text>'
    + "".join(keys),
    tile="url(#bg)",
)

# Weather: blue sky, sun and a soft cloud
icons["weather"] = svg(
    grad("bg", (0, "#4cc0ff"), (1, "#145fe0"))
    + '<radialGradient id="sun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff7c2"/><stop offset=".6" stop-color="#ffd23f"/><stop offset="1" stop-color="#ffb000"/></radialGradient>'
    + grad("cloud", (0, "#ffffff"), (1, "#d6e6fb"), units=True)
    + '<filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#0b3c99" flood-opacity=".35"/></filter>',
    '<circle cx="63" cy="37" r="22" fill="#ffd23f" opacity=".25"/>'
    '<circle cx="63" cy="37" r="15" fill="url(#sun)"/>'
    '<g fill="url(#cloud)" filter="url(#sh)">'
    '<circle cx="36" cy="58" r="13"/><circle cx="52" cy="52" r="15"/><circle cx="66" cy="62" r="10"/>'
    '<rect x="24" y="58" width="52" height="14" rx="7"/></g>',
    tile="url(#bg)",
)

# Settings: a metal gear
def gear(cx, cy, r_out, r_in, teeth):
    pts = []
    for i in range(teeth * 4):
        a = i / (teeth * 4) * math.tau - math.pi / 2
        r = r_out if i % 4 in (1, 2) else r_in
        pts.append(f"{cx + r * math.cos(a):.2f} {cy + r * math.sin(a):.2f}")
    return "M" + " L".join(pts) + " Z"

icons["settings"] = svg(
    grad("bg", (0, "#d9d9de"), (1, "#8c8c93"))
    + grad("metal", (0, "#6e6e75"), (1, "#2e2e33"))
    + grad("ring", (0, "#b8b8bf"), (1, "#7d7d85"))
    + '<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".35"/></filter>',
    f'<path d="{gear(50, 50, 38, 31, 14)}" fill="url(#metal)" stroke-linejoin="round" filter="url(#sh)"/>'
    '<circle cx="50" cy="50" r="24" fill="url(#ring)"/>'
    '<circle cx="50" cy="50" r="24" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>'
    f'<path d="{gear(50, 50, 17, 13.5, 8)}" fill="url(#metal)"/>'
    '<circle cx="50" cy="50" r="6" fill="#d4d4da"/>',
    tile="url(#bg)",
)

# Trash: a see-through bin, no tile (like the real dock)
ribs = "".join(f'<line x1="{x}" y1="31" x2="{50 + (x - 50) * 0.82:.1f}" y2="88" stroke="#fff" stroke-opacity=".55" stroke-width="1.1"/>' for x in range(30, 72, 7))
icons["trash"] = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>'
    + grad("glass", (0, "#ffffff"), (1, "#c9cbd3"))
    + '</defs>'
    '<path d="M21 28h58l-6 60a6 6 0 0 1-6 5H33a6 6 0 0 1-6-5z" fill="url(#glass)" fill-opacity=".38" stroke="#fff" stroke-opacity=".8" stroke-width="1.4"/>'
    + ribs +
    '<ellipse cx="50" cy="28" rx="30" ry="6" fill="#fff" fill-opacity=".55" stroke="#fff" stroke-width="1.4"/>'
    '<ellipse cx="50" cy="28" rx="25" ry="3.6" fill="#000" fill-opacity=".18"/>'
    '</svg>'
)

# Finder window items: a folder and documents with a coloured label
icons["folder"] = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>'
    + grad("back", (0, "#5eb3f6"), (1, "#3b93e6"))
    + grad("front", (0, "#8fd0ff"), (1, "#57aef5"))
    + '</defs>'
    '<path d="M8 22a6 6 0 0 1 6-6h22l7 7h43a6 6 0 0 1 6 6v53H8z" fill="url(#back)"/>'
    '<path d="M8 34a6 6 0 0 1 6-6h72a6 6 0 0 1 6 6v46a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6z" fill="url(#front)"/>'
    '<path d="M8.6 34a5.4 5.4 0 0 1 5.4-5.4h72a5.4 5.4 0 0 1 5.4 5.4" fill="none" stroke="#fff" stroke-opacity=".6"/>'
    '</svg>'
)

def document(label, color):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>'
        + grad("page", (0, "#ffffff"), (1, "#e9e9ee"))
        + '</defs>'
        '<path d="M20 6h42l20 20v62a6 6 0 0 1-6 6H20a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="url(#page)"/>'
        '<path d="M62 6v14a6 6 0 0 0 6 6h14z" fill="#cfcfd6"/>'
        f'<rect x="14" y="60" width="68" height="20" rx="3" fill="{color}"/>'
        f'<text x="48" y="75" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#fff">{label}</text>'
        '</svg>'
    )

icons["html"] = document("HTML", "#e8562a")
icons["css"] = document("CSS", "#2f74e8")
icons["js"] = document("JS", "#e0b000")

OUT.mkdir(parents=True, exist_ok=True)
for name, text in icons.items():
    (OUT / f"{name}.svg").write_text(text + "\n")
    print("wrote", name, len(text), "bytes")
