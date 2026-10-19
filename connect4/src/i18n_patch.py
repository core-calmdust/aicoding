# replace the Lv8 description (last element of lvd) in connect4/i18n.js, 10 languages
import re
p='/home/claude/aicoding/connect4/i18n.js'; s=open(p).read()
new = {
 "定石＋完全読み（先手なら必勝）": "完全プレイ（1手目から最善・先手なら必勝）",
 "book + perfect solver (unbeatable as first)": "perfect play from move 1 (unbeatable as first)",
 "开局库＋完全计算（先手必胜）": "完美对弈（从第1步起最优・先手必胜）",
 "정석＋완전 해석 (선수면 필승)": "완전 플레이 (1수부터 최선・선수면 필승)",
 "libro + solver perfecto (imbatible como primero)": "juego perfecto desde la 1.ª jugada (imbatible como primero)",
 "bibliothèque + solveur parfait (imbattable en premier)": "jeu parfait dès le 1er coup (imbattable en premier)",
 "livro + solver perfeito (imbatível jogando primeiro)": "jogo perfeito desde o 1º lance (imbatível jogando primeiro)",
 "Eröffnungsbuch + perfekter Solver (als Anziehender unschlagbar)": "perfektes Spiel ab dem 1. Zug (als Anziehender unschlagbar)",
 "ओपनिंग बुक + परफ़ेक्ट सॉल्वर (पहले खेलकर अजेय)": "पहली चाल से परफ़ेक्ट खेल (पहले खेलकर अजेय)",
 "كتاب افتتاحيات + محلّل مثالي (لا يُهزم إذا بدأ)": "لعب مثالي من النقلة الأولى (لا يُهزم إذا بدأ)",
}
n=0
for a,b in new.items():
    c=s.count(a); n+=c
    if c!=1: print('count',c,a)
    s=s.replace(a,b)
open(p,'w').write(s); print('replaced',n)
