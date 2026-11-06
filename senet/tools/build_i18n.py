import json,re,sys
sys.path.insert(0,'tools'); from i18n_over import O
src=open('../ur/i18n.js').read().split('\n')
out=['// senet/i18n.js — UI strings of セネト in 10 languages (ja, en, zh, ko, es, fr, pt, de, hi, ar; ar is RTL). Built by tools/build_i18n.py from ur/i18n.js + tools/i18n_over.py','window.I18N = {']
DROP={'tray.start','dice.zero','st.zero','fx.passZero','fx.rosette','fx.capAgain','tip.cantEnter','k.enter','rule.finkel','rule.blitz','rule.masters','rule.finkel.d','rule.blitz.d','rule.masters.d','bd.museum','bd.restored','bd.wood','bd.clay','pcs.orig','pcs.ivory','pcs.wood','lsc.vari'}
for ln in src[2:12]:
  m=re.match(r'(\w+): (\{.*\}),?$',ln); lg=m.group(1); d=json.loads(m.group(2))
  d['tag.std']=d.get('rule.std','')
  for x in DROP: d.pop(x,None)
  for key,v in O.items(): d[key]=v[lg]
  out.append(lg+': '+json.dumps(d,ensure_ascii=False)+',')
out.append('};')
open('i18n.js','w').write('\n'.join(out)+'\n')
print('ok')
