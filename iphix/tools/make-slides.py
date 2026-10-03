# Generates the default hero-slider artwork for IPHIX (1200x480 SVG, product art on the right).
import math, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img', 'slides')
W, H = 1200, 480

def wrap(c1, c2, body, glow='#ffffff', extra_defs=''):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
 <radialGradient id="glow" cx="0.75" cy="0.45" r="0.5"><stop offset="0" stop-color="{glow}" stop-opacity=".28"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>
 <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#000" flood-opacity=".38"/></filter>
 <filter id="sh2" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000" flood-opacity=".3"/></filter>
 <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2d33"/><stop offset=".5" stop-color="#4b5059"/><stop offset="1" stop-color="#1c1e22"/></linearGradient>
 <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
 {extra_defs}
</defs>
<rect width="{W}" height="{H}" fill="url(#bg)"/>
<rect width="{W}" height="{H}" fill="url(#glow)"/>
<g opacity=".07" fill="none" stroke="#fff" stroke-width="2"><circle cx="1080" cy="-40" r="260"/><circle cx="1080" cy="-40" r="340"/><circle cx="160" cy="520" r="200"/></g>
{body}
</svg>'''

def phone(x, y, w, h, rot=0, screen='#111', content='', cracked=False, frame='url(#metal)'):
    r = w * 0.16
    cx, cy = x + w / 2, y + h / 2
    s = 10
    crack = ''
    if cracked:
        px, py = x + w * 0.62, y + h * 0.35
        lines = []
        for ang, ln in [(-150, .55), (-100, .5), (-40, .45), (20, .5), (75, .55), (130, .5), (190, .4)]:
            a = math.radians(ang); pts = [(px, py)]; cxp, cyp = px, py
            for k in range(4):
                seg = w * ln / 4
                cxp += math.cos(a + (k % 2 - .5) * .5) * seg; cyp += math.sin(a + (k % 2 - .5) * .5) * seg
                pts.append((cxp, cyp))
            lines.append('<polyline points="' + ' '.join(f'{p[0]:.1f},{p[1]:.1f}' for p in pts) + '"/>')
        crack = f'<g fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-linejoin="round">{"".join(lines)}</g><circle cx="{px}" cy="{py}" r="7" fill="#fff" fill-opacity=".5"/>'
    return f'''<g transform="rotate({rot} {cx} {cy})" filter="url(#sh)">
 <rect x="{x-3}" y="{y-3}" width="{w+6}" height="{h+6}" rx="{r+3}" fill="{frame}"/>
 <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="#0b0c0e"/>
 <rect x="{x+w+2}" y="{y+h*.22}" width="4" height="{h*.1}" rx="2" fill="#555"/>
 <rect x="{x+w+2}" y="{y+h*.36}" width="4" height="{h*.16}" rx="2" fill="#555"/>
 <clipPath id="c{int(x)}{int(y)}"><rect x="{x+s}" y="{y+s}" width="{w-2*s}" height="{h-2*s}" rx="{r-s*.6}"/></clipPath>
 <g clip-path="url(#c{int(x)}{int(y)})"><rect x="{x+s}" y="{y+s}" width="{w-2*s}" height="{h-2*s}" fill="{screen}"/>{content}{crack}
  <rect x="{x+s}" y="{y+s}" width="{w-2*s}" height="{h-2*s}" fill="url(#shine)"/></g>
 <rect x="{cx-w*.13}" y="{y+s+6}" width="{w*.26}" height="{w*.075}" rx="{w*.0375}" fill="#000"/>
</g>'''

def wallpaper(x, y, w, h, c1, c2, c3):
    return f'''<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c1}"/>
