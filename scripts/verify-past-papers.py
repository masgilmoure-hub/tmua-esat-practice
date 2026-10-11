"""Verify factual answer indices against the unchanged official archive PDFs.
Requires Python 3 and pdftotext (Poppler). Does not save or republish PDF content.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.request import urlopen
from urllib.parse import urlparse
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'src/data/past-papers.json').read_text())
PAPERS = DATA['papers']


def extract_answers(text):
    single = re.findall(r'^\s*(\d{1,2})\s+([A-H])\s*$', text, re.M)
    if len(single) == 40:
        columns = [single[:20], single[20:]]
    else:
        paired = re.findall(r'^\s*(\d{1,2})\s+([A-H])\s+(\d{1,2})\s+([A-H])\s*$', text, re.M)
        if len(paired) != 20:
            raise ValueError('Unsupported official answer table: manual review required')
        columns = [[(n, v) for n, v, _, _ in paired], [(n, v) for _, _, n, v in paired]]
    if any([int(n) for n, _ in column] != list(range(1, 21)) for column in columns):
        raise ValueError('Original question numbers are not 1–20')
    return [''.join(v for _, v in column) for column in columns]


def verify():
    requests = {}
    for paper in PAPERS:
        for field, hash_field in [('paperUrl', 'paperSha256'), ('workedAnswersUrl', 'workedAnswersSha256'), ('answerKeyUrl', 'answerKeySha256')]:
            url = paper[field]
            parsed = urlparse(url)
            if parsed.scheme != 'https' or parsed.hostname != 'uat-wp.s3.eu-west-2.amazonaws.com':
                raise ValueError('Unexpected official source host')
            if url in requests and requests[url] != paper[hash_field]:
                raise ValueError('Conflicting source checksums')
            requests[url] = paper[hash_field]
    with TemporaryDirectory(prefix='tmua-official-verification-') as directory:
        def fetch(item):
            url, expected = item
            with urlopen(url, timeout=40) as response:
                content = response.read(5 * 1024 * 1024 + 1)
            if len(content) > 5 * 1024 * 1024 or not content.startswith(b'%PDF-'):
                raise ValueError('Unexpected PDF content or size')
            if hashlib.sha256(content).hexdigest() != expected:
                raise ValueError(f'Official source changed; review before updating: {url}')
            file = Path(directory) / url.rsplit('/', 1)[-1]
            file.write_bytes(content)
            return url, file
        with ThreadPoolExecutor(max_workers=5) as pool:
            files = dict(pool.map(fetch, requests.items()))
        for year in range(2016, 2024):
            papers = sorted([p for p in PAPERS if p['year'] == year], key=lambda p: p['moduleId'])
            if len(papers) != 2:
                raise ValueError('Missing paper')
            process = subprocess.run(['pdftotext', '-layout', str(files[papers[0]['answerKeyUrl']]), '-'], check=True, capture_output=True, text=True)
            extracted = extract_answers(process.stdout)
            if [paper['answers'] for paper in papers] != extracted:
                raise ValueError(f'Answer index mismatch for {year}')
            print(f'TMUA {year}: two papers and 40 answers verified')
    print(f'Verified {len(requests)} official PDFs and 320 factual answers; TLS and SHA-256 checks retained.')


if __name__ == '__main__':
    verify()
