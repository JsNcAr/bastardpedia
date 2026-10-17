"""Draw the Bastardpedia wordmark as outlines from Source Serif 4.

Source Serif 4 is the typeface of the site's headings (SIL Open Font License,
which permits logo use). This instances the variable font at a fixed weight and
optical size, lays the word out with the font's own GPOS pair kerning, and prints
one SVG path in a coordinate system with the baseline at y=0 and cap height
pointing up (negative y). Requires: pip install fonttools brotli.

    python3 brand/tools/wordmark.py [--text Bastardpedia] [--wght 600] [--opsz 32]
"""
import argparse
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FONT = Path(__file__).resolve().parents[2] / 'node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-standard-normal.woff2'


def pair_kerning(font):
    """{(left, right): x-advance adjustment} from GPOS PairPos lookups of the kern feature."""
    gpos = font['GPOS'].table
    lookups = set()
    for fr in gpos.FeatureList.FeatureRecord:
        if fr.FeatureTag == 'kern':
            lookups.update(fr.Feature.LookupListIndex)
    kern = {}
    for li in lookups:
        lookup = gpos.LookupList.Lookup[li]
        for st in lookup.SubTable:
            if st.LookupType == 9:  # extension
                st = st.ExtSubTable
            if getattr(st, 'LookupType', 2) != 2 and st.__class__.__name__ != 'PairPos':
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for first, ps in zip(cov, st.PairSet):
                    for rec in ps.PairValueRecord:
                        v = getattr(rec.Value1, 'XAdvance', 0) or 0
                        kern.setdefault((first, rec.SecondGlyph), v)
            elif st.Format == 2:
                c1, c2 = st.ClassDef1.classDefs, st.ClassDef2.classDefs
                for first in cov:
                    r1 = st.Class1Record[c1.get(first, 0)]
                    for second, k2 in list(c2.items()) + [(None, 0)]:
                        if second is None:
                            continue
                        v = getattr(r1.Class2Record[k2].Value1, 'XAdvance', 0) or 0
                        if v:
                            kern.setdefault((first, second), v)
    return kern


def wordmark(text, wght, opsz):
    font = TTFont(FONT)
    font = instantiateVariableFont(font, {'wght': wght, 'opsz': opsz})
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    kern = pair_kerning(font)
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    x = 0
    names = [cmap[ord(ch)] for ch in text]
    for i, name in enumerate(names):
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))  # flip y: SVG grows down
        x += gs[name].width
        if i + 1 < len(names):
            x += kern.get((name, names[i + 1]), 0)
    os2 = font['OS/2']
    return pen.getCommands(), x, font['head'].unitsPerEm, os2.sCapHeight, os2.sxHeight


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--text', default='Bastardpedia')
    ap.add_argument('--wght', type=float, default=600)
    ap.add_argument('--opsz', type=float, default=32)
    a = ap.parse_args()
    d, width, upm, cap, xh = wordmark(a.text, a.wght, a.opsz)
    print(f'<!-- width {width} upm {upm} cap {cap} x-height {xh} -->')
    print(d)
