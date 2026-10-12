#!/usr/bin/env python3
"""Prepare verified source text/pages once; never publish OCR as question content."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('year', type=int)
parser.add_argument('output', type=Path, help='editorial workspace outside runtime data')
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
metadata = json.loads((repo / 'src/data/past-papers.json').read_text())
local = json.loads((repo / 'src/data/local-papers.json').read_text())
papers = [p for p in metadata['papers'] if p['year'] == args.year]
if len(papers) != 2 or {p['moduleId'] for p in papers} != {'p1', 'p2'}:
    parser.error('Choose a verified archive year containing both papers')
jobs = []
for paper in papers:
    mapping = next(p for p in local['papers'] if p['year'] == args.year and p['moduleId'] == paper['moduleId'])
    stem = f"tmua-{args.year}-{paper['moduleId']}"
    for kind, sha_key in [('paper', 'paperSha256'), ('worked', 'workedAnswersSha256')]:
        path = repo / f'public/papers/{stem}-{kind}.pdf'
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != paper[sha_key]:
            parser.error(f'{path.name}: source checksum mismatch')
        jobs.append({'path': path, 'stem': f'{stem}-{kind}', 'sha256': digest, 'kind': kind, 'module': paper['moduleId'], 'pages': mapping['pages']})
args.output.mkdir(parents=True, exist_ok=True)
manifest_path = args.output / 'preparation.json'
try:
    cached = json.loads(manifest_path.read_text())
except (OSError, ValueError):
    cached = {}
def prepare(job):
    text = args.output / f"{job['stem']}.txt"
    folder = args.output / job['module']
    first, last = min(job['pages'].values()), max(job['pages'].values())
    images = [folder / f'question-{p:02}.png' for p in range(first, last + 1)] if job['kind'] == 'paper' else []
    key = f"{job['sha256']}:layout:1300:{first}:{last}"
    if cached.get(job['stem'], {}).get('cacheKey') == key and text.exists() and all(p.exists() for p in images):
        return job['stem'], {'cacheKey': key, 'cached': True, 'pages': job['pages'] if images else {}}
    subprocess.run(['pdftotext', '-layout', str(job['path']), str(text)], check=True)
    if images:
        folder.mkdir(exist_ok=True)
        subprocess.run(['pdftoppm', '-f', str(first), '-l', str(last), '-scale-to', '1300', '-png', str(job['path']), str(folder / 'question')], check=True)
    return job['stem'], {'cacheKey': key, 'cached': False, 'pages': job['pages'] if images else {}}
with ThreadPoolExecutor(max_workers=2) as pool:
    results = dict(pool.map(prepare, jobs))
manifest_path.write_text(json.dumps(results, indent=2) + '\n')
print(f"{args.year}: four source checksums verified; {sum(v['cached'] for v in results.values())}/4 preparation jobs reused. Drafts still require question-by-question review.")
