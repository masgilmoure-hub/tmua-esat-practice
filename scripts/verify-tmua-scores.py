#!/usr/bin/env python3
"""Verify frozen historical tables against the retained PDF values and 2023 FOI excerpt."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_values(text):
    values = {'p1': [None] * 21, 'p2': [None] * 21, 'overall': [None] * 41}
    for line in text.splitlines():
        cells = line.strip().split()
        if len(cells) not in (2, 6) or not all(re.fullmatch(r'\d+(?:\.\d+)?', cell) for cell in cells):
            continue
        scopes = ('p1', 'p2', 'overall') if len(cells) == 6 else ('overall',)
        for scope, i in zip(scopes, range(0, len(cells), 2)):
            mark = int(cells[i])
            assert 0 <= mark < len(values[scope]) and values[scope][mark] is None, 'Invalid or duplicate mark'
            values[scope][mark] = float(cells[i + 1])
    for scores in values.values():
        assert None not in scores and all(1 <= score <= 9 for score in scores), 'Incomplete or invalid table'
        assert scores == sorted(scores), 'Non-monotonic table'
    return values


data = json.loads((ROOT / 'src/data/tmua-score-tables.json').read_text())
assert [table['year'] for table in data['tables']] == list(range(2018, 2024))
for table in data['tables']:
    pdf = ROOT / 'public/score-tables' / table['localFile']
    assert pdf.parent == ROOT / 'public/score-tables', 'Unexpected source path'
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == table['sha256'], 'Source PDF changed'
    actual = read_values(subprocess.check_output(['pdftotext', '-layout', str(pdf), '-'], text=True))
    assert all(actual[scope] == table[scope] for scope in actual), f"{table['year']} numeric mismatch"
    print(f"{table['year']}: hash and all 83 values match")
foi = read_values((ROOT / 'docs/sources/tmua-2023-foi-table.txt').read_text())
table = data['tables'][-1]
assert all(foi[scope] == table[scope] for scope in foi), '2023 official FOI response mismatch'
print('2023: all 83 values also match the preserved official Cambridge response')
