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
INNER = squircle(r=49.3)

# Real macOS icons sit on a 1024 grid with the tile about 80% wide, a little above centre,
# and a soft shadow underneath. These numbers place our 100 x 100 tile the same way.
PLACE = "translate(9.5 8.5) scale(0.81)"
SHEEN = ('<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">'
         '<stop offset="0" stop-color="#fff" stop-opacity=".28"/>'
         '<stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>')
EDGE = ('<linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#fff" stop-opacity=".6"/>'
        '<stop offset=".3" stop-color="#fff" stop-opacity=".12"/>'
        '<stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>')
SHADOW = ('<filter id="drop" x="-20%" y="-20%" width="140%" height="150%">'
          '<feDropShadow dx="0" dy="2.2" stdDeviation="2.4" flood-color="#000" flood-opacity=".38"/></filter>')


def svg(defs, body, tile):
    return "".join([
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>',
        defs, SHEEN, EDGE, SHADOW,
        f'<clipPath id="clip"><path d="{TILE}"/></clipPath></defs>',
        f'<g transform="{PLACE}">',
        f'<path d="{TILE}" fill="{tile}" filter="url(#drop)"/>',
        f'<g clip-path="url(#clip)">{body}<rect width="100" height="100" fill="url(#sheen)"/></g>',
        f'<path d="{INNER}" fill="none" stroke="url(#edge)" stroke-width="1.1"/>',
        "</g></svg>",
    ])


def grad(id, *stops, x1=0, y1=0, x2=0, y2=1, units=False):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    if units:
        return (f'<linearGradient id="{id}" gradientUnits="userSpaceOnUse" '
                f'x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>')
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def radial(id, *stops, cx=.5, cy=.5, r=.5):
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    return f'<radialGradient id="{id}" cx="{cx}" cy="{cy}" r="{r}">{s}</radialGradient>'


def soft(id, dy=1.5, blur=1.5, color="#000", opacity=".3"):
    return (f'<filter id="{id}" x="-30%" y="-30%" width="160%" height="170%">'
            f'<feDropShadow dx="0" dy="{dy}" stdDeviation="{blur}" flood-color="{color}" flood-opacity="{opacity}"/></filter>')


icons = {}

# Finder: a deep blue tile holding a light blue macOS folder
icons["finder"] = svg(
    grad("bg", (0, "#5fc0ff"), (.55, "#1e7cf2"), (1, "#0b4fc4"))
    + grad("back", (0, "#a9d8ff"), (1, "#6ab2f5"))
    + grad("front", (0, "#e9f6ff"), (.5, "#bfe3ff"), (1, "#8fcaf9"))
    + radial("glow", (0, "#ffffff"), (1, "#ffffff00"), cx=.5, cy=.1, r=.6)
    + soft("sh", 2, 2, "#002a7a", ".45"),
    '<rect width="100" height="100" fill="url(#glow)" opacity=".35"/>'
    '<path d="M17 31a5 5 0 0 1 5-5h17.5a4 4 0 0 1 3 1.3l4 4.2H78a5 5 0 0 1 5 5v34H17z" fill="url(#back)" filter="url(#sh)"/>'
    '<path d="M15 41.5a5.5 5.5 0 0 1 5.5-5.5h59a5.5 5.5 0 0 1 5.5 5.5v29a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6z" fill="url(#front)" filter="url(#sh)"/>'
    '<path d="M15.6 41.5a4.9 4.9 0 0 1 4.9-4.9h59a4.9 4.9 0 0 1 4.9 4.9" fill="none" stroke="#fff" stroke-width=".9"/>'
    '<path d="M33 53h34" stroke="#5aa6ea" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>',
    "url(#bg)",
)