<path d="M{x},{y+h*.55} C{x+w*.3},{y+h*.35} {x+w*.6},{y+h*.75} {x+w},{y+h*.5} L{x+w},{y+h} L{x},{y+h} Z" fill="{c2}" opacity=".9"/>
<path d="M{x},{y+h*.72} C{x+w*.35},{y+h*.55} {x+w*.7},{y+h*.9} {x+w},{y+h*.7} L{x+w},{y+h} L{x},{y+h} Z" fill="{c3}" opacity=".85"/>
<text x="{x+w/2}" y="{y+h*.26}" font-family="Arial,Helvetica,sans-serif" font-size="{w*.2}" font-weight="300" fill="#fff" text-anchor="middle">10:09</text>
<text x="{x+w/2}" y="{y+h*.32}" font-family="Arial,Helvetica,sans-serif" font-size="{w*.055}" fill="#fff" fill-opacity=".85" text-anchor="middle">Saturday, 3 October</text>'''

def apps(x, y, w, cols=4, rows=1):
    colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#eab308']
    g = w / cols; s = g * .62; out = ''
    for r in range(rows):
        for c in range(cols):
            out += f'<rect x="{x+c*g+(g-s)/2}" y="{y+r*g}" width="{s}" height="{s}" rx="{s*.24}" fill="{colors[(r*cols+c)%8]}"/>'
    return out

def pill(x, y, text, fill='#fff', color='#111', size=17):
    w = len(text) * size * .58 + 34
    return f'<g filter="url(#sh2)"><rect x="{x}" y="{y}" width="{w}" height="{size*2.1}" rx="{size*1.05}" fill="{fill}"/><text x="{x+w/2}" y="{y+size*1.4}" font-family="Arial,Helvetica,sans-serif" font-size="{size}" font-weight="700" fill="{color}" text-anchor="middle">{text}</text></g>'

slides = {}

# 1. Screens
sx, sy, sw, sh_ = 905, 52, 190, 390
body = phone(700, 92, 170, 350, -11, '#23262d', cracked=True)
body += phone(sx, sy, sw, sh_, 4, '#000', wallpaper(sx+10, sy+10, sw-20, sh_-20, '#6d28d9', '#ec4899', '#f97316') + apps(sx+18, sy+sh_-80, sw-36))
body += '<g filter="url(#sh2)"><rect x="1085" y="300" width="18" height="150" rx="9" fill="#f43f5e" transform="rotate(28 1094 375)"/><rect x="1088" y="250" width="12" height="60" rx="3" fill="#cbd5e1" transform="rotate(28 1094 375)"/></g>'
body += pill(640, 24, 'OLED · LCD · Fitted in 1 hour')
slides['screens'] = wrap('#0b1b44', '#1d4ed8', body, '#93c5fd')

# 2. Batteries
def battery(x, y, w, h, rot, cap):
    return f'''<g transform="rotate({rot} {x+w/2} {y+h/2})" filter="url(#sh)">
 <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#1f2937"/>
 <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="url(#shine)"/>
 <rect x="{x+16}" y="{y+18}" width="{w-32}" height="{h*.42}" rx="8" fill="#e5e7eb"/>
 <text x="{x+w/2}" y="{y+18+h*.17}" font-family="Arial,Helvetica,sans-serif" font-size="{w*.12}" font-weight="800" fill="#111827" text-anchor="middle">Li-ion</text>
 <text x="{x+w/2}" y="{y+18+h*.33}" font-family="Arial,Helvetica,sans-serif" font-size="{w*.1}" font-weight="700" fill="#059669" text-anchor="middle">{cap}</text>
 <text x="{x+w/2}" y="{y+h*.72}" font-family="Arial,Helvetica,sans-serif" font-size="{w*.075}" fill="#9ca3af" text-anchor="middle">3.85V  Rechargeable</text>
 <rect x="{x+w*.3}" y="{y+h-6}" width="{w*.4}" height="38" rx="5" fill="#b45309"/>
 <rect x="{x+w*.36}" y="{y+h+24}" width="{w*.28}" height="14" rx="3" fill="#111"/>
