"""Draw original, deterministic scenery and parallax layers for the game."""
from pathlib import Path
from random import Random

OUT = Path(__file__).resolve().parents[1] / 'public' / 'art'
OUT.mkdir(parents=True, exist_ok=True)
THEMES = {
    'aceh': ('#6ac7d1','#f6e5ad','#4d9b9f','#246f70','#71a75d','#3d8054','aceh'),
    'toba': ('#72bedc','#e3edb4','#4788ac','#397d87','#8aa660','#397f65','batak'),
    'minang': ('#78c9d6','#f5e7aa','#608f9c','#417b71','#a3b85c','#4e8a55','gadang'),
    'jawa': ('#73b9d3','#f3dd9f','#688ba5','#427878','#93aa60','#4c8054','candi'),
    'kalimantan': ('#70c3aa','#e9e9a7','#529c84','#236d60','#8ba955','#367953','betang'),
    'sulawesi': ('#75bfdf','#f4e8bd','#6a94a7','#487990','#8fa759','#3e7f5d','tongkonan'),
    'papua': ('#6fc9df','#dcf3bf','#4c9dba','#307b85','#a4ac67','#3c846c','honai'),
    'bali': ('#ef9b86','#f9e5a8','#9b8dad','#5d7890','#a2a967','#4d8660','bali'),
    'senja': ('#dd7993','#ffcf88','#9e7294','#555a87','#83a385','#3f766a','bali'),
    'karang': ('#58bddf','#d5e9bf','#528fac','#317c88','#86a96b','#386d63','honai'),
    'pesisir': ('#66c7da','#e8edb4','#5a9eb1','#3c8294','#9eb078','#50846b','tongkonan'),
    'desa-bali': ('#81c8ce','#f1e8b2','#6e9c9d','#428879','#a8b760','#558a58','bali'),
}

