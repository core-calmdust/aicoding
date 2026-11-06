# builds senet/coach-i18n.js = generic keys of ur/coach-i18n.js + senet/tools/coach_over.py
import json, os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(R, 'senet/tools')); from coach_over import O
ur = json.loads(subprocess.check_output(['node', '-e', "global.UrCoach={merge:o=>process.stdout.write(JSON.stringify(o))};require('./ur/coach-i18n.js')"], cwd=R))
GEN = 'head sw swT on off rest overRv calc st.open st.mid st.end wp race race.v race.ahead race.behind race.even recSharp recBranch recOnly brH brIntro cdH cdIntro gap.best gap.eq gap.lt gap.bad tipsH more less q.best q.good q.dubious q.bad prev prevBest prevAlt prevForced'.split()
out = ['// senet/coach-i18n.js — coach texts (zh ko es fr pt de hi ar); ja/en live in coach.js', '// built by senet/tools/build_coach_i18n.py', 'SenetCoach.merge({']
for l in ['zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar']:
    d = {k: ur[l][k] for k in GEN}; d.update(O[l]); out.append(l + ': ' + json.dumps(d, ensure_ascii=False) + ',')
out.append('});'); open(os.path.join(R, 'senet/coach-i18n.js'), 'w').write('\n'.join(out) + '\n')