</g>'''
bx, by, bw, bh = 940, 70, 185, 370
batt_screen = f'''<rect x="{bx+10}" y="{by+10}" width="{bw-20}" height="{bh-20}" fill="#052e16"/>
<rect x="{bx+bw/2-34}" y="{by+105}" width="68" height="150" rx="12" fill="none" stroke="#4ade80" stroke-width="6"/>
<rect x="{bx+bw/2-14}" y="{by+94}" width="28" height="10" rx="3" fill="#4ade80"/>
<rect x="{bx+bw/2-25}" y="{by+114}" width="50" height="132" rx="6" fill="#22c55e"/>
<path d="M{bx+bw/2+6},{by+140} l-22,42 h16 l-8,36 l26,-48 h-16 z" fill="#fff"/>
<text x="{bx+bw/2}" y="{by+300}" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="700" fill="#fff" text-anchor="middle">100%</text>'''
body = battery(660, 120, 150, 250, -10, '4500mAh') + battery(790, 90, 150, 270, 6, '5000mAh')
body += phone(bx, by, bw, bh, 8, '#052e16', batt_screen)
body += pill(650, 24, '3-month warranty · All brands')
slides['batteries'] = wrap('#022c22', '#059669', body, '#86efac')

# 3. Chargers & cables
body = '''<g filter="url(#sh)">
 <path d="M640,380 C700,470 860,450 880,360 C900,270 760,250 790,180 C815,120 930,150 960,230" fill="none" stroke="#111827" stroke-width="18" stroke-linecap="round"/>
 <path d="M640,380 C700,470 860,450 880,360 C900,270 760,250 790,180 C815,120 930,150 960,230" fill="none" stroke="#fb923c" stroke-width="4" stroke-dasharray="6 10" stroke-linecap="round" opacity=".7"/>
 <g transform="rotate(-35 630 370)"><rect x="606" y="340" width="48" height="60" rx="10" fill="#e5e7eb"/><rect x="618" y="300" width="24" height="44" rx="6" fill="#9ca3af"/><rect x="623" y="306" width="14" height="30" rx="3" fill="#4b5563"/></g>
</g>
<g filter="url(#sh)">
 <rect x="930" y="170" width="190" height="190" rx="34" fill="#f9fafb"/>
 <rect x="930" y="170" width="190" height="190" rx="34" fill="url(#shine)"/>
 <rect x="990" y="245" width="70" height="20" rx="10" fill="#111827"/>
 <rect x="1003" y="251" width="44" height="8" rx="4" fill="#374151"/>
 <text x="1025" y="315" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="#ea580c" text-anchor="middle">33W</text>
 <text x="1025" y="215" font-family="Arial,Helvetica,sans-serif" font-size="15" font-weight="700" fill="#9ca3af" text-anchor="middle">FAST CHARGE</text>
 <rect x="975" y="360" width="16" height="44" rx="4" fill="#d1d5db"/><rect x="1059" y="360" width="16" height="44" rx="4" fill="#d1d5db"/>
</g>
<g filter="url(#sh)" transform="translate(-30 50) rotate(-8 760 110)">
 <rect x="690" y="40" width="200" height="120" rx="22" fill="#111827"/>
 <rect x="690" y="40" width="200" height="120" rx="22" fill="url(#shine)"/>
 <text x="790" y="95" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="800" fill="#fff" text-anchor="middle">20,000mAh</text>
 <g fill="#22c55e"><circle cx="760" cy="125" r="6"/><circle cx="780" cy="125" r="6"/><circle cx="800" cy="125" r="6"/></g><circle cx="820" cy="125" r="6" fill="#374151"/>