def write(name, body, width=1350, height=480):
    (OUT / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">{body}</svg>\n')

def path(d, fill, stroke='none', sw=1, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'

def ellipse(x, y, rx, ry, fill, extra=''):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" {extra}/>'

def rect(x, y, w, h, fill, rx=0, extra=''):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" {extra}/>'

def cloud(x, y, s):
    return f'<g transform="translate({x} {y}) scale({s})" fill="#fff8e6" opacity=".82"><path d="M-64 11Q-56-3-40 0Q-26-27-3-11Q18-44 41-10Q66-12 74 10Q90 16 79 23H-53Q-71 20-64 11Z"/><path d="M-35 33h54m13 0h23" fill="none" stroke="#fff8e6" stroke-width="3" stroke-linecap="round" opacity=".65"/></g>'

def pavilion(kind, x, y, scale):
    wall, trim, ink, roof, edge = '#e4b174', '#9e5b41', '#51434b', '#aa5848', '#f6bd76'
    roofline = {
        'aceh': 'M-100 -71L-69 -113H66L100 -71Z',
        'batak': 'M-100 -79Q-49 -80 -61 -129Q-5 -93 59 -133Q49 -93 100 -78Q25 -59 -3 -62Q-52 -62 -100 -79Z',
        'gadang': 'M-111 -68Q-88 -87 -99 -132Q-68 -94 -41 -104Q-29 -112 -36 -132Q-8 -101 6 -106Q27 -110 35 -137Q33 -99 57 -107Q77 -111 96 -139Q91 -91 111 -71Q18 -59 -111 -68Z',
        'betang': 'M-110 -71L-79 -108H72L110 -71Z',
        'tongkonan': 'M-112 -77Q-81 -82 -86 -143Q-57 -100 0 -100Q59 -99 88 -145Q80 -90 112 -77Q29 -62 -1 -65Q-57 -62 -112 -77Z',
    }
    if kind == 'honai':
        parts = [
            rect(-50, -67, 100, 70, '#b7764a', 16, 'stroke="#6a554b" stroke-width="3"'),
            path('M-62 -51Q-58 -111 0 -112Q54 -108 63 -51Q14 -34 -62 -51Z','#b78c57','#72543e',3),
            rect(-15,-36,30,40,'#544744',9),
        ]
        for i in range(-45, 46, 10):
            parts.append(path(f'M{i} -49 Q{i*1.1} -79 {i*.48} -99', 'none','#e3b778',1.5))
    elif kind in ('candi', 'bali'):
        parts = [rect(-89,-17,178,20,'#687168',2), rect(-70,-38,140,22,'#89917b',3)]
        if kind == 'candi':
            for dx, h in [(-51,54),(50,54),(0,96)]:
                parts += [path(f'M{dx-24} -32h48l-10 -{h-12}h-28Z','#7d8578','#586760',3),
                          path(f'M{dx-15} -{h+12}Q{dx} -{h+45} {dx+15} -{h+12}Z','#868c7b','#586760',2),
                          rect(dx-7,-57,14,24,'#596762',5)]
        else:
            parts += [rect(-21,-84,42,50,'#93775d',3)]
            for j, w in enumerate([110,86,62,38]):
                h = -62-j*22
                parts += [path(f'M{-w/2} {h}q14 -8 21 -24h{w-42 if w>42 else 2}q13 20 {23 if w>42 else 16} 24Z','#465852','#3d4847',2),
                          path(f'M{-w/2} {h}h{w}', 'none','#ccad79',2)]
    else:
        parts = [path('M-74 -9V8M-47 -9V8M45 -9V8M75 -9V8','none',trim,7),
                 rect(-83,-73,166,62,wall,4,f'stroke="{ink}" stroke-width="3"'),
                 rect(-88,-15,176,8,trim,1),
                 path(roofline[kind],roof,ink,3)]
        for i in range(-65, 70, 13):
            parts.append(path(f'M{i} -64v48','none','#c58f5d',1.2))
        for i in (-49,49):
            parts += [rect(i-12,-60,24,24,trim,3),rect(i-8,-56,16,15,'#f5cb83',2), path(f'M{i} -58v17m-9 -8h18','none',trim,2)]
        parts += [rect(-14,-56,28,40,trim,2), path('M-10 -48h20M-10 -42h20M-10 -36h20','none',edge,1.4),
                  path('M-84 -69Q0 -62 84 -70','none',edge,2),
                  path('M-16 -8L-30 10h60L16 -8Z','#8c674f'),path('M-24 4h48M-19 -2h38','none',edge,2)]
    return f'<g transform="translate({x} {y}) scale({scale})">{"".join(parts)}</g>'

def palm(x, y, s, flip, color):
    fronds = [
        'M0 0Q-24-39-84-18Q-39-25 0 4Z', 'M0 0Q-9-53-52-60Q-26-39 0 6Z',
        'M0 0Q5-50 48-60Q24-35 0 6Z', 'M0 0Q39-44 86-18Q47-28 0 8Z',
        'M0 0Q37-17 62 19Q34 2 0 8Z', 'M0 0Q-37-14-63 20Q-25 4 0 8Z',
    ]
    return f'<g transform="translate({x} {y}) scale({s*flip} {s})">' + path('M2 0Q-13 40 12 114H23Q-1 47 8 3Z','#826052') + path('M2 35l12 1m-11 13l11 2m-8 13l12 1m-9 13l13 3','none','#b08a63',2) + ''.join(path(d,color) for d in fronds) + ellipse(3,4,5,5,'#bea469') + '</g>'

def forest(x, y, scale, colors, rng):
    leaves = []
    for i in range(11):
        dx, dy = rng.randint(-55,55), rng.randint(-26,10)
        leaves.append(ellipse(dx,dy,rng.randint(19,40),rng.randint(15,32),colors[i%len(colors)]))
    return f'<g transform="translate({x} {y}) scale({scale})">' + path('M-8 133Q4 58-3 7L8 2Q7 76 18 133Z','#654f4f') + path('M4 58L-30 10M10 49L45 4','none','#735953',5) + ''.join(leaves) + '</g>'

for i, (name, (sky,horizon,far,mid,green,near,house)) in enumerate(THEMES.items()):
    rng = Random(223+i*133)
    sunset = name in ('bali', 'senja')
    sun = ('#ffe1a0' if sunset else '#fff3c2')
    background = f'<defs><linearGradient id="sky" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="{sky}"/><stop offset="1" stop-color="{horizon}"/></linearGradient><linearGradient id="water" x2="0" y2="1"><stop stop-color="#68bcae"/><stop offset="1" stop-color="#367d8f"/></linearGradient></defs>'
    background += rect(0,0,1350,480,'url(#sky)')
    background += ellipse(967 if sunset else 824, 134 if sunset else 89, 70,70,sun,'opacity=".28"') + ellipse(967 if sunset else 824,134 if sunset else 89,49,49,sun)
    background += ''.join(cloud(rng.randint(80,1250),rng.randint(39,171),rng.uniform(.45,1.6)) for _ in range(7))
    for row, color in enumerate([far,mid]):
        d = f'M-40 {325+row*29}'
        x = -40
        while x < 1400:
            peak = rng.randint(143,245) + row * 46
            w = rng.randint(130,240)
            d += f'Q{x+w*.25} {peak+26} {x+w*.41} {peak}Q{x+w*.54} {peak-16} {x+w*.7} {peak+12}T{x+w} {307+row*31}'
            x += w
        background += path(d + 'V480H-40Z', color, extra='opacity=".86"')
    background += path('M0 306Q197 350 412 326Q672 300 897 335T1350 322V480H0Z','url(#water)' if name in ('toba','kalimantan','papua','senja','karang','pesisir') else near)
    if name in ('karang','pesisir'):
        for x, y, scale in [(135,352,.63),(418,328,.89),(745,351,.72),(1025,340,1.13),(1250,326,.58)]:
            land = path('M-102 0Q-98-28-67-32Q-54-65-32-64Q-16-91 11-88Q42-87 53-54Q85-58 109 1Q41 23-102 0Z',near)
            land += path('M-99 0Q-33-1-16-20Q23-43 33-70Q41-27 58-24Q82-20 109 1Q41 21-99 0Z','#668c71')
            land += path('M-67-32Q-51-52-36-51Q-13-75 11-78Q35-79 47-60','none',green,5)
            background += f'<g transform="translate({x} {y}) scale({scale})">{land}</g>'
    for _ in range(45):
        x, y, w = rng.randrange(1300), rng.randrange(306,466), rng.randrange(12,85)
        background += path(f'M{x} {y}q{w*.4} -3 {w} 0','none',horizon,1.3,'opacity=".21"')
    write(f'{name}-far',background)

    scene = ''
    for x,y,s in [(85,357,.63),(245,337,.65),(530,350,.89),(826,338,.6),(1130,351,.85),(1450,346,.72)]:
        if name != 'senja':
            scene += path(f'M{x-145} {y+25}q136 -46 299 0v21h-299Z',green,extra='opacity=".61"')
        if x in (245,826,1130) and name not in ('karang','pesisir'):
            scene += pavilion(house,x,y,s)
    for x in [20,143,335,505,681,922,1035,1238,1439]:
        y = rng.randint(233,295)
        scale = rng.uniform(.62,1.04)
        if name in ('aceh','toba','bali','senja','karang','pesisir','desa-bali') and x % 3:
            scene += palm(x,y,scale,(-1 if x%2 else 1),near)
        else:
            scene += forest(x,y,scale,[green,near,mid],rng)
    for j in range(3):
        if name in ('minang','jawa','bali','desa-bali'):
            scene += path(f'M{260*j-30} {353+j*3}q120 37 310 5t180 13','none',horizon,1.7,'opacity=".62"')
    write(f'{name}-near',scene,1500)

write('icon', '''
<defs><linearGradient id="leaf" x2="0" y2="1"><stop stop-color="#25695f"/><stop offset="1" stop-color="#143832"/></linearGradient></defs>
<rect width="512" height="512" rx="108" fill="url(#leaf)"/>
<circle cx="256" cy="256" r="150" fill="#1d4842" stroke="#edca7e" stroke-width="13"/>
<circle cx="256" cy="256" r="119" fill="none" stroke="#729e7e" stroke-width="3" stroke-dasharray="4 12"/>
<path d="M267 118l37 100 91 38-96 43-43 97-39-102-99-38 96-39z" fill="#f1ca72"/>
<path d="M267 118l-11 138-42-39zM395 256l-139 0 43 43zM256 396V256l-39 38zM118 256h138l-39 38z" fill="#c9874b"/>
<circle cx="256" cy="256" r="17" fill="#faf0c9"/>
''',512,512)
