import json,re,sys
sys.path.insert(0,'tools'); from i18n_over import O
src=open('../ur/i18n.js').read().split('\n')
out=['// senet/i18n.js — UI strings of セネト in 14 languages (ja, en, zh, zh-TW, ko, es, fr, pt, de, ru, tr, id, hi, ar; ar is RTL). Built by tools/build_i18n.py from ur/i18n.js + tools/i18n_over.py','window.I18N = {']
DROP={'tray.start','dice.zero','st.zero','fx.passZero','fx.rosette','fx.capAgain','tip.cantEnter','k.enter','rule.finkel','rule.blitz','rule.masters','rule.finkel.d','rule.blitz.d','rule.masters.d','bd.museum','bd.restored','bd.wood','bd.clay','pcs.orig','pcs.ivory','pcs.wood','lsc.vari'}
for ln in src[2:12]:
  m=re.match(r'(\w+): (\{.*\}),?$',ln); lg=m.group(1); d=json.loads(m.group(2))
  d['tag.std']=d.get('rule.std','')
  for x in DROP: d.pop(x,None)
  for key,v in O.items(): d[key]=v[lg]
  out.append(lg+': '+json.dumps(d,ensure_ascii=False)+',')
# ru / zh-TW / id / tr: the English dictionary through the translation memory (tools/tm14.json)
tm=json.load(open('tools/tm14.json'))
en=json.loads(re.match(r'en: (\{.*\}),$', [x for x in out if x.startswith('en: ')][0]).group(1))
miss=[]
def T(v,lg):
  if isinstance(v,list): return [T(x,lg) for x in v]
  if not re.search('[A-Za-z]',v): return v
  if v not in tm: miss.append(v); return v
  return tm[v][lg]
for lg in ['ru','zh-TW','id','tr']: [T(v,lg) for v in en.values()]
if miss: raise SystemExit('missing from tm14.json: '+json.dumps(sorted(set(miss)),ensure_ascii=False))
for lg in ['ru','zh-TW','id','tr']:
  d={k:T(v,lg) for k,v in en.items()}
  # the same English with another meaning: per key
  KEYOVR={'sp.off':{'ru':'Нет','zh-TW':'無','id':'Tidak ada','tr':'Yok'}}
  for k,o in KEYOVR.items():
    if k in d: d[k]=o[lg]
  out.append(json.dumps(lg)+': '+json.dumps(d,ensure_ascii=False)+',')
out.append('};')
open('i18n.js','w').write('\n'.join(out)+'\n')
print('ok')
