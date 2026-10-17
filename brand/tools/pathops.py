"""Tiny SVG path transformer for the brand masters (absolute M L H V C Q A Z only)."""
import re

def _f(v):
    return f'{v:.2f}'.rstrip('0').rstrip('.')

def transform(d, k=1.0, dx=0.0, dy=0.0):
    toks = re.findall(r'[MLHVCQAZ]|-?\d+\.?\d*', d)
    out, i, cmd = [], 0, None
    while i < len(toks):
        t = toks[i]
        if t in 'MLHVCQAZ':
            cmd = t; out.append(t); i += 1; continue
        if cmd in 'ML':
            out += [_f(float(toks[i]) * k + dx), _f(float(toks[i + 1]) * k + dy)]; i += 2
        elif cmd in 'CQ':
            n = 3 if cmd == 'C' else 2
            for j in range(n):
                out += [_f(float(toks[i + 2 * j]) * k + dx), _f(float(toks[i + 2 * j + 1]) * k + dy)]
            i += 2 * n
        elif cmd == 'H':
            out.append(_f(float(t) * k + dx)); i += 1
        elif cmd == 'V':
            out.append(_f(float(t) * k + dy)); i += 1
        elif cmd == 'A':
            rx, ry, rot, la, sw, x, y = toks[i:i + 7]
            out += [_f(float(rx) * k), _f(float(ry) * k), rot, la, sw, _f(float(x) * k + dx), _f(float(y) * k + dy)]
            i += 7
    return ' '.join(out)