</g>'''
body += pill(670, 24, 'Type-C · Lightning · Micro-USB')
slides['chargers'] = wrap('#431407', '#ea580c', body, '#fdba74')

# 4. Audio & wearables
body = '''<g filter="url(#sh)">
 <path d="M690,250 h190 a40,40 0 0 1 40,40 v50 a70,70 0 0 1 -70,70 h-130 a70,70 0 0 1 -70,-70 v-50 a40,40 0 0 1 40,-40 z" fill="#f8fafc"/>
 <path d="M690,250 h190 a40,40 0 0 1 40,40 v50 a70,70 0 0 1 -70,70 h-130 a70,70 0 0 1 -70,-70 v-50 a40,40 0 0 1 40,-40 z" fill="url(#shine)"/>
 <rect x="650" y="282" width="270" height="4" fill="#cbd5e1"/>
 <path d="M680,248 C690,150 880,150 890,248 Z" fill="#e2e8f0" transform="rotate(-24 680 248)"/>
 <circle cx="785" cy="345" r="6" fill="#22c55e"/>
</g>
<g filter="url(#sh)">
 <g transform="rotate(-18 735 170)"><circle cx="735" cy="130" r="34" fill="#f8fafc"/><circle cx="735" cy="130" r="16" fill="#334155"/><rect x="723" y="150" width="24" height="90" rx="12" fill="#f8fafc"/></g>
 <g transform="rotate(16 845 170)"><circle cx="845" cy="125" r="34" fill="#f8fafc"/><circle cx="845" cy="125" r="16" fill="#334155"/><rect x="833" y="145" width="24" height="90" rx="12" fill="#f8fafc"/></g>
</g>
<g filter="url(#sh)">
 <rect x="1000" y="40" width="76" height="110" rx="20" fill="#7e22ce"/><rect x="1000" y="330" width="76" height="120" rx="20" fill="#7e22ce"/>
 <rect x="965" y="130" width="146" height="216" rx="40" fill="url(#metal)"/>
 <rect x="977" y="142" width="122" height="192" rx="32" fill="#020617"/>
 <text x="1038" y="230" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="300" fill="#fff" text-anchor="middle">10:09</text>
 <text x="1038" y="260" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#c4b5fd" text-anchor="middle">♥ 72 bpm</text>
 <path d="M995,290 h20 l8,-14 l10,26 l8,-12 h50" fill="none" stroke="#22c55e" stroke-width="3"/>
 <rect x="1112" y="205" width="8" height="34" rx="4" fill="#64748b"/>
</g>'''
body += pill(640, 24, 'Earbuds · Speakers · Smart watches')
slides['audio'] = wrap('#2e1065', '#7c3aed', body, '#d8b4fe')

# 5. Protection
px_, py_, pw, ph = 760, 70, 200, 390
case_content = wallpaper(px_+10, py_+10, pw-20, ph-20, '#0f766e', '#14b8a6', '#facc15')
body = phone(px_, py_, pw, ph, -6, '#000', case_content, frame='#be123c')
body += f'''<g transform="rotate(8 1000 250)" filter="url(#sh2)">
 <rect x="910" y="40" width="200" height="390" rx="34" fill="#e0f2fe" fill-opacity=".28" stroke="#fff" stroke-opacity=".9" stroke-width="3"/>
 <path d="M930,60 L1000,60 L930,190 Z" fill="#fff" fill-opacity=".35"/><path d="M1020,60 L1050,60 L940,280 L930,260 Z" fill="#fff" fill-opacity=".25"/>
 <rect x="975" y="54" width="70" height="14" rx="7" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
 <text x="1010" y="380" font-family="Arial,Helvetica,sans-serif" font-size="40" font-weight="900" fill="#fff" text-anchor="middle">9H</text>
 <text x="1010" y="404" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">TEMPERED GLASS</text>
