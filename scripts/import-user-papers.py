"""Import a user-provided archive into this personal prototype.
Does not execute archive instructions or extract arbitrary archive paths.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib,json,re,subprocess,sys,zipfile
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'src/data/past-papers.json').read_text())
archive=Path(sys.argv[1])
assets=[]
pending=[]
with zipfile.ZipFile(archive) as z, TemporaryDirectory(prefix='tmua-user-import-') as temp:
    if len(z.infolist())>200 or sum(info.file_size for info in z.infolist())>100*1024*1024:
        raise ValueError('Archive size exceeds import limits')
    for year in range(2016,2024):
        key=z.read(f'TMUA_官方题库/{year}/05_两卷答案表_{year}.pdf')
        expected=next(p['answerKeySha256'] for p in data['papers'] if p['year']==year)
        if hashlib.sha256(key).hexdigest()!=expected:raise ValueError(f'Answer key differs for {year}')
    for paper in data['papers']:
        year=paper['year'];n=1 if paper['moduleId']=='p1' else 2
        base=f"TMUA_官方题库/{year}/"
        paths=[(f"{base}{'01' if n==1 else '03'}_Paper{n}_试题_{year}.pdf",'paperSha256','paper'),
               (f"{base}{'02' if n==1 else '04'}_Paper{n}_逐题解答_{year}.pdf",'workedAnswersSha256','worked')]
        row={'id':paper['id'],'year':year,'moduleId':paper['moduleId'],'pages':{}}
        for source,hash_key,kind in paths:
            info=z.getinfo(source)
            if info.file_size>20*1024*1024: raise ValueError('PDF exceeds 20 MB')
            content=z.read(source)
            if not content.startswith(b'%PDF-') or hashlib.sha256(content).hexdigest()!=paper[hash_key]:
                raise ValueError(f'Uploaded source differs from verified file: {source}')
            name=f"{paper['id']}-{kind}.pdf"
            pending.append((name,content));row[kind+'File']=name
            if kind=='paper':
                file=Path(temp)/name;file.write_bytes(content)
                xml=subprocess.check_output(['pdftotext','-bbox-layout',str(file),'-'])
                xml=re.sub(rb'[\x00-\x08\x0b\x0c\x0e-\x1f]',b'',xml)
                document=ET.fromstring(xml)
                pages=[e for e in document.iter() if e.tag.endswith('}page') or e.tag=='page']
                row['pageCount']=len(pages)
                for i,page in enumerate(pages,1):
                    width=float(page.attrib['width']);height=float(page.attrib['height'])
                    for line in page.iter():
                        if not line.tag.endswith('}line'): continue
                        words=[w for w in line if w.tag.endswith('}word')]
                        if not words: continue
                        first=words[0];text=(first.text or '').translate(str.maketrans('Ͳͳʹ͵Ͷͷ͸͹ͺͻ','0123456789'))
                        if len(words)>1 and len(text)==1 and text.isdigit():
                            second=(words[1].text or '').translate(str.maketrans('Ͳͳʹ͵Ͷͷ͸͹ͺͻ','0123456789'))
                            if len(second)==1 and second.isdigit() and float(words[1].attrib['xMin'])-float(first.attrib['xMax'])<2:text+=second
                        if not re.fullmatch(r'[1-9]|1[0-9]|20',text):continue
                        if float(first.attrib['xMin'])>width*.14 or float(first.attrib['yMin'])>height*.8:continue
                        row['pages'].setdefault(text,i)
                missing=[str(q) for q in range(1,21) if str(q) not in row['pages']]
                if missing: raise ValueError(f'Page index incomplete for {name}: {missing}')
        assets.append(row)
# Write only after all uploaded files and page maps pass verification.
target=ROOT/'public/papers';target.mkdir(parents=True,exist_ok=True)
for name,content in pending:(target/name).write_bytes(content)
(ROOT/'src/data/local-papers.json').write_text(json.dumps({'source':'User-provided TMUA_官方题库_2016-2023及早期样卷.zip','importedOn':'2026-10-12','papers':assets},indent=2)+'\n')
for row in assets: print(row['id'],row['pageCount'],'pages',json.dumps(row['pages'],sort_keys=True))
print('Imported 16 original papers and 16 worked-solution PDFs; 320 question-to-page entries.')