# Notes: a paper pad with a yellow top, a dotted tear line and ruled lines
lines = "".join(f'<line x1="11" y1="{y}" x2="89" y2="{y}" stroke="#d9d9de" stroke-width="1.4"/>' for y in (52, 63, 74, 85))
icons["notes"] = svg(
    grad("bg", (0, "#ffffff"), (1, "#e9e9ee"))
    + grad("top", (0, "#ffe46b"), (.7, "#ffc915"), (1, "#f0b000"))
    + grad("fold", (0, "#000"), (1, "#0000")),
    '<rect width="100" height="33" fill="url(#top)"/>'
    '<rect y="33" width="100" height="5" fill="url(#fold)" opacity=".12"/>'
    '<line x1="5" y1="37.5" x2="95" y2="37.5" stroke="#b1b1b8" stroke-width="1.8" stroke-dasharray=".1 3.6" stroke-linecap="round"/>'
    + lines,
    "url(#bg)",
)

# Terminal: a silver bezel around a black screen with a prompt
icons["terminal"] = svg(
    grad("bg", (0, "#d4d4da"), (.5, "#9c9ca4"), (1, "#6c6c74"))
    + grad("screen", (0, "#2b2b30"), (.08, "#141416"), (1, "#050506"))
    + grad("gloss", (0, "#fff"), (1, "#fff0"))
    + '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".8"/></filter>',
    '<rect x="7" y="8" width="86" height="84" rx="10" fill="#3a3a40"/>'
    '<rect x="9" y="10" width="82" height="80" rx="8.5" fill="url(#screen)"/>'
    '<path d="M9 18.5a8.5 8.5 0 0 1 8.5-8.5h65a8.5 8.5 0 0 1 8.5 8.5v12C70 26 30 26 9 33z" fill="url(#gloss)" opacity=".07"/>'
    '<g stroke="#f2f2f7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none">'
    '<path d="M21 32l12 9.5-12 9.5" opacity=".45" filter="url(#glow)"/><path d="M21 32l12 9.5-12 9.5"/>'
    '<path d="M39 55h16"/></g>',
    "url(#bg)",
)

# Calculator: dark body, round keys with a little bevel, orange operators
keys = []
for row in range(5):
    for col in range(4):
        if row == 4 and col == 1:
            continue
        x, y = 22 + col * 18.7, 34 + row * 14.4
        fill = "url(#orange)" if col == 3 else ("url(#light)" if row == 0 else "url(#dark)")
        if row == 4 and col == 0:
            keys.append(f'<rect x="{x - 6.4}" y="{y - 6.4}" width="31.5" height="12.8" rx="6.4" fill="{fill}"/>')
        else:
            keys.append(f'<circle cx="{x}" cy="{y}" r="6.4" fill="{fill}"/>')
icons["calculator"] = svg(
    grad("bg", (0, "#4a4a50"), (1, "#18181b"))
    + grad("orange", (0, "#ffb340"), (1, "#f58a00"))
    + grad("light", (0, "#c4c4ca"), (1, "#8e8e95"))
    + grad("dark", (0, "#66666d"), (1, "#3c3c42"))
    + soft("sh", .8, .6, "#000", ".5"),
    '<text x="85" y="23" text-anchor="end" font-family="-apple-system, Helvetica, Arial, sans-serif" '
    'font-size="15" font-weight="300" fill="#fff">0</text>'
    f'<g filter="url(#sh)">{"".join(keys)}</g>',
    "url(#bg)",
)

# Weather: blue sky, a glowing sun and a shaded cloud
icons["weather"] = svg(
    grad("bg", (0, "#3fb7ff"), (.6, "#1a7af0"), (1, "#1257d6"))
    + radial("sun", (0, "#fff8c9"), (.55, "#ffd83b"), (1, "#ffb300"), cx=.38, cy=.35, r=.7)
    + radial("halo", (0, "#ffe680"), (1, "#ffe68000"), r=.5)
    + grad("cloud", (0, "#ffffff"), (.6, "#f1f6ff"), (1, "#c9dcf7"), y1=44, y2=78, units=True)
    + soft("sh", 3, 3, "#06348f", ".4"),
    '<circle cx="63" cy="36" r="27" fill="url(#halo)" opacity=".55"/>'
    '<circle cx="63" cy="36" r="15.5" fill="url(#sun)"/>'
    '<g fill="url(#cloud)" filter="url(#sh)">'
    '<circle cx="35" cy="59" r="13"/><circle cx="51" cy="51.5" r="16"/><circle cx="66" cy="62" r="11"/>'
    '<rect x="22" y="59" width="55" height="15" rx="7.5"/></g>',
    "url(#bg)",
)