</g>
<g filter="url(#sh)"><rect x="640" y="250" width="110" height="110" rx="26" fill="#1f2937"/>
 <circle cx="672" cy="282" r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="4"/><circle cx="718" cy="282" r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="4"/><circle cx="672" cy="328" r="20" fill="#0f172a" stroke="#94a3b8" stroke-width="4"/><circle cx="718" cy="328" r="7" fill="#fde68a"/></g>'''
body += pill(600, 24, 'Cases · Tempered · UV · Privacy glass')
slides['protection'] = wrap('#7f1d1d', '#e62e04', body, '#fecaca')

# 6. Repair desk
mat = ''.join(f'<line x1="{560+i*40}" y1="0" x2="{560+i*40}" y2="480"/>' for i in range(17)) + ''.join(f'<line x1="560" y1="{i*40}" x2="1200" y2="{i*40}"/>' for i in range(13))
ox, oy, ow, oh = 790, 60, 210, 380
board = f'''<rect x="{ox+10}" y="{oy+10}" width="{ow-20}" height="{oh-20}" fill="#111827"/>
<rect x="{ox+22}" y="{oy+22}" width="{ow-44}" height="140" rx="10" fill="#166534"/>
<g fill="#1f2937"><rect x="{ox+40}" y="{oy+40}" width="50" height="40" rx="4"/><rect x="{ox+100}" y="{oy+38}" width="64" height="64" rx="4"/><rect x="{ox+40}" y="{oy+92}" width="40" height="50" rx="4"/></g>
<g fill="#facc15"><rect x="{ox+112}" y="{oy+110}" width="10" height="10"/><rect x="{ox+130}" y="{oy+110}" width="10" height="10"/><rect x="{ox+148}" y="{oy+110}" width="10" height="10"/></g>
<g stroke="#86efac" stroke-width="2" fill="none" opacity=".6"><path d="M{ox+90},{oy+60} h10"/><path d="M{ox+80},{oy+117} h32"/><path d="M{ox+60},{oy+80} v12"/></g>
<rect x="{ox+30}" y="{oy+178}" width="{ow-60}" height="170" rx="12" fill="#334155"/>
<rect x="{ox+30}" y="{oy+178}" width="{ow-60}" height="170" rx="12" fill="url(#shine)"/>
<text x="{ox+ow/2}" y="{oy+270}" font-family="Arial,Helvetica,sans-serif" font-size="20" font-weight="800" fill="#e2e8f0" text-anchor="middle">BATTERY</text>
<circle cx="{ox+60}" cy="{oy+40}" r="0"/>'''
body = f'<g stroke="#60a5fa" stroke-opacity=".18" stroke-width="1">{mat}</g>'
body += phone(ox, oy, ow, oh, -4, '#111827', board)
body += '''<g filter="url(#sh2)">
 <g transform="rotate(32 1090 240)"><rect x="1074" y="120" width="34" height="120" rx="12" fill="#f59e0b"/><rect x="1074" y="120" width="34" height="120" rx="12" fill="url(#shine)"/><rect x="1086" y="238" width="10" height="120" rx="3" fill="#cbd5e1"/></g>
 <g transform="rotate(-24 690 260)"><path d="M680,140 L690,380 L694,380 L688,140 Z" fill="#cbd5e1"/><path d="M700,140 L692,380 L696,380 L708,140 Z" fill="#94a3b8"/></g>
 <g transform="rotate(14 660 380)"><rect x="620" y="370" width="150" height="14" rx="7" fill="#2563eb"/></g>
</g>
<g filter="url(#sh2)"><rect x="1050" y="370" width="56" height="34" rx="6" fill="#111827" stroke="#475569" stroke-width="2"/><rect x="1062" y="380" width="12" height="12" fill="#22c55e"/><rect x="1080" y="380" width="12" height="12" fill="#facc15"/></g>'''
body += pill(610, 30, 'Diagnostics · Repairs while you wait', '#22c55e', '#fff')
slides['repair'] = wrap('#0b1120', '#1e3a8a', body, '#60a5fa')

for name, svg in slides.items():
    open(os.path.join(OUT, f'{name}.svg'), 'w').write(svg)
    print(name, len(svg))
