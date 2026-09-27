# Renders the app icons from icon.svg. Run from the project root: python3 tests/make_icons.py
import re
from playwright.sync_api import sync_playwright
src = open("icon.svg", encoding="utf8").read()
# Small sizes: thicker lines, bigger stars, no tiny background specks.
small = (src.replace('stroke-width="7"', 'stroke-width="22"').replace('stroke-opacity=".75"', 'stroke-opacity=".9"')
         .replace('r="16"/>', 'r="30"/>').replace('r="20"/>', 'r="34"/>').replace('r="18"/>', 'r="32"/>')
         .replace('<circle cx="256" cy="256" r="9" opacity=".7"/>', ''))
small = re.sub(r'<g fill="#E8F7F3" opacity=".5">.*?</g>', '', small, flags=re.S)
small = small.replace('M346 104c5 30 16 41 46 46c-30 5-41 16-46 46c-5-30-16-41-46-46c30-5 41-16 46-46z',
                      'M346 78c8 46 26 64 72 72c-46 8-64 26-72 72c-8-46-26-64-72-72c46-8 64-26 72-72z')
# Maskable (Android shapes): square background, artwork shrunk into the safe circle.
mask = re.sub(r'<rect width="512" height="512" rx="116" fill="url\(#bg\)"/>', '<rect width="512" height="512" fill="url(#bg)"/><g transform="translate(256 256) scale(.78) translate(-256 -256)">', small)
mask = mask.replace("</svg>", "</g></svg>")
jobs = [("icon-512.png", src, 512), ("icon-192.png", small, 192), ("icon-maskable-512.png", mask, 512)]
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, svg, size in jobs:
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content('<html><body style="margin:0;background:transparent">' + svg.replace("<svg ", f'<svg width="{size}" height="{size}" ', 1) + "</body></html>")
        pg.screenshot(path=name, omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
        pg.close(); print("wrote", name)
    b.close()