# Settings: a fine-toothed metal gear with a ring and spokes
def gear(cx, cy, r_out, r_in, teeth, flat=0.45):
    pts = []
    for i in range(teeth):
        a0 = i / teeth * math.tau - math.pi / 2
        step = math.tau / teeth
        for frac, r in ((0, r_in), (0.5 - flat / 2, r_in), (0.5 - flat / 2 + 0.06, r_out),
                        (0.5 + flat / 2 - 0.06, r_out), (0.5 + flat / 2, r_in)):
            a = a0 + frac * step
            pts.append(f"{cx + r * math.cos(a):.2f} {cy + r * math.sin(a):.2f}")
    return "M" + " L".join(pts) + " Z"

spokes = "".join(
    f'<rect x="47.6" y="23" width="4.8" height="54" rx="2.4" fill="url(#metal)" transform="rotate({a} 50 50)"/>'
    for a in (0, 60, 120))
icons["settings"] = svg(
    grad("bg", (0, "#e4e4e9"), (1, "#a3a3ab"))
    + grad("metal", (0, "#7a7a82"), (1, "#36363c"))
    + grad("ring", (0, "#c9c9cf"), (1, "#8a8a92"))
    + grad("rim", (0, "#56565d"), (1, "#26262a"))
    + soft("sh", 1.4, 1.4, "#000", ".35"),
    f'<g filter="url(#sh)"><path d="{gear(50, 50, 41, 36, 36)}" fill="url(#rim)"/></g>'
    '<circle cx="50" cy="50" r="34" fill="url(#ring)"/>'
    '<circle cx="50" cy="50" r="29" fill="#2c2c31"/>'
    '<circle cx="50" cy="50" r="29" fill="none" stroke="#000" stroke-opacity=".4"/>'
    + spokes +
    f'<path d="{gear(50, 50, 15, 12, 10, .5)}" fill="url(#ring)"/>'
    '<circle cx="50" cy="50" r="6.5" fill="#2c2c31"/>'
    '<circle cx="50" cy="50" r="34" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".7"/>',
    "url(#bg)",
)

# Trash: a see-through wire-mesh bin (no tile, like the real dock)
mesh = []
for i in range(9):
    x_top = 24 + i * 6.5
    x_bot = 50 + (x_top - 50) * 0.8
    mesh.append(f'<line x1="{x_top:.1f}" y1="27" x2="{x_bot:.1f}" y2="90" />')
for j in range(1, 6):
    y = 27 + j * 10.5
    half = 28 - (y - 27) / 63 * 5.6
    mesh.append(f'<path d="M{50 - half:.1f} {y:.1f}q{half:.1f} 3.2 {2 * half:.1f} 0" fill="none"/>')
icons["trash"] = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>'
    + grad("glass", (0, "#ffffff"), (1, "#c5c8d2"))
    + grad("rimg", (0, "#ffffff"), (1, "#b9bcc6"))
    + soft("sh", 2, 2, "#000", ".35")
    + '</defs><g filter="url(#sh)">'
    '<path d="M21 27h58l-6.5 60a5 5 0 0 1-5 4.5H32.5a5 5 0 0 1-5-4.5z" fill="url(#glass)" fill-opacity=".3" stroke="#fff" stroke-opacity=".85" stroke-width="1.3"/>'
    f'<g stroke="#fff" stroke-opacity=".5" stroke-width=".9">{"".join(mesh)}</g>'
    '<ellipse cx="50" cy="27" rx="30.5" ry="5.6" fill="none" stroke="url(#rimg)" stroke-width="2.6"/>'
    '<ellipse cx="50" cy="27.4" rx="27" ry="3.6" fill="#000" fill-opacity=".22"/>'
    '<path d="M28 89.5h44" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>'
    '</g></svg>'
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
