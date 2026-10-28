/* だつごくスライダー！ — art: inmate characters (original comic-style human convicts), guard, UI icons, floor skins, mini boards */
(function () {
'use strict';
/* ---------------- inmates ----------------
   Pop-punk street-comic convicts built from parts: thick ink lines, flat clashing colours, lots of pattern
   (dots / stripes / checker / stitched patches), big expressive eyes, fangs and chunky accessories.
   Colour specs: '#hex' or a pattern 'dot|str|chk/#a/#b/size/rotation'.
   kind: hair style · c: skin · c2: hair colour · sex: 'm' | 'f' · rar: 0 N, 1 R, 2 SR, 3 SSR */
const INK = '#1d1a17';
const SKIN = ['#ffdcc0', '#f2b98e', '#d89566', '#a8693f', '#6b3f26', '#f7c9a6'];
const CAST = [
  // name, sex, skin, hair, hair colour, brows, eyes, iris(/iris2), mouth, extras, suit deco
  // N
  ['Rookie', 'm', 0, 'buzz', '#6b3f22', 'up', 'round', '#2f8fff', 'fang', 'beanie=str/#e2402f/#fff7e0/6/0 bandaid', 'pin'],
  ['Jinx', 'f', 1, 'pony', '#ffd23f', 'thin', 'sleepy', '#16c47a', 'fang', 'clip=dot/#ff4fa0/#fff starSt', 'dot'],
  ['Brick', 'm', 4, 'bald', '#1e1a18', 'angry', 'mean', '#ffcd3c', 'grit', 'beard boltTat hoop1', 'patch'],
  ['Pixel', 'f', 0, 'bob', '#5a3a22', 'worry', 'spiral', '#2f8fff', 'o', 'glasses sweat clip=chk/#ffcd3c/#1d1a17', 'chk'],
  ['Stubbs', 'm', 2, 'buzz', '#2a1e16', 'flat', 'sleepy', '#9a5a2a', 'smug', 'bucket=dot/#2f62d6/#fff stubble toothpick', 'str'],
  ['Bubbles', 'f', 5, 'buns', 'str/#ff6fae/#ffc2dd/5/90', 'thin', 'wink', '#b04fe0', 'bubble', 'blush hearts', 'heart'],
  ['Groove', 'm', 3, 'afro', '#2a1e16', 'up', 'round', '#ff8a3d', 'grin', 'band=str/#ffcd3c/#e2402f/6/0 pick', 'star'],
  ['Vivi', 'f', 2, 'wavy', '#d8461e', 'thin', 'round', '#16a463', 'lips', 'scarf=dot/#1d1a17/#ff4fa0 hoops mole', 'pin'],
  // R
  ['Spike', 'm', 5, 'mohawk', 'str/#3fdf4a/#fff200/6/0', 'angry', 'mean', '#e2402f', 'tongue', 'pinEar studs', 'patch'],
  ['Roxy', 'f', 4, 'bandana', '#1e1a18', 'thin', 'round', '#ffb21f', 'grin', 'hoops bandaidN', 'dot'],
  ['Duke', 'm', 2, 'pomp', '#1e1a18', 'up', 'sleepy', '#2f8fff', 'smug', 'burns toothpick', 'str'],
  ['Venom', 'f', 0, 'undercut', 'chk/#8b4fd1/#e2c6ff/6/45', 'thin', 'mean', '#9be83f', 'lips:#5a1d7b', 'nosering studs', 'chk'],
  ['Sparky', 'm', 1, 'spiky', '#ff7a1a', 'up', 'round', '#2fb5ff', 'tongue', 'goggles soot', 'bolt'],
  ['Queenie', 'f', 3, 'braids', '#1e1a18', 'thin', 'sleepy', '#ff8a3d', 'lips:#e0344d', 'hoops', 'heart'],
  ['Ledger', 'm', 5, 'slick', '#8a8f99', 'worry', 'dot', '#333', 'frown', 'glasses mustache sweat', 'pin'],
  ['Kite', 'f', 2, 'topbun', '#4a2a18', 'thin', 'mean', '#e2402f', 'lips:#b0304a', 'spoon scarEye', 'patch'],
  // SR
  ['Captain', 'm', 1, 'buzz', '#b9b4ad', 'angry', 'round', '#2fb5ff', 'gold', 'cap eyepatch stubble', 'patch'],
  ['Silver', 'f', 0, 'bangs', '#eef0f6', 'thin', 'sleepy', '#ff4fa0/#2fb5ff', 'fang', 'hood', 'none'],
  ['Rasta', 'm', 4, 'dreads', '#3b2416', 'up', 'round', '#ffcd3c', 'shout', 'phones=#ffcd3c/#e2402f stubble', 'str'],
  ['Wrench', 'f', 0, 'pixie', '#e2452b', 'thin', 'round', '#16a463', 'tongue', 'goggles freckles starTat', 'chk'],
  ['Tank', 'm', 2, 'bald', '#1e1a18', 'angry', 'mean', '#9be83f', 'grit', 'flameTat nosering stubble', 'chain'],
  ['Raven', 'f', 5, 'hime', '#16141c', 'thin', 'sleepy', '#b14fff', 'lips:#2a1430', 'heartSt choker', 'dot'],
  // SSR
  ['Legend', 'm', 1, 'wild', '#4a2c1a', 'angry', 'shades', '#ff4fa0', 'grin', 'tails scarN stubble', 'flame'],
  ['Nova', 'f', 0, 'twin', 'str/#21d8c8/#ff4fd8/7/0', 'thin', 'star', '#ff4fd8/#21d8c8', 'cat', 'cyber phones=#fff/#21d8c8', 'bolt'],
  // ---- 24–199: generated from the parts pool, then frozen (do not reorder — saves reference ids) ----
  ['Sass','f',4,'spacebuns','#8a8f99','worry','heart','#16c47a','smug','browring dangle=#ffe600 goggles','chk'],
  ['Tumbler','m',4,'dreads','#2a1e16','thick','none','#9be83f','flat','browcut nosering starsh=#ff4fa0 scarf=dot/#5ec26a/#e2c6ff/5/45','none','m2'],
  ['Wobble','m',0,'sidepart','#d8461e','worry','wide','#9be83f','shout','sweat hoops glasses sailor=#1d1a17','pin'],
  ['Torque','m',3,'flattop','#8b4fd1','flat','mean','#21d8c8','frown','cuff wrap=chk/#2fb5ff/#e2c6ff/6/45','star','m3'],
  ['Bunker','m',5,'curtains','#2fb5ff','up','big','#9a5a2a/#b04fe0','gold','cheekHeart blush pinEar knit=#f26b1d/#2f62d6','bands+dot','m2'],
  ['Fixit','m',1,'wolf','#2fb5ff','angry','sleepy','#b04fe0','grin','tear=#2f8fff stubble studs monocle bucket=dot/#ff7a1a/#ffcd3c/7/45','tie'],
  ['Disco','f',2,'sideshave','#eef0f6','worry','happy','#b04fe0','lips:#ff4fa0','heartSt pencil','splat','f2'],
  ['Puzzle','f',0,'bob','#d8461e','thin','dot','#e2402f','lips:#ff7a1a','starSt cherry','pocket','f2'],
  ['Locket','f',3,'curlybob','#1e1a18','worry','shades','#21d8c8','buck','boltTat flower=#ff4fa0','flame'],
  ['Shimmer','f',5,'wavy','#8a8f99','thin','wink','#ff8a3d','gap','soot bandaid toothpick beret=str/#16c47a/#bfe9ff/5/45','heart'],
  ['Smudge','m',2,'mullet','#ffd23f','uni','spiral','#b04fe0','smile','bandaidN handlebar dice','bands','m3'],
  ['Horseshoe','m',2,'spiky','#c98b4a','flat','slit','#9a5a2a','braces','warpaint=#fff lolly=dot/#ff4fa0/#fff/3/45 hband=#21d8c8/stripe','str','m3'],
  ['Solstice','f',1,'topbun','#b9ff4a','thin','star','#ff4fa0','cat','scarEye bow=str/#ff4fa0/#ffcd3c/6/45','chain','f2'],
  ['Jukebox','m',5,'mohawk','#c98b4a','uni','tired','#9be83f','tongue','freckles hoop1 square=#e2402f band=chk/#5ec26a/#fff/5/0','zip','m2'],
  ['Chacha','f',2,'long','#8a8f99','arch','none','#7a8a9a','ohno','xband neckph=#16c47a/#1d1a17 egog=#21d8c8/#ff8fc0 visor=#5ec26a','bolt'],
  ['Taco','m',4,'cornrows','#8b4fd1','up','line','#ffcd3c','o','mole starTat dangle=#2fb5ff ehood=#3fbf6a/cat','dice'],
  ['Chili','m',3,'bowl','#e2402f','angry','side','#16c47a','fang','scarN dots3 goatee lolly=chk/#2fb5ff/#fff/3/45 phones=#1d1a17/#ff4fa0','str+heart'],
  ['Toffee','f',0,'pony','str/#3b2416/#ff7a1a/5/45','low','round','#e2402f','wavy','lipring bandaid neckph=#5ec26a/#16c47a cowboy=#c98b4a/#f26b1d','chk+patch','f2'],
  ['Mambo','f',4,'emo','#c98b4a','low','wink','#2f8fff','lips:#5a1d7b','toothpick trucker=#2f62d6/#e2c6ff','tape'],
  ['Lilac','f',3,'longcurly','chk/#2f62d6/#ffcd3c/6/90','arch','tired','#21d8c8','lips:#b0304a','starTat studs eyepatch beanie=dot/#2f62d6/#e2c6ff/5/0','patch','f2'],
  ['Boulder','m',0,'topknot','#3b2416','thick','mean','#9a5a2a','smirk','dots3 dice hband=#ff7a1a/stripe','cherry','m2'],
  ['Caramel','f',5,'pixie','#21d8c8','arch','none','#ffcd3c','lips:#ff7a1a','freckles flower=#ff7a1a heartsh=#b04fe0 goggles','badge'],
  ['Ballast','m',1,'bald','#1e1a18','worry','wide','#ff8a3d','whistle','soulpatch nosering sailor=#5ec26a','none','m3'],
  ['Macaron','f',1,'sidepony','#21d8c8','arch','slit','#16c47a','bubble','browcut pencil beret=str/#f26b1d/#fff/6/45','moon','f2'],
  ['Mutter','m',2,'undercut','#e2402f','flat','heart','#2f8fff','bite','xband beard pinEar','dot','m2'],
  ['Grit','m',5,'pomp','#8b4fd1','up','big','#2fb5ff','kiss','starSt band=#16c47a','cherry'],
  ['Fiddle','m',1,'buzz','#eef0f6','worry','side','#21d8c8','grit','sweat cuff visor=#2f62d6','tape','m3'],
  ['Glitter','f',1,'puff','#d8461e','thin','none','#9be83f','lips:#b0304a','cheekHeart cherry visorsh=#21d8c8 bow=chk/#ffcd3c/#bfe9ff/6/45','pin'],
  ['Grizzle','m',3,'slick','#21d8c8','thick','dot','#e2402f','grit','soot mustache hoop1 beanie=#2fb5ff','chk'],
  ['Polka','f',2,'buns','#8a8f99','worry','sleepy','#9a5a2a','lips:#5a1d7b','hoops hband=#ff7a1a/bow','zip','f2'],
  ['Sketch','m',0,'afro','#6b3f22','angry','round','#21d8c8','gold','warpaint=#2fb5ff chinstrap toothpick visor=#8b4fd1','patch','m3'],
  ['Lotto','f',3,'braids','chk/#ff7a1a/#ffc2dd/6/0','arch','line','#2f8fff','ohno','lipring neckph=#ffcd3c/#5ec26a scarf=str/#21d8c8/#fff7e0/5/90','bolt','f2'],
  ['Hush','f',4,'twin','#2a1e16','arch','happy','#9be83f','flat','scarEye cuff goggles','none'],
  ['Honey','f',5,'pigtails','#ff7a1a','arch','star','#2fb5ff','lips:#ff4fa0','tear=#2f8fff browring cherry trucker=#ff7a1a/#ffcd3c','badge','f2'],
  ['Confetti','f',0,'hime','#ffd23f','worry','spiral','#2fb5ff','lips:#5a1d7b','scarN dangle=#ff4fa0 ehood=#2a2622/bunny','tie'],
  ['Crowbar','m',4,'sidepart','dot/#6b3f22/#21d8c8/6/45','uni','none','#b04fe0','gap','boltTat heartSt nosering starsh=#21d8c8 crown','tie+pocket','m2'],
  ['Hatchet','m',5,'afro','chk/#ff7a1a/#bfe9ff/5/90','up','slit','#21d8c8','bubble','bandaidN mole dice band=chk/#1d1a17/#bfe9ff/7/0','chain+cherry','m2'],
  ['Jitters','m',2,'sideshave','#d8461e','uni','happy','#21d8c8','smirk','dots3 hoop1 cowboy=#8a5a34/#8b4fd1','dot'],
  ['Sorbet','f',3,'drills','#21d8c8','thin','none','#e2402f','lips:#5a1d7b','blush lolly=chk/#ff7a1a/#fff/3/45 visorsh=#ffcd3c bow=dot/#f26b1d/#ffc2dd/6/90','bands','f2'],
  ['Ukulele','f',1,'spacebuns','#a0602e','low','sleepy','#ff4fa0','kiss','bandaid hoops','star'],
  ['Cherry','f',0,'pixie','#b9ff4a','worry','shades','#2f8fff/#9a5a2a','lips:#5a1d7b','xband blush pinEar','zip+flame'],
  ['Salsa','f',5,'bowl','#c98b4a','worry','heart','#9be83f','lips:#ff4fa0','warpaint=#2fb5ff wrap=#ffcd3c','chain','f2'],
  ['Tater','m',0,'buzz','chk/#ffe600/#21d8c8/7/45','angry','mean','#2fb5ff/#ff4fa0','buck','scarEye heartSt studs knit=#2fb5ff/#f26b1d','bands+dice','m3'],
  ['Pretzel','m',4,'topknot','#8b4fd1','flat','side','#21d8c8','smug','starTat pencil visor=#2f62d6','moon'],
  ['Plunger','m',3,'mohawk','#8a8f99','worry','wide','#b04fe0','fang','mole starSt burns lolly=str/#16c47a/#fff/3/45 square=#ffcd3c','str','m2'],
  ['Crank','m',1,'dreads','dot/#21d8c8/#bfe9ff/7/0','thick','none','#ffcd3c/#ff4fa0','o','freckles soot goatee hoop1 sparkle egog=#1d1a17/#ffcd3c phones=#21d8c8/#bfe9ff','zip+moon','m3'],
  ['Velvet','f',4,'longcurly','#d8461e','thin','star','#ff4fa0','tongue','cheekHeart flower=#fff','flame','f2'],
  ['Cinnamon','f',2,'braids','str/#6b3f22/#ffe600/6/90','low','round','#21d8c8/#ffcd3c','frown','sweat bandaidN pencil sparkle monocle crown','chk+star'],
  ['Kaboom','m',0,'long','#e2402f','thick','wink','#9a5a2a','shout','browring chinstrap studs glasses bucket=dot/#e2402f/#fff7e0/6/0','heart'],
  ['Button','f',0,'curtains','#2fb5ff','thin','line','#9be83f','lips:#5a1d7b','scarN tear=#2f8fff dice','pocket','f2'],
  ['Bonbon','f',2,'braids','#3b2416','low','dot','#ff8a3d','grin','dangle=#ffe600 phones=#21d8c8/#bfe9ff','none'],
  ['Mallet','m',2,'spiky','#21d8c8','angry','big','#2f8fff','smile','lipring boltTat neckph=#1d1a17/#2fb5ff eyepatch','dice','m2'],
  ['Cupcake','f',4,'mullet','#6b3f22','worry','tired','#ffcd3c','cat','browcut hoops knit=#ffcd3c/#e2c6ff','splat','f2'],
  ['Scrap','m',5,'emo','#ffe600','uni','spiral','#ffcd3c','bite','beard cuff trucker=#f26b1d/#21d8c8','none','m3'],
  ['Meatball','m',1,'pomp','#eef0f6','angry','big','#9a5a2a','braces','xband toothpick','flame','m3'],
  ['Zipper','m',3,'wolf','#3b2416','up','round','#16c47a','wavy','mustache pinEar','tie','m2'],
  ['Bobbin','f',5,'drills','dot/#21d8c8/#ff7a1a/5/45','thin','wide','#e2402f','lips:#2a1430','blush starSt flower=#fff bow=chk/#16c47a/#e2c6ff/7/90','tie+bolt'],
  ['Kettle','m',4,'flattop','#21d8c8','worry','tired','#2fb5ff','whistle','dots3 handlebar','star'],
  ['Hotshot','m',0,'slick','dot/#b9ff4a/#fff7e0/6/0','worry','line','#b04fe0','cat','cheekHeart tear=#2f8fff stubble nosering monocle wrap=str/#2f62d6/#fff/5/0','chain+badge'],
  ['Crayon','f',1,'hime','#d8461e','thin','heart','#b04fe0','tongue','cherry cowboy=#eef0f6/#e2402f','none','f2'],
  ['Throttle','m',4,'undercut','#b9ff4a','up','none','#9be83f','flat','browring scarN burns nosering visorsh=#21d8c8 bucket=dot/#8b4fd1/#fff/6/90','str+moon','m3'],
  ['Slugger','m',3,'cornrows','chk/#3b2416/#2fb5ff/7/45','flat','side','#16c47a','buck','soot freckles toothpick ehood=#3fbf6a/bunny','chain+tape','m2'],
  ['Rumble','m',2,'dreads','#e2402f','uni','slit','#ffcd3c','kiss','bandaid hoops','none'],
  ['Snooze','m',5,'bald','#6b3f22','thick','mean','#9a5a2a','shout','soulpatch','badge','m2'],
  ['Hijinks','m',1,'topknot','#ff7a1a','angry','dot','#ff8a3d','smile','starTat hoop1 glasses band=str/#e2402f/#ffc2dd/7/45','pin','m3'],
  ['Quartz','f',3,'pigtails','#8b4fd1','arch','none','#2fb5ff','ohno','boltTat scarEye cherry heartsh=#e2402f crown','tie+star'],
  ['Buckle','m',4,'spiky','#c98b4a','flat','wink','#e2402f','grin','pencil goggles','str','m3'],
  ['Knox','m',0,'curtains','#6b3f22','up','sleepy','#2fb5ff','o','heartSt dangle=#ff4fa0','moon','m2'],
  ['Twostep','f',0,'buns','#e2402f','arch','spiral','#2f8fff','lips:#ff4fa0','mole neckph=#f26b1d/#5ec26a','none','f2'],
  ['Fuse','m',3,'cornrows','#ff7a1a','uni','star','#7a8a9a/#9be83f','smirk','browcut lipring handlebar dice beret=chk/#ffcd3c/#bfe9ff/7/90','chk+pin'],
  ['Clatter','m',1,'dreads','#e2402f','worry','happy','#ff8a3d','grit','bandaidN pinEar scarf=str/#e2402f/#bfe9ff/6/45','none','m3'],
  ['Mochi','f',1,'puff','str/#1e1a18/#21d8c8/5/45','worry','happy','#b04fe0/#ffcd3c','wavy','warpaint=#ffcd3c sweat studs sparkle bow=chk/#5ec26a/#fff7e0/5/90','zip+bolt'],
  ['Nutmeg','f',3,'pony','#d8461e','thin','none','#21d8c8','whistle','tear=none browcut cuff starsh=#ffcd3c','bolt'],
  ['Lugnut','m',5,'mullet','#3b2416','thick','line','#ff4fa0','bite','soot burns lolly=dot/#2fb5ff/#fff/3/45 square=#1d1a17','zip','m2'],
  ['Waffle','m',2,'wolf','#6b3f22','angry','heart','#16c47a','braces','mole chinstrap lolly=chk/#16c47a/#fff/3/45 sailor=#ff7a1a','chain'],
  ['Dice','f',4,'sidepony','chk/#ff7a1a/#8b4fd1/6/45','thin','mean','#16c47a','lips:#5a1d7b','starTat bandaidN flower=#2fb5ff','str+splat','f2'],
  ['Glossy','f',2,'wavy','#1e1a18','low','none','#9be83f','smug','heartsh=#e2402f beanie=#5ec26a','cherry'],
  ['Brulee','f',5,'topbun','#3fdf4a','thin','round','#2fb5ff','frown','xband cherry','chk','f2'],
  ['Hubcap','m',2,'mohawk','#3fdf4a','flat','wide','#ff4fa0','fang','beard hoop1 hband=#5ec26a/stripe','dice'],
  ['Wedge','m',3,'emo','#2fb5ff','angry','star','#b04fe0','gap','sweat pencil','heart','m3'],
  ['Sherbet','f',2,'bob','#3b2416','thin','sleepy','#16c47a','bubble','scarEye pinEar trucker=#5ec26a/#ffc2dd','splat','f2'],
  ['Taffy','f',4,'puff','#2f62d6','thin','big','#ff8a3d','lips:#e0344d','warpaint=#ffcd3c bandaid neckph=#2f62d6/#f26b1d hband=#ff7a1a/bow','bands+splat'],
  ['Grinder','m',0,'long','#3b2416','up','slit','#e2402f','shout','heartSt soulpatch studs sailor=#1d1a17','tape','m2'],
  ['Bruiser','m',5,'bald','#1e1a18','thick','tired','#16c47a','grit','dots3 stubble cuff beanie=#5ec26a','pocket','m3'],
  ['Fumble','m',4,'spiky','chk/#ff6fae/#bfe9ff/6/90','worry','dot','#16c47a/#7a8a9a','gold','scarN freckles goatee toothpick sparkle','zip+heart'],
  ['Stretch','m',1,'slick','#8a8f99','uni','spiral','#16c47a','grin','mustache nosering cowboy=#e2402f/#8b4fd1','dot','m2'],
  ['Lace','f',5,'twin','#ffe600','arch','wink','#2fb5ff','braces','cheekHeart flower=#ff4fa0 eyepatch','bands','f2'],
  ['Sledge','m',4,'flattop','#2a1e16','angry','side','#21d8c8','frown','lipring burns dangle=#2fb5ff','patch','m3'],
  ['Tinsel','f',3,'curlybob','#8a8f99','low','none','#16c47a','smug','starSt dice egog=#16c47a/#9be83f knit=#5ec26a/#ffcd3c','chain'],
  ['Spanner','m',0,'sidepart','#3fdf4a','flat','round','#7a8a9a','smile','hoops','pin','m2'],
  ['Scamp','m',5,'pomp','#b9ff4a','thick','shades','#e2402f','o','boltTat browring lolly=str/#2fb5ff/#fff/3/45 visor=#ff4fa0','chk+star'],
  ['Gravel','m',3,'afro','#6b3f22','uni','slit','#e2402f','gap','studs goggles','moon','m2'],
  ['Trinket','f',1,'buns','#ffd23f','thin','wink','#ff8a3d','bite','blush pinEar band=#5ec26a','cherry','f2'],
  ['Gelato','f',0,'braids','#a0602e','thin','line','#21d8c8','lips:#2a1430','soot pencil','zip'],
  ['Twinkle','f',0,'longcurly','#ffd23f','low','heart','#e2402f','lips:#2a1430','flower=#fff ehood=#2f62d6/bunny','dot','f2'],
  ['Saffron','f',5,'pixie','#8a8f99','low','big','#16c47a','lips:#5a1d7b','monocle wrap=str/#1d1a17/#e2c6ff/5/0','star'],
  ['Sparkle','f',1,'sidepony','#8b4fd1','arch','dot','#e2402f','lips:#5a1d7b','nosering beret=#21d8c8','flame'],
  ['Dollop','f',4,'curlybob','#b9ff4a','thin','star','#7a8a9a','lips:#ff4fa0','cherry','heart','f2'],
  ['Fizzy','f',2,'spacebuns','str/#3fdf4a/#ffcd3c/5/90','thin','mean','#21d8c8','bubble','browring lipring hoops visor=#e2402f','str+dice'],
  ['Roulette','f',3,'bowl','str/#6b3f22/#3fdf4a/7/0','low','side','#7a8a9a','tongue','browcut hoop1','badge','f2'],
  ['Lunette','f',0,'undercut','str/#ffe600/#2f62d6/7/45','thin','wide','#2fb5ff','lips:#e0344d','warpaint=#2fb5ff dots3 toothpick bucket=str/#ff7a1a/#fff7e0/7/90','chain+pin','f2'],
  ['Zap','m',1,'sideshave','#6b3f22','worry','shades','#b04fe0','fang','mole dice phones=#ffcd3c/#fff','none'],
  ['Satin','f',3,'topbun','str/#3b2416/#3fdf4a/5/90','worry','spiral','#21d8c8','flat','boltTat neckph=#ff7a1a/#2f62d6 eyepatch hband=#ffcd3c/bow','dice'],
  ['Mortar','m',2,'pomp','str/#b9ff4a/#8b4fd1/7/0','up','happy','#ff4fa0/#21d8c8','smirk','bandaidN scarEye dangle=#ff4fa0 sparkle','bands+star','m3'],
  ['Tumble','m',3,'buzz','#2a1e16','angry','tired','#2fb5ff','buck','goatee cuff scarf=#ffcd3c','chk','m2'],
  ['Jellybean','f',4,'puff','#21d8c8','low','sleepy','#ffcd3c','lips:#5a1d7b','cheekHeart sweat pinEar','tie+badge'],
  ['Gumbo','m',4,'bald','#a0602e','worry','none','#21d8c8','wavy','mustache hoops visorsh=#ff4fd8 bucket=str/#8b4fd1/#fff7e0/7/45','none'],
  ['Cargo','m',5,'long','#d8461e','uni','heart','#ffcd3c','ohno','freckles handlebar dangle=#2fb5ff beret=str/#ff4fa0/#ffcd3c/5/0','none','m3'],
  ['Loop','f',5,'drills','#eef0f6','low','happy','#9be83f','lips:#2f62d6','toothpick','splat','f2'],
  ['Crumb','m',1,'buzz','#21d8c8','thick','spiral','#7a8a9a','kiss','dice sailor=#5ec26a','pocket','m3'],
  ['Biscotti','f',2,'twin','#2a1e16','thin','big','#ff4fa0','gold','starSt neckph=#8b4fd1/#f26b1d','tape'],
  ['Raffle','f',1,'pony','#ff6fae','worry','dot','#ff8a3d/#9be83f','whistle','starTat scarN nosering crown','zip+patch','f2'],
  ['Doodle','m',2,'sidepart','#6b3f22','up','star','#2fb5ff','cat','xband lolly=chk/#16c47a/#fff/3/45 knit=#16c47a/#ffcd3c','bolt'],
  ['Sequin','f',2,'bob','#8b4fd1','low','none','#ffcd3c','smile','tear=none cherry egog=#2fb5ff/#ffcd3c trucker=#21d8c8/#fff','bands','f2'],
  ['Pastel','f',3,'wavy','#3b2416','low','sleepy','#b04fe0','tongue','heartSt flower=#2fb5ff ehood=#eef0f6/bunny','patch'],
  ['Brawler','m',0,'wolf','chk/#8b4fd1/#2f62d6/7/90','flat','mean','#21d8c8','shout','blush soulpatch cuff scarf=dot/#1d1a17/#bfe9ff/7/90','tie','m2'],
  ['Hunch','f',0,'pigtails','#21d8c8','arch','tired','#2f8fff','lips:#e0344d','bandaid glasses','str'],
  ['Nougat','f',1,'hime','#c98b4a','thin','slit','#b04fe0','cat','lipring pencil square=#2f62d6 cowboy=#eef0f6/#ffc2dd','dice','f2'],
  ['Relish','m',4,'spiky','#3b2416','worry','side','#16c47a','flat','hoop1','tape','m2'],
  ['Rascal','m',2,'undercut','#8b4fd1','flat','wink','#7a8a9a','kiss','cheekHeart chinstrap studs beanie=dot/#ff7a1a/#e2c6ff/6/90','pin','m3'],
  ['Sprinkle','f',5,'mullet','#ffd23f','arch','wide','#21d8c8','lips:#5a1d7b','freckles warpaint=#e2402f toothpick wrap=str/#1d1a17/#e2c6ff/5/0','cherry'],
  ['Marigold','f',4,'pigtails','#2fb5ff','arch','line','#ffcd3c','o','boltTat dice','star','f2'],
  ['Static','m',3,'dreads','#a0602e','angry','round','#9a5a2a','bite','beard cuff phones=#8b4fd1/#bfe9ff','chain'],
  ['Maraca','f',2,'spacebuns','#8a8f99','thin','line','#e2402f','buck','starSt pinEar','splat','f2'],
  ['Rivet','m',0,'slick','#ff7a1a','up','star','#7a8a9a','smug','tear=#2f8fff dangle=#2fb5ff band=str/#e2402f/#e2c6ff/5/0','dot','m3'],
  ['Doily','f',3,'twin','dot/#ffe600/#3fdf4a/7/90','arch','mean','#b04fe0/#21d8c8','gap','dots3 soot neckph=#f26b1d/#ff4fa0 sparkle bow=str/#2f62d6/#e2c6ff/5/0','str+star'],
  ['Lolli','f',5,'topbun','#21d8c8','worry','round','#e2402f','bubble','browring xband nosering goggles','str'],
  ['Tofu','f',1,'emo','#ffe600','thin','wide','#2f8fff','lips:#2a1430','bandaidN sweat flower=#ff7a1a','patch','f2'],
  ['Tulip','f',0,'wavy','#8b4fd1','arch','none','#ffcd3c','gold','browcut pencil starsh=#ff4fa0 bucket=chk/#f26b1d/#ffcd3c/6/45','tie','f2'],
  ['Gossip','f',4,'sidepony','#ffd23f','arch','none','#21d8c8','frown','heartsh=#ff4fa0','pocket'],
  ['Rosy','f',1,'pixie','#8b4fd1','thin','tired','#ff4fa0','wavy','hoop1','chk'],
  ['Bijou','f',4,'bob','#21d8c8','worry','slit','#ff8a3d','grin','scarEye cherry monocle beanie=str/#2fb5ff/#ffc2dd/5/90','bands','f2'],
  ['Piston','m',1,'mohawk','#ffe600','uni','shades','#ff8a3d','smirk','scarN stubble studs goggles','moon','m2'],
  ['Thud','m',5,'curtains','#ffd23f','thick','happy','#ff8a3d','ohno','bandaid mole studs glasses trucker=#e2402f/#8b4fd1','bolt'],
  ['Pickle','m',5,'afro','chk/#3b2416/#e2402f/7/45','uni','none','#ff4fa0/#9be83f','whistle','heartSt soot hoops sparkle visorsh=#ffcd3c','bands+bolt','m2'],
  ['Clover','f',2,'braids','#8b4fd1','thin','wink','#e2402f','lips:#2f62d6','blush starTat lolly=chk/#16c47a/#fff/3/45 sailor=#5ec26a','heart','f2'],
  ['Boogie','f',3,'curlybob','#8a8f99','thin','big','#21d8c8','lips:#ff4fa0','flower=#2fb5ff scarf=#2f62d6','badge'],
  ['Jackpot','m',4,'sideshave','#ff7a1a','worry','side','#2fb5ff','grit','xband browring lolly=dot/#2fb5ff/#fff/3/45','chk+flame','m3'],
  ['Swirl','f',5,'pony','#3b2416','low','heart','#ffcd3c','braces','warpaint=#e2402f hoops wrap=str/#e2402f/#e2c6ff/6/0','none','f2'],
  ['Shuffle','m',2,'bowl','#3b2416','flat','sleepy','#ffcd3c','fang','stubble neckph=#f26b1d/#ff4fa0 beret=#f26b1d','zip'],
  ['Rumor','f',0,'hime','#1e1a18','worry','spiral','#16c47a','grit','toothpick phones=#f26b1d/#ffc2dd','flame'],
  ['Blitz','m',0,'afro','#8a8f99','thick','none','#b04fe0','cat','burns hoop1 starsh=#ff4fa0 band=dot/#5ec26a/#fff/6/0','none','m3'],
  ['Rusty','m',3,'pomp','dot/#e2402f/#ff6fae/6/45','up','dot','#21d8c8','grin','sweat browcut beard pencil','tie+pocket','m2'],
  ['Cheddar','m',1,'topknot','dot/#ff7a1a/#ffe600/6/90','angry','dot','#9be83f/#2f8fff','buck','scarEye scarN chinstrap dangle=#2fb5ff sparkle','chain+heart'],
  ['Ribbon','f',5,'longcurly','#1e1a18','thin','sleepy','#2fb5ff','flat','pinEar ehood=#8b4fd1/bunny','pin','f2'],
  ['Sprocket','m',5,'cornrows','#3fdf4a','uni','wink','#9be83f','tongue','bandaid soulpatch cowboy=#e2402f/#bfe9ff','none'],
  ['Dumpling','m',1,'topknot','#6b3f22','up','wide','#ff4fa0','fang','mole dice','heart','m2'],
  ['Hazel','f',2,'twin','#3fdf4a','thin','round','#21d8c8/#b04fe0','whistle','blush starTat cherry','zip+dot'],
  ['Ginger','f',3,'drills','#c98b4a','low','heart','#9a5a2a','smile','nosering bow=str/#2fb5ff/#ffcd3c/5/45','cherry'],
  ['Jive','f',4,'buns','chk/#2f62d6/#e2402f/6/90','arch','big','#9be83f/#7a8a9a','o','tear=none boltTat cuff hband=#21d8c8/bow','str+cherry','f2'],
  ['Gasket','m',3,'flattop','#8b4fd1','angry','side','#9a5a2a','bite','freckles nosering knit=#21d8c8/#ff7a1a','flame','m3'],
  ['Mica','f',0,'puff','#3b2416','low','spiral','#7a8a9a','lips:#2a1430','heartSt lolly=str/#2fb5ff/#fff/3/45 visor=#2f62d6','str','f2'],
  ['Paprika','f',1,'emo','#eef0f6','worry','star','#2f8fff','kiss','dangle=#ff4fa0 cowboy=#c98b4a/#e2c6ff','moon'],
  ['Washer','m',4,'sidepart','#2f62d6','thick','line','#ff4fa0','gap','dots3 dice knit=#2fb5ff/#fff','dot'],
  ['Fizz','m',2,'mohawk','chk/#21d8c8/#e2402f/5/45','flat','slit','#b04fe0','wavy','lipring starSt mustache visor=#ff7a1a','badge','m2'],
  ['Peachy','f',5,'sideshave','dot/#ffe600/#ffc2dd/7/90','worry','none','#ff4fa0','lips:#5a1d7b','cheekHeart hoop1 egog=#16c47a/#7fe0ff ehood=#2f62d6/bunny','dice','f2'],
  ['Biscuit','m',0,'wolf','#b9ff4a','worry','tired','#2f8fff','smug','bandaidN cheekHeart goatee neckph=#ff7a1a/#f26b1d crown','chain+heart','m3'],
  ['Thimble','f',4,'bob','#1e1a18','worry','happy','#ffcd3c','braces','starTat hoops beanie=chk/#8b4fd1/#fff/7/0','chk'],
  ['Mustard','m',2,'flattop','#eef0f6','uni','mean','#7a8a9a','smirk','sweat handlebar pinEar beret=chk/#16c47a/#fff/7/90','bolt','m3'],
  ['Patch','m',1,'pomp','#e2402f','flat','wide','#ff4fa0','shout','bandaid pencil band=dot/#f26b1d/#fff7e0/7/0','tie'],
  ['Hambone','m',3,'slick','#2fb5ff','thick','big','#b04fe0','bubble','studs square=#e2402f','pocket','m2'],
  ['Prism','f',2,'buns','#a0602e','worry','tired','#ffcd3c','lips:#ff4fa0','heartSt cuff','tape','f2'],
  ['Opal','f',3,'twin','#6b3f22','arch','dot','#ffcd3c','lips:#e0344d','toothpick','star'],
  ['Ruckus','m',0,'topknot','#3fdf4a','angry','side','#9be83f','ohno','pinEar eyepatch goggles','chain','m2'],
  ['Cobble','m',4,'buzz','#6b3f22','angry','heart','#9be83f','frown','neckph=#8b4fd1/#ffcd3c','splat'],
  ['Sugar','f',0,'topbun','#2fb5ff','arch','star','#b04fe0','bite','flower=#fff bow=#2f62d6','bands'],
  ['Hustle','m',5,'cornrows','#e2402f','worry','none','#7a8a9a','gold','browring burns toothpick starsh=#ff4fa0 wrap=str/#8b4fd1/#fff/5/0','patch','m3'],
  ['Gauge','m',3,'long','#a0602e','thick','mean','#21d8c8','ohno','xband mustache','zip'],
  ['Soot','m',1,'afro','#8a8f99','uni','none','#7a8a9a','smirk','freckles dangle=#2fb5ff egog=#f26b1d/#ffcd3c','cherry','m3'],
  ['Pinwheel','f',1,'pony','chk/#1e1a18/#8b4fd1/6/45','arch','none','#ff4fa0','smug','tear=#2f8fff blush cherry heartsh=#e2402f crown','chk+moon','f2'],
  ['Dynamo','m',5,'bowl','#6b3f22','worry','slit','#9a5a2a','gap','boltTat dice sailor=#2fb5ff','moon','m2'],
  ['Kazoo','f',0,'wavy','#c98b4a','worry','round','#b04fe0','frown','warpaint=#2fb5ff flower=#ff7a1a monocle','bolt'],
  ['Starlet','f',5,'puff','#a0602e','low','line','#16c47a','lips:#e0344d','cuff hband=#1d1a17/bow','dice','f2'],
  ['Comet','f',3,'spacebuns','#c98b4a','worry','happy','#16c47a','whistle','hoops square=#ff4fa0 hband=#21d8c8/bow','pocket','f2'],
  ['Socket','m',4,'spiky','str/#2fb5ff/#b9ff4a/7/0','up','wink','#ff4fa0','buck','bandaidN scarEye studs goggles','pin'],
  ['Scribble','f',1,'longcurly','str/#21d8c8/#8b4fd1/5/45','thin','spiral','#e2402f/#ffcd3c','smile','dots3 scarN nosering sparkle phones=#e2402f/#2fb5ff','tie+star'],
  // ---- end generated ----
];
const RARS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3].concat([...'00002110010110112201010110110011010220112020130301010010212022000201020311020001020030010020000000212013020000121101110110001311100011310200002300120201001120010000001102000013'].map(Number));
const INMATES = CAST.map(([name, sex, sk, hair, hc, brow, eyes, iris, mouth, acc, suit, head], id) => ({ id, kind: hair, c: SKIN[sk], c2: hc, rar: RARS[id], sex, name, brow, eyes, iris: iris.split('/'), mouth, acc: acc ? acc.split(' ') : [], suit, head: head || sex }));
const dk = (h, f = .76) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
const base = s => s.includes('/') ? s.split('/')[1] : s;
const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, f, w = 3) => `<path d="${d}" fill="${f}" ${S(w)}/>`;
const PF = (d, f, o = '') => `<path d="${d}" fill="${f}"${o}/>`;
const L = (d, c = INK, w = 3, o = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
const C = (x, y, r, f, w = 0) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${w ? ' ' + S(w) : ''}/>`;
const MIR = s => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
const SYM = s => s + MIR(s);
const star = (x, y, r, f, w = 1.4) => P(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; return (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(1) + ' ' + (y + Math.sin(a) * q).toFixed(1); }).join('') + 'Z', f, w);
const N = v => +v.toFixed(2);
const pts = (cmd, ...a) => cmd + a.map(N).join(' ');
const heart = (x, y, s, f, w = 1.3) => P(pts('M', x, y + s * .9) + pts('C', x - s * 1.4, y, x - s * .8, y - s, x, y - s * .3) + pts('C', x + s * .8, y - s, x + s * 1.4, y, x, y + s * .9) + 'Z', f, w);
const bolt = (x, y, s, f, w = 1.3) => P(pts('M', x + s * .2, y - s) + pts('L', x - s * .6, y + s * .15) + pts('L', x, y + s * .15) + pts('L', x - s * .2, y + s) + pts('L', x + s * .6, y - s * .15) + pts('L', x, y - s * .15) + 'Z', f, w);
const flame = (x, y, s, f, f2) => P(pts('M', x, y) + pts('C', x - s, y, x - s * 1.1, y - s, x - s * .5, y - s * 1.6) + pts('C', x - s * .4, y - s, x - s * .1, y - s, x, y - s * 2.2) + pts('C', x + s * .3, y - s * 1.2, x + s * .7, y - s * 1.4, x + s * .6, y - s * 1.9) + pts('C', x + s * 1.3, y - s * 1.1, x + s, y, x, y) + 'Z', f, 1.6)
  + (f2 ? PF(pts('M', x, y - .5) + pts('C', x - s * .5, y - .5, x - s * .5, y - s * .7, x, y - s * 1.2) + pts('C', x + s * .5, y - s * .7, x + s * .5, y - .5, x, y - .5) + 'Z', f2) : '');
const stitch = (d, w = 1.3) => L(d, INK, w, ' stroke-dasharray="1.6 2.2"');
let UID = 0;
const HEAD = { m: 'M28 44Q28 20 50 20Q72 20 72 44V58Q72 75 59 81H41Q28 75 28 58Z', f: 'M30 44Q30 20 50 20Q70 20 70 44Q70 64 61 74Q50 83 39 74Q30 64 30 44Z',
  m2: 'M27 42Q27 19 50 19Q73 19 73 42V64Q73 78 62 82H38Q27 78 27 64Z', m3: 'M30 42Q30 18 50 18Q70 18 70 42V62Q70 78 58 84H42Q30 78 30 62Z', f2: 'M29 46Q29 21 50 21Q71 21 71 46Q71 70 50 80Q29 70 29 46Z' };
/* hair: [back layer, front layer] — fills may be patterns */
function hair(k, hc, F) {
  const h = F(hc), d = dk(base(hc)), sh = (x1, y1, x2, y2) => L(`M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 3} ${x2} ${y2}`, '#fff', 2.4, ' opacity=".6"');
  switch (k) {
    case 'buzz': return ['', P('M28 43Q27 18 50 17Q73 18 72 43Q69 30 61 29Q50 26 39 29Q31 30 28 43Z', h) + L('M35 25l2 2M43 22l2 2M53 22l2 2M62 24l2 2', d, 1.6)];
    case 'bald': return ['', L('M36 28Q42 23 49 23', '#fff', 3.4, ' opacity=".7"')];
    case 'afro': {
      let b = '';
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; b += C((50 + Math.cos(a) * 30).toFixed(1), (32 + Math.sin(a) * 23).toFixed(1), 13, h, 3.4); }
      return [b + `<ellipse cx="50" cy="32" rx="31" ry="24" fill="${h}"/>` + L('M30 22q4-4 8-2M60 14q4-3 8 0M68 30q4-2 6 2', '#fff', 2, ' opacity=".35"'), P('M28 46Q29 26 50 26Q71 26 72 46Q66 33 50 33Q34 33 28 46Z', h)];
    }
    case 'mohawk': return ['', PF('M29 41Q29 23 50 22Q71 23 71 41Q61 31 50 31Q39 31 29 41Z', 'rgba(0,0,0,.14)') + P('M42 32L33 0L45 10L50 -6L55 10L67 0L58 32Z', h, 3.2)];
    case 'pomp': return ['', P('M27 47Q20 26 33 17Q48 3 68 7Q85 11 81 23Q78 29 71 28Q73 37 72 47Q68 34 58 32Q46 30 38 34Q31 38 27 47Z', h, 3.2) + sh(37, 14, 66, 10) + L('M44 21q12-7 26-4', '#fff', 1.6, ' opacity=".4"')];
    case 'spiky': return ['', P('M27 47L20 30L31 31L24 13L37 21L38 4L48 17L55 0L59 17L70 4L68 21L81 15L72 30L81 35L72 47Q66 32 50 31Q34 32 27 47Z', h, 3.2) + sh(40, 22, 56, 19)];
    case 'slick': return ['', P('M27 44Q26 16 50 15Q74 16 73 44Q71 29 62 26Q50 22 38 26Q29 30 27 44Z', h) + L('M35 21Q50 14 67 21M32 29Q48 20 69 27', '#fff', 1.6, ' opacity=".7"')];
    case 'dreads': {
      let b = '';
      [[24, 30, 18, 88], [30, 26, 28, 92], [70, 26, 72, 92], [76, 30, 82, 88], [36, 22, 36, 86], [64, 22, 64, 86]].forEach(([x1, y1, x2, y2]) => { b += L(`M${x1} ${y1}Q${x1 - 5} ${(y1 + y2) / 2} ${x2} ${y2}`, INK, 11) + L(`M${x1} ${y1}Q${x1 - 5} ${(y1 + y2) / 2} ${x2} ${y2}`, h, 5.6) + C(x2, y2 - 6, 3, '#ffcd3c', 1.4); });
      return [b, P('M28 44Q27 17 50 16Q73 17 72 44Q68 29 50 28Q32 29 28 44Z', h)];
    }
    case 'wild': return [P('M24 44Q12 12 44 8Q76 2 88 26Q100 42 92 68Q87 58 81 56Q90 74 81 90Q76 74 71 66L29 66Q24 76 18 90Q10 68 20 56Q12 52 24 44Z', h, 3.4) + L('M22 70l-4 6M84 70l4 6', INK, 2.4), P('M28 45Q26 21 44 17Q61 13 71 21Q75 30 72 45Q66 30 54 30Q40 30 28 45Z', h) + P('M43 25Q36 37 42 46Q45 34 52 28Z', h, 2.6) + sh(40, 21, 62, 18)];
    case 'pony': return [P('M62 22Q90 16 92 42Q93 66 78 84Q82 60 73 44Q69 32 62 30Z', h, 3.2), P('M30 47Q27 17 50 16Q73 17 70 47Q68 30 56 27Q48 36 36 36Q31 40 30 47Z', h) + sh(36, 24, 54, 20)];
    case 'bob': return [P('M25 46Q22 12 50 12Q78 12 75 46L77 76Q70 80 64 74L36 74Q30 80 23 76Z', h), P('M28 41Q27 16 50 16Q73 16 72 41Q62 34 50 36Q38 34 28 41Z', h) + SYM(P('M28 38L25 75Q30 78 35 73L33 42Z', h, 2.8)) + sh(36, 24, 58, 20)];
    case 'buns': return [C(29, 19, 12, h, 3.2) + C(71, 19, 12, h, 3.2), P('M29 45Q28 18 50 17Q72 18 71 45Q66 28 50 26Q34 28 29 45Z', h) + L('M50 17v9', d, 2)];
    case 'wavy': return [P('M25 42Q20 12 50 11Q80 12 75 42Q83 56 77 70Q87 82 79 96L21 96Q13 82 23 70Q17 56 25 42Z', h, 3.2), P('M29 47Q26 16 50 15Q74 16 71 47Q66 30 57 26Q52 38 38 38Q32 40 29 47Z', h) + SYM(P('M30 40Q23 52 29 62Q24 71 29 80L35 75Q31 67 35 60Q30 50 33 43Z', h, 2.6)) + sh(56, 21, 66, 25)];
    case 'bandana': return [P('M26 54Q23 30 29 26L71 26Q77 30 74 54Z', h), P('M26 41Q24 10 50 10Q76 10 74 41Q50 33 26 41Z', F('dot/#e2402f/#fff/5/0'), 3) + P('M72 35L89 27L87 41Z', '#e2402f', 2.4) + P('M72 37L85 50L76 52Z', '#e2402f', 2.4) + C(73, 36, 4.2, '#b8322f', 2.4)];
    case 'undercut': return ['', PF('M29 44Q29 26 40 22L40 31Q33 35 30 44Z', 'rgba(0,0,0,.18)') + P('M34 30Q45 10 65 13Q81 20 76 44Q78 60 70 70Q70 49 64 39Q56 30 44 34Q38 33 34 30Z', h, 3.2) + L('M33 34l3-2M33 38l3-2', d, 1.4)];
    case 'braids': {
      let b = '';
      [23, 30, 70, 77].forEach((x, j) => { for (let y = 34, n = 0; y < 96; y += 7, n++) b += `<ellipse cx="${x + (x < 50 ? -(y - 34) / 12 : (y - 34) / 12)}" cy="${y}" rx="4" ry="4.4" fill="${h}" ${S(1.8)}/>`; b += C(x + (x < 50 ? -5 : 5), 96, 3.4, ['#ffcd3c', '#e2402f', '#2fb5ff', '#16c47a'][j], 1.6); });
      return [b, P('M29 45Q28 18 50 17Q72 18 71 45Q66 28 50 26Q34 28 29 45Z', h) + L('M50 17v9M38 21v6M62 21v6', '#7a6a5e', 1.6)];
    }
    case 'topbun': return [C(50, 10, 11, h, 3.2), P('M29 45Q28 18 50 17Q72 18 71 45Q64 30 50 29Q36 30 29 45Z', h) + `<rect x="42" y="16" width="16" height="6" rx="2" fill="#e2402f" ${S(2.2)}/>` + C(46, 19, 1.2, '#fff') + C(54, 19, 1.2, '#fff')];
    case 'pixie': return ['', P('M28 48Q22 21 40 15Q58 9 71 19Q79 30 73 48L68 37L62 42L60 32L52 40L48 30L42 40L37 33L32 42Z', h, 3.2) + sh(42, 18, 60, 15)];
    case 'hime': return [P('M25 42Q21 12 50 12Q79 12 75 42L77 96L23 96Z', h), P('M28 41Q27 16 50 16Q73 16 72 41Z', h) + SYM(P('M28 38L27 80L36 80L34 42Z', h, 2.8)) + sh(38, 23, 56, 20)];
    case 'bangs': return ['', P('M30 44Q29 22 50 22Q71 22 70 44L66 36L62 42L58 34L52 41L48 34L42 41L38 35L34 42Z', h)];
    case 'twin': return [SYM(P('M30 24Q8 22 6 48Q4 72 16 92Q16 72 22 58Q26 44 33 36Z', h, 3.2) + C(28, 24, 4.6, '#ffcd3c', 2)), P('M29 47Q27 17 50 16Q73 17 71 47Q68 33 60 30L56 38L50 30L44 38L40 30Q32 33 29 47Z', h)];
    // ---- added for the 200-cast ----
    case 'pigtails': return [SYM(P('M31 46Q13 48 11 68Q10 84 18 94Q20 78 25 68Q30 58 33 52Z', h, 3.2) + C(30, 49, 4, '#ff4fa0', 2)), P('M29 46Q27 17 50 16Q73 17 71 46Q67 32 58 29Q52 36 40 35Q33 37 29 46Z', h) + sh(38, 22, 56, 19)];
    case 'sideshave': return ['', PF('M71 44Q71 26 60 22L60 31Q67 35 70 44Z', 'rgba(0,0,0,.18)') + L('M63 27l4 2-3 3 4 2', d, 1.4) + P('M66 30Q56 10 35 13Q19 20 24 46Q22 64 28 82Q31 60 36 44Q44 32 56 34Q62 33 66 30Z', h, 3.2) + sh(36, 18, 54, 16)];
    case 'long': return [P('M25 42Q21 12 50 12Q79 12 75 42L80 98H20Z', h), P('M28 47Q26 15 50 15Q74 15 72 47Q66 27 50 24Q34 27 28 47Z', h) + SYM(P('M29 42Q25 62 27 84L33 82Q31 62 34 46Z', h, 2.6)) + L('M50 15v8', d, 2) + sh(36, 24, 46, 19)];
    case 'curlybob': case 'longcurly': {
      const lc = k === 'longcurly', pt = lc ? [[28, 18], [40, 11], [50, 9], [60, 11], [72, 18], [20, 30], [80, 30], [16, 44], [84, 44], [15, 58], [85, 58], [17, 72], [83, 72], [21, 86], [79, 86]] : [[30, 24], [40, 16], [50, 14], [60, 16], [70, 24], [25, 36], [75, 36], [23, 49], [77, 49], [25, 62], [75, 62], [31, 72], [69, 72]];
      return [pt.map(([x, y]) => C(x, y, lc ? 10 : 9, h, 3)).join('') + PF(lc ? 'M18 34Q50 2 82 34L82 90H18Z' : 'M23 44Q23 15 50 15Q77 15 77 44Q77 73 50 73Q23 73 23 44Z', h), P('M28 46Q24 18 50 16Q76 18 72 46Q70 38 64 40Q62 32 56 36Q52 28 46 35Q40 30 37 39Q32 36 28 46Z', h) + L('M36 24q3-3 6-2M56 21q3-3 6-1', '#fff', 1.6, ' opacity=".5"')];
    }
    case 'topknot': return [C(50, 9, 7.5, h, 3) + P('M44 14h12l-1 5H45Z', '#e2402f', 2), PF('M28 44Q28 30 34 24L34 36Q30 38 28 44ZM72 44Q72 30 66 24L66 36Q70 38 72 44Z', 'rgba(0,0,0,.18)') + P('M33 38Q32 18 50 17Q68 18 67 38Q60 30 50 30Q40 30 33 38Z', h) + L('M40 28Q44 21 50 19M60 28Q56 21 50 19', d, 1.4)];
    case 'wolf': return [P('M24 42Q18 14 50 12Q82 14 76 42L80 62L73 59L77 76L69 70L68 82L60 74H40L32 82L31 70L23 76L27 59L20 62Z', h, 3.2), P('M28 48Q24 18 50 16Q76 18 72 48L68 38L64 45L60 34L54 42L50 32L46 42L40 34L36 45L32 38Z', h) + sh(38, 22, 56, 19)];
    case 'mullet': return [P('M30 46Q18 58 17 82Q27 87 35 80H65Q73 87 83 82Q82 58 70 46Z', h, 3.2), P('M28 45Q26 18 50 16Q74 18 72 45Q70 32 63 30L58 35L54 28L48 34L42 28L37 34Q31 34 28 45Z', h) + sh(40, 21, 58, 19)];
    case 'spacebuns': return [SYM(P('M27 26Q12 42 17 70Q22 54 31 40Z', h, 2.8) + C(30, 19, 9.5, h, 3.2) + L('M24 14q6-4 12 0', '#fff', 1.6, ' opacity=".5"') + `<rect x="24" y="25" width="11" height="4.4" rx="2" fill="#21d8c8" ${S(1.6)} transform="rotate(-20 30 27)"/>`), P('M29 45Q28 18 50 17Q72 18 71 45Q66 28 50 26Q34 28 29 45Z', h) + L('M50 17v9', d, 2) + SYM(P('M33 34Q27 44 31 55L34 53Q32 45 37 39Z', h, 2))];
    case 'drills': {
      let b = '';
      for (let i = 0; i < 6; i++) b += `<ellipse cx="${N(22 - i * .6)}" cy="${40 + i * 9}" rx="${N(8.4 - i * .7)}" ry="5.8" fill="${h}" ${S(2.6)}/>`;
      return [P('M26 42Q22 14 50 13Q78 14 74 42L72 60H28Z', h) + SYM(b + P('M22 31L11 24L12 38Z', '#ff4fa0', 2) + P('M22 31L33 24L32 38Z', '#ff4fa0', 2) + C(22, 31, 2.8, '#ffcd3c', 1.6)), P('M28 44Q27 16 50 16Q73 16 72 44L66 40L60 42L54 39L50 42L46 39L40 42L34 40Z', h) + sh(38, 22, 56, 19)];
    }
    case 'cornrows': return ['', P('M28 44Q27 18 50 17Q73 18 72 44Q66 33 50 33Q34 33 28 44Z', h) + SYM(L('M32 40Q33 27 42 19M41 35Q42 25 46 18', d, 2.2, ' stroke-dasharray="2.4 1.4"')) + L('M50 33V17', d, 2.2, ' stroke-dasharray="2.4 1.4"')];
    case 'flattop': return ['', P('M28 46L27 12H73L72 46Q66 31 50 31Q34 31 28 46Z', h) + L('M33 17h34M33 22h34', d, 1.2, ' opacity=".6"')];
    case 'curtains': return ['', P('M27 50Q23 15 50 14Q77 15 73 50Q70 34 57 28Q52 27 50 31Q48 27 43 28Q30 34 27 50Z', h) + L('M50 15v14', d, 1.6) + sh(34, 26, 44, 19)];
    case 'sidepart': return ['', P('M27 46Q24 16 46 14Q74 12 74 44Q72 30 63 27Q50 24 40 26Q32 32 27 46Z', h) + L('M40 16Q39 21 40 26', d, 2) + L('M44 19Q58 15 68 22', '#fff', 1.6, ' opacity=".6"')];
    case 'puff': {
      let b = '';
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b += C(N(50 + Math.cos(a) * 15), N(11 + Math.sin(a) * 9), 8, h, 3); }
      return [b + `<ellipse cx="50" cy="11" rx="16" ry="11" fill="${h}"/>`, P('M28 44Q27 18 50 17Q73 18 72 44Q66 30 50 29Q34 30 28 44Z', h) + L('M36 26Q43 20 50 19M64 26Q57 20 50 19', d, 1.4) + `<rect x="41" y="15" width="18" height="5" rx="2" fill="#ffcd3c" ${S(2)}/>`];
    }
    case 'emo': return [P('M26 46Q22 18 50 16Q78 18 74 46L76 70Q70 72 66 66H34Q30 72 24 70Z', h), P('M28 48Q24 15 50 14Q78 16 74 46L73 66Q67 64 64 54Q60 42 50 37Q40 34 30 42Z', h) + sh(40, 20, 60, 18)];
    case 'bowl': return ['', P('M26 48Q22 14 50 14Q78 14 74 48Q72 42.5 69 42.5H31Q28 42.5 26 48Z', h) + L('M36 22q14-6 28 0', '#fff', 1.6, ' opacity=".5"')];
    case 'sidepony': return [P('M34 24Q12 22 10 48Q9 70 20 90Q22 70 25 56Q28 42 36 32Z', h, 3.2) + C(31, 27, 4.6, '#ffcd3c', 2), P('M29 47Q27 17 50 16Q73 17 71 47Q68 33 60 30Q50 34 40 30Q32 33 29 47Z', h) + sh(48, 21, 64, 22)];
  }
  return ['', ''];
}
function brows(t, f) {
  if (f) {
    const b = t === 'worry' ? 'M34 42Q40 37 46 40' : t === 'arch' ? 'M33 43Q36 34 46 38.4' : t === 'low' ? 'M33 43.4Q40 41 46 42.6' : 'M33 42Q39 36 46 39';
    return SYM(L(b, INK, 3));
  }
  if (t === 'uni') return P('M30 42Q40 36 50 41Q60 36 70 42L70 45.6Q60 40.4 50 44.6Q40 40.4 30 45.6Z', INK, 1.4);
  const D = { angry: 'M30 39L46 44L45 47.5L29.5 43Z', up: 'M31 41Q38 34 46 38L45 41Q38 38 32 44Z', flat: 'M31 40H46V44H31Z', worry: 'M31 43L46 38L46.5 41.5L32 46Z', thick: 'M30 42Q38 33 47 37.6L46.6 43.4Q38 39.6 31 46.4Z' };
  return SYM(P(D[t], INK, 1.4));
}
/* left eye at (40,52); mirrored for the right one (iris2 = mismatched colour) */
function eye(t, ir, f, sk) {
  const lash = f ? L('M32.5 50.5l-3.8-2.6M33.8 47.6l-2.6-3.6M37 45.5l-1-4', INK, 2.2) : '';
  const iris = (cx, cy, r) => C(cx, cy, r, ir, 1.4) + `<circle cx="${cx}" cy="${cy}" r="${(r * .62).toFixed(1)}" fill="none" stroke="${dk(ir, .6)}" stroke-width="1.1"/>` + C(cx, cy, r * .34, INK) + C(cx - r * .38, cy - r * .4, r * .26, '#fff');
  switch (t) {
    case 'round': return `<ellipse cx="40" cy="52.5" rx="${f ? 7 : 6.4}" ry="${f ? 7.6 : 6.8}" fill="#fff" ${S(2)}/>` + iris(41, 53, f ? 4.8 : 4.3) + L(f ? 'M32.4 51Q40 42.6 47.6 50.4' : 'M33.2 50.5Q40 44.4 46.8 50', INK, 3.4) + lash;
    case 'sleepy': return P('M32.5 51.5Q40 50.5 47.5 51.5Q46.5 59.5 40 59.8Q33.5 59.5 32.5 51.5Z', '#fff', 2) + iris(40.8, 54.6, 4.4) + PF('M31 51.6Q40 50 49 51.6V45H31Z', sk) + L('M31.6 51.8Q40 49.4 48.4 51.6', INK, 3.6) + (f ? L('M32 52l-4 1.2M33 53.4l-3.6 2.4', INK, 2) : '') + L('M34 47q6-2 12 0', INK, 1.2, ' opacity=".45"');
    case 'spiral': return `<ellipse cx="40" cy="52.5" rx="7.4" ry="7.8" fill="#fff" ${S(2)}/>` + C(40.5, 53, 5.4, ir, 1.4) + `<circle cx="40.5" cy="53" r="3.9" fill="none" stroke="#fff" stroke-width="1.1"/><circle cx="40.5" cy="53" r="2.6" fill="none" stroke="${INK}" stroke-width="1.1"/>` + C(40.5, 53, 1.2, INK) + L('M32.4 51Q40 42.4 47.6 50.4', INK, 3.2) + lash;
    case 'mean': return P('M32.5 50L47.5 53.5Q46 59 40 59Q34 58 32.5 50Z', '#fff', 2) + C(41, 55, 3.7, ir, 1.2) + C(41, 55, 1.4, INK) + C(39.8, 53.8, .9, '#fff') + L('M31 49L48.5 53.5', INK, 3.8) + (f ? L('M31.6 49.2l-3.6-2M33.2 49.6l-2.4-3.2', INK, 2) : '');
    case 'wink': return L('M32.6 54Q40 46 47.4 54', INK, 3.6) + (f ? L('M33.6 51.2l-3.6-2.4M35.6 48.8l-2.2-3.4M39 47.4l-.6-3.8', INK, 2) : '');
    case 'dot': return `<ellipse cx="40" cy="53" rx="5.4" ry="5" fill="#fff" ${S(2)}/>` + C(40.5, 53.5, 1.8, INK) + L('M34 50.4Q40 46.4 46 50', INK, 2.6);
    case 'star': return `<ellipse cx="40" cy="52.5" rx="7.2" ry="7.8" fill="#fff" ${S(2)}/>` + C(40.8, 53, 5, ir, 1.4) + star(40.8, 53, 3.6, '#fff', .9) + L('M32.4 51Q40 42.4 47.6 50.4', INK, 3.4) + lash;
    case 'heart': return `<ellipse cx="40" cy="52.5" rx="7" ry="7.4" fill="#fff" ${S(2)}/>` + heart(40.6, 53.4, 3.6, ir, 1.2) + C(38.6, 51.4, 1.1, '#fff') + L('M32.4 51Q40 42.6 47.6 50.4', INK, 3.4) + lash;
    case 'happy': return L('M33 50.4Q40 58.4 47 50.4', INK, 3.6) + (f ? L('M33.4 51.2l-3.8-1.2M34.4 53.6l-3.4 1.8', INK, 2) : '');
    case 'big': return `<ellipse cx="40" cy="52" rx="8" ry="9" fill="#fff" ${S(2)}/>` + C(40.8, 53, 6, ir, 1.4) + C(40.8, 53.6, 3, INK) + C(38.4, 50.6, 2, '#fff') + C(43, 56, 1, '#fff') + L('M31.6 50Q40 40.6 48.4 49.6', INK, 3.6) + lash;
    case 'tired': return `<ellipse cx="40" cy="53" rx="6.4" ry="5.6" fill="#fff" ${S(2)}/>` + C(40.6, 54, 3.4, ir, 1.2) + C(40.6, 54, 1.3, INK) + PF('M33 52.2Q40 49 47.4 51V46H33Z', sk) + L('M33 51.6Q40 49.4 47.4 51.2', INK, 3.2) + L('M34 60.6Q40 63 46 60.4', dk(sk, .7), 1.6) + (f ? L('M33.4 51.4l-3.6-1.6', INK, 2) : '');
    case 'side': case 'sideR': return `<ellipse cx="40" cy="52.5" rx="6.6" ry="6.8" fill="#fff" ${S(2)}/>` + iris(t === 'side' ? 43 : 37.4, 53.2, 3.8) + L('M33.2 50.2Q40 44.6 46.8 50', INK, 3.2) + lash;
    case 'wide': return `<ellipse cx="40" cy="52" rx="7.4" ry="8.2" fill="#fff" ${S(2.2)}/>` + C(40.5, 53, 2.8, ir, 1) + C(40.5, 53, 1.1, INK) + L('M32 46.4Q40 40.6 48 46', INK, 2.2) + lash;
    case 'slit': return P('M32 52.5Q40 44 48 52.5Q40 61 32 52.5Z', '#fff', 2) + `<circle cx="40.5" cy="52.5" r="4.4" fill="${ir}" ${S(1.2)}/><ellipse cx="40.5" cy="52.5" rx="1.1" ry="3.6" fill="${INK}"/>` + C(39, 50.8, .9, '#fff') + L('M31.4 52Q40 43 48.6 51.6', INK, 3.2) + lash;
    case 'line': return L('M33 53Q40 51.4 47 53', INK, 3.6) + (f ? L('M33.6 52.6l-3.4-2.4M35.6 52l-2-3.2', INK, 2) : '');
  }
  return '';
}
function mouth(t, f) {
  const [k, c] = t.split(':');
  switch (k) {
    case 'fang': return L('M42 66Q50 70.5 58 64.5', INK, 3) + P('M45.2 67.3L46.8 71L48.4 67.9Z', '#fff', 1.4) + (f ? PF('M45 69q5 2.4 10 0', '#ff7aa2', ' opacity=".55"') : '');
    case 'tongue': return P('M40 63.5Q50 66 60 63.5Q58 74 50 74Q42 74 40 63.5Z', '#5a1d1d', 2.8) + PF('M41.5 64.4Q50 66.6 58.5 64.4L58 66.6Q50 68.6 42 66.6Z', '#fff') + P('M46 70Q45.5 80 51.5 80Q57 79.5 55.5 70Z', '#ff6f8f', 2.4) + L('M50.8 72v4.6', '#c8384a', 1.4);
    case 'grin': case 'gold': return P('M38.5 63Q50 66 61.5 63Q59 75 50 75Q41 75 38.5 63Z', '#fff', 2.8) + L('M39.5 68.6Q50 70.4 60.5 68.6M44.6 64.6v9M50 65v9.6M55.4 64.6v9', INK, 1.3) + (k === 'gold' ? PF('M50.6 65.2h4.2v3.2h-4.2z', '#ffcd3c') : PF('M41 64.4l2 3.4 1.6-3z', '#fff') + PF('M59 64.4l-2 3.4-1.6-3z', '#fff'));
    case 'grit': return `<rect x="39" y="62.5" width="22" height="9" rx="3" fill="#fff" ${S(2.8)}/>` + L('M39 67h22M44.5 62.5v9M50 62.5v9M55.5 62.5v9', INK, 1.3);
    case 'shout': return P('M40 62Q50 59 60 62Q59 78 50 78Q41 78 40 62Z', '#5a1d1d', 2.8) + PF('M41.6 63Q50 61 58.4 63L58 65.6H42Z', '#fff') + PF('M44.6 74.6Q50 70 55.4 74.6Q50 77.6 44.6 74.6Z', '#ff6f8f');
    case 'smug': return L('M42 67Q49 68.6 58 63.6', INK, 3.2) + L('M41 65.6l1.4 1.6', INK, 2);
    case 'frown': return L('M42 69.5Q46 65 50 67.6Q54 65 58 69.5', INK, 3);
    case 'o': return `<ellipse cx="50" cy="67.5" rx="3.6" ry="4.4" fill="#5a1d1d" ${S(2.4)}/>`;
    case 'lips': { const lc = c || '#e0344d'; return P('M41.5 66Q46 61.6 50 64Q54 61.6 58.5 66Q55 72.4 50 72.6Q45 72.4 41.5 66Z', lc, 2.4) + L('M42.6 66.2Q50 67.4 57.4 66', INK, 1.4) + L('M45 69.4q2 1 4 1', '#fff', 1.4, ' opacity=".7"'); }
    case 'bubble': return C(55, 68.5, 8.4, '#ff8fc0', 2.6) + L('M51.6 65q2.4-2.4 4.6-1.6', '#fff', 2) + L('M43 67q2 1 4 .4', INK, 2.4);
    case 'cat': return L('M42.5 65.4Q46 69.6 50 65.6Q54 69.6 57.5 65.4', INK, 2.8) + P('M52.6 66.8L53.8 70L55 67.2Z', '#fff', 1.2);
    case 'buck': return P('M46 66.2h8v4.6Q50 72 46 70.8Z', '#fff', 1.4) + L('M50 66.8v4.2', INK, 1.1) + L('M41 64Q50 70 59 64', INK, 3);
    case 'smile': return P('M41 64Q50 66 59 64Q57 72.6 50 72.6Q43 72.6 41 64Z', '#5a1d1d', 2.6) + PF('M45 70.4Q50 66.6 55 70.4Q50 72.8 45 70.4Z', '#ff6f8f');
    case 'wavy': return L('M41 67q2.25-3 4.5 0t4.5 0t4.5 0t4.5 0', INK, 2.6);
    case 'flat': return L('M43 67.4H57', INK, 3) + L('M57.4 66l1.4-1', INK, 1.8);
    case 'gap': return P('M39 63Q50 66 61 63Q59 74 50 74Q41 74 39 63Z', '#fff', 2.8) + PF('M48.6 64.8h2.8v8.6h-2.8z', '#5a1d1d') + L('M40 67.6Q50 69.2 60 67.6', INK, 1.2);
    case 'whistle': return `<ellipse cx="53" cy="67" rx="2.6" ry="2.6" fill="#5a1d1d" ${S(2.2)}/>` + L('M59 63.6l3.4-2M59.6 67.4h3.6M59 71l3.4 1.8', INK, 1.5);
    case 'bite': return L('M42 66Q50 69.4 58 66', INK, 3) + P('M47 67.2h6v2.4Q50 70.6 47 69.6Z', '#fff', 1.3);
    case 'braces': return P('M39 63Q50 66 61 63Q59 74 50 74Q41 74 39 63Z', '#fff', 2.8) + L('M40.4 67.4Q50 69.6 59.6 67.4', '#8d96a8', 2.2) + [43.4, 47.6, 52.4, 56.6].map(x => `<rect x="${x - 1.1}" y="66.6" width="2.2" height="2.2" fill="#d9dde6" ${S(.8)}/>`).join('');
    case 'ohno': return P('M42 71Q42 62 50 62Q58 62 58 71Q50 68.6 42 71Z', '#5a1d1d', 2.6) + PF('M44.6 64.2Q50 62.6 55.4 64.2L55 66H45Z', '#fff');
    case 'kiss': return L('M47.4 63.4Q52.4 63.8 50.8 66.6Q53.8 67.6 51.6 70.2Q49.8 71.2 47.4 70.4', INK, 2.6);
    case 'smirk': return P('M43 66Q51 69 58.4 62.6L57.8 66.4Q51 71.6 44.4 67.6Z', '#fff', 2.2);
  }
  return '';
}
/* accessories under the hair ('u') or on top of everything */
const UNDER = ['beard', 'stubble', 'freckles', 'blush', 'mole', 'scarEye', 'scarN', 'soot', 'starTat', 'boltTat', 'flameTat', 'burns', 'cyber', 'starSt', 'heartSt', 'tear', 'warpaint', 'dots3', 'cheekHeart', 'goatee', 'soulpatch', 'chinstrap'];
function acc(a, I, u, F) {
  const [k, arg] = a.split('='), hc = base(I.c2), args = (arg || '').split('/').length > 2 ? [arg] : (arg || '').split('/');
  switch (k) {
    // under hair
    case 'beard': return P('M28 52Q29 72 40 82Q50 90 60 82Q71 72 72 52Q66 63 58 62Q50 59 42 62Q34 63 28 52Z', hc, 2.8) + L('M36 72l2 3M46 78l1 3M56 77l-1 3M64 70l-2 3', '#5a4a40', 1.4);
    case 'stubble': return PF('M30 60Q33 77 44 81H56Q67 77 70 60Q62 72 50 72Q38 72 30 60Z', INK, ' opacity=".16"') + [[37, 74], [43, 77], [57, 77], [63, 74], [35, 69], [65, 69], [50, 78]].map(([x, y]) => C(x, y, .9, INK)).join('');
    case 'freckles': return [[34, 60], [37, 62], [40, 60], [60, 60], [63, 62], [66, 60]].map(([x, y]) => C(x, y, 1.1, '#c0602d')).join('');
    case 'blush': return SYM(`<ellipse cx="35" cy="61" rx="4.6" ry="2.6" fill="#ff7aa2" opacity=".6"/>` + L('M33 62l1.6-2.4M36 62l1.6-2.4', '#e0446a', 1.2));
    case 'mole': return C(61, 66, 1.5, INK);
    case 'scarEye': return L('M37 38L44 62', '#c0392b', 2.6) + L('M37 44l4.4-1M39 50l4.4-1M41 56l4.4-1', '#c0392b', 1.4);
    case 'scarN': return L('M37 56L63 61', '#c0392b', 2.6) + L('M43 55l-1 4M50 56.4l-1 4M57 57.8l-1 4', '#c0392b', 1.4);
    case 'soot': return PF('M32 61q5-4 9 1q-4 4-9-1zM60 29q6-2 8 3q-5 2-8-3z', INK, ' opacity=".35"');
    case 'starTat': return star(64, 62, 3.6, '#2f8fff', 1.2);
    case 'starSt': return star(64, 62.5, 3.8, '#ffcd3c', 1.4);
    case 'heartSt': return heart(64, 62.5, 2.8, '#e2402f', 1.2);
    case 'boltTat': return bolt(62, 30, 6, '#ffcd3c', 1.8);
    case 'flameTat': return flame(38, 34, 4.2, '#ff7a1a', '#ffcd3c') + flame(62, 34, 4.2, '#ff7a1a', '#ffcd3c') + flame(50, 30, 5, '#e2402f', '#ffcd3c');
    case 'burns': return SYM(PF('M28 42h6v14l-6 3z', hc));
    case 'cyber': return `<g clip-path="url(#hc${u})">${PF('M51 10Q57 50 51 90H100V10Z', '#b9c6d6')}${PF('M64 10Q72 50 64 90H100V10Z', '#93a6bb')}${L('M51 10Q57 50 51 90', INK, 2.8)}${[[56, 38], [58, 66], [63, 74]].map(([x, y]) => C(x, y, 1.6, '#5d6575')).join('')}${L('M56 72h10M60 72v8', '#5d6575', 1.6)}</g>`;
    // over
    case 'bandaid': return `<g transform="rotate(-25 63 63)"><rect x="56" y="60" width="15" height="6.5" rx="2.5" fill="#ffd6a8" ${S(1.8)}/><rect x="61.5" y="60.6" width="4" height="5.3" fill="#e9b07e"/></g>`;
    case 'bandaidN': return `<g transform="rotate(-12 50 59)">${P('M40 56h20v6H40z', '#ffd6a8', 1.8)}${L('M44 59h-.1M56 59h-.1', '#c98d63', 1.6)}</g>`;
    case 'glasses': return SYM(`<circle cx="40" cy="52.5" r="9" fill="rgba(255,255,255,.22)" ${S(3)}/>` + L('M35 48.5l3.4-2', '#fff', 1.6)) + L('M49 52h2', INK, 3);
    case 'sweat': return P('M77 30Q83 40 77 44Q71 40 77 30Z', '#9fe0ff', 2.2) + L('M76 37v2.4', '#fff', 1.4);
    case 'hoops': return SYM(`<circle cx="27" cy="64" r="5.4" fill="none" stroke="${INK}" stroke-width="4.6"/><circle cx="27" cy="64" r="5.4" fill="none" stroke="#ffcd3c" stroke-width="2.2"/>`);
    case 'hoop1': return `<circle cx="27" cy="63" r="4.4" fill="none" stroke="${INK}" stroke-width="4.2"/><circle cx="27" cy="63" r="4.4" fill="none" stroke="#ffcd3c" stroke-width="2"/>`;
    case 'studs': return SYM(C(27, 58, 2.4, '#ffcd3c', 1.4) + C(26, 52, 1.8, '#d9dde6', 1.2));
    case 'pinEar': return `<g transform="rotate(20 74 60)"><rect x="70" y="56" width="10" height="4" rx="2" fill="#d9dde6" ${S(1.4)}/>${C(80, 58, 1.8, '#d9dde6', 1.2)}</g>`;
    case 'nosering': return L('M51.8 61a3 3 0 1 0 3.6 2.6', INK, 3) + L('M51.8 61a3 3 0 1 0 3.6 2.6', '#d9dde6', 1.6);
    case 'toothpick': return L('M57 66L73 59', INK, 4.2) + L('M57 66L73 59', '#f0d28a', 2);
    case 'mustache': return P('M38 64Q43 57 50 61Q57 57 62 64Q58 66.4 50 63.8Q42 66.4 38 64Z', hc, 2.2);
    case 'goggles': return L('M26 31Q50 23 74 31', INK, 6) + L('M26 31Q50 23 74 31', '#e2402f', 3) + SYM(C(39, 28, 8, '#ffcd3c', 2.8) + C(39, 28, 5, '#7fe0ff', 1.6) + L('M36.4 26.4l2.2-2.2', '#fff', 1.8));
    case 'eyepatch': return L('M29 33L37 46M47 49L73 54', INK, 2.8) + `<path d="M32 47Q40 42 48 47Q47 60 40 60Q33 60 32 47Z" fill="${INK}"/>` + C(40, 52.5, 2.4, '#e2402f') + L('M35 48q4-2.4 8-1', '#5d6575', 1.6);
    case 'shades': return SYM(P('M29 47H48Q48.5 58 40 58.6Q30.5 58.6 29 47Z', '#1d1a17', 2.6) + L('M32 50l5-2.4M33 54l3-1.4', '#ff4fa0', 1.8)) + L('M48 48.4h4', INK, 3) + L('M27 47h3M70 47h3', INK, 2.6);
    case 'band': return P('M27 34Q50 26 73 34L73 41Q50 33 27 41Z', F(arg), 2.6);
    case 'pick': return `<g transform="rotate(16 74 20)">${P('M70 8h10v7H70z', '#e2402f', 2)}${L('M72 15v7M75 15v7M78 15v7', INK, 1.6)}${heart(75, 11, 2, '#fff', .8)}</g>`;
    case 'tails': return P('M27 34Q50 26 73 34L73 41Q50 33 27 41Z', F('dot/#e2402f/#fff/5/0'), 2.6) + P('M72 35Q86 31 98 20L97 31Q87 39 73 39Z', '#e2402f', 2.4) + P('M72 38Q85 41 94 48L86 52Q80 46 72 41Z', '#b8322f', 2.4);
    case 'clip': return `<g transform="rotate(-20 36 30)"><rect x="29" y="27" width="14" height="6" rx="2" fill="${F(arg)}" ${S(2)}/></g>`;
    case 'hearts': return heart(22, 14, 3.2, '#ff4fa0') + heart(80, 12, 2.6, '#ff4fa0');
    case 'spoon': return `<g transform="rotate(28 58 8)">${L('M58 -6V20', INK, 4.4)}${L('M58 -6V20', '#d9dde6', 2.2)}<ellipse cx="58" cy="-6" rx="4" ry="5.4" fill="#d9dde6" ${S(2)}/></g>`;
    case 'scarf': return P('M26 34Q24 10 50 9Q76 10 74 34Q50 28 26 34Z', F(arg), 2.8) + P('M27 32Q16 44 14 56L22 58Q24 46 30 37Z', F(arg), 2.4) + C(27, 34, 3.6, '#ff4fa0', 2);
    case 'beanie': return P('M25 40Q23 7 50 7Q77 7 75 40Z', F(arg), 3) + P('M23 32Q50 26 77 32V42Q50 36 23 42Z', '#e2402f', 2.8) + L('M30 32.4v8M36 31v8M42 30v8M48 29.6v8M54 29.6v8M60 30v8M66 31v8M72 32.4v8', INK, 1.1, ' opacity=".5"') + C(50, 5, 6.2, '#fff7e0', 2.6) + L('M47 3q2-1.6 4 0', '#e2402f', 1.4);
    case 'bucket': return P('M30 34Q30 8 50 8Q70 8 70 34Z', F(arg), 3) + P('M17 40Q50 26 83 40L80 46Q50 34 20 46Z', F(arg), 3) + L('M30 33Q50 27 70 33', INK, 2.4) + `<rect x="57" y="14" width="10" height="8" rx="1" fill="#ffcd3c" ${S(1.6)}/>` + stitch('M58.6 15.6h6.8M58.6 20.4h6.8', 1);
    case 'cap': return P('M21 37Q16 11 46 7L52 35Z', F('str/#e2402f/#2a2622/6/90'), 3) + P('M46 7Q84 8 80 35L52 35Z', F('dot/#2f4d9a/#fff/6/0'), 3) + stitch('M47 9L51.4 34', 1.6)
      + P('M18 39Q50 30 82 37L80 44Q50 37 20 46Z', '#ffcd3c', 2.8) + `<rect x="27" y="17" width="16" height="10" rx="1.4" fill="#fff" ${S(1.8)} transform="rotate(-8 35 22)"/><text x="35" y="25" font-size="7" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif" transform="rotate(-8 35 22)">${String(I.id + 1).padStart(3, '0')}</text>`
      + C(70, 22, 6.4, '#ff8a3d', 2.4) + L('M67.6 19.6l4.8 4.8M72.4 19.6l-4.8 4.8', INK, 1.8);
    case 'phones': { const [c1, c2] = args; return L('M23 46Q20 10 50 9Q80 10 77 46', INK, 7.6) + L('M23 46Q20 10 50 9Q80 10 77 46', c1, 3.6) + SYM(`<rect x="15" y="40" width="14" height="22" rx="6" fill="${c2}" ${S(3)}/>` + `<rect x="18.6" y="44" width="6.8" height="14" rx="3" fill="${c1}" ${S(1.6)}/>`) + bolt(22, 51, 4.4, '#fff', 1.2); }
    case 'hood': case 'ehood': return '';
    // ---- added for the 200-cast: face marks / facial hair (under) ----
    case 'tear': return P('M35 60Q37.6 64 35 66.4Q32.4 64 35 60Z', args[0] || 'none', 1.4);
    case 'warpaint': return SYM(L('M33 61.4h8M34 64.8h6', args[0] || '#e2402f', 2.4));
    case 'dots3': return C(67, 59, 1.2, INK) + C(64.4, 62.4, 1.2, INK) + C(67.6, 65, 1.2, INK);
    case 'cheekHeart': return heart(64, 63, 2.8, 'none', 1.3);
    case 'goatee': return P('M44 72Q50 70 56 72Q56 80 50 82.4Q44 80 44 72Z', hc, 2.2);
    case 'soulpatch': return P('M47.6 72.6h4.8l-1.2 5h-2.4Z', hc, 1.6);
    case 'chinstrap': return P('M28 52Q29 72 40 80Q50 86 60 80Q71 72 72 52L69 52Q68 70 58 76.4Q50 80.4 42 76.4Q32 70 31 52Z', hc, 2);
    // over
    case 'handlebar': return P('M38 64Q43 58 50 61.4Q57 58 62 64Q66 62 67 57.6Q69 64.6 62 66.4Q57 66.4 50 63.8Q43 66.4 38 66.4Q31 64.6 33 57.6Q34 62 38 64Z', hc, 2);
    case 'xband': return [45, -45].map(r => `<rect x="56" y="59.6" width="14" height="5" rx="2" fill="#fff" ${S(1.6)} transform="rotate(${r} 63 62)"/>`).join('');
    case 'browcut': return L('M62.4 37l-2.2 8.6M65.6 37.8l-2.2 8.6', I.c, 1.6);
    case 'lipring': return `<circle cx="55.4" cy="71.8" r="2.4" fill="none" stroke="${INK}" stroke-width="2.8"/><circle cx="55.4" cy="71.8" r="2.4" fill="none" stroke="#d9dde6" stroke-width="1.3"/>`;
    case 'browring': return `<circle cx="66" cy="40.6" r="2.4" fill="none" stroke="${INK}" stroke-width="2.8"/><circle cx="66" cy="40.6" r="2.4" fill="none" stroke="#ffcd3c" stroke-width="1.3"/>`;
    case 'sparkle': return star(13, 30, 5, '#fff', 1.4) + star(87, 40, 4, '#ffcd3c', 1.4) + star(84, 8, 3, '#ff4fa0', 1.2);
    // ear / mouth / neck items (the "main accessory")
    case 'lolly': return L('M56 68L69 75', INK, 3.6) + L('M56 68L69 75', '#fff', 1.8) + C(72, 77, 5.4, F(arg || 'str/#ff4fa0/#fff/3/45'), 2.4);
    case 'pencil': return `<g transform="rotate(-20 22 46)"><rect x="20" y="36" width="5" height="20" fill="#ffcd3c" ${S(1.6)}/><path d="M20 56l2.5 5 2.5-5z" fill="#f2c9a0" ${S(1.4)}/><rect x="20" y="32.6" width="5" height="3.4" fill="#ff8fb0" ${S(1.4)}/></g>`;
    case 'flower': return [0, 72, 144, 216, 288].map(a => C(N(25 + Math.cos(a * Math.PI / 180) * 4.6), N(41 + Math.sin(a * Math.PI / 180) * 4.6), 3.6, args[0] || '#ff4fa0', 1.6)).join('') + C(25, 41, 2.4, '#ffcd3c', 1.4);
    case 'cuff': return L('M23.6 49.6q-2.6 4 .2 8.4', INK, 4.2) + L('M23.6 49.6q-2.6 4 .2 8.4', '#d9dde6', 2) + L('M24 58Q21 66 27 70', INK, 1.3, ' stroke-dasharray="1.4 1"') + C(27, 70, 1.6, '#d9dde6', 1);
    case 'dangle': return SYM(L('M27 60v4', INK, 1.6) + bolt(27, 68, 4, args[0] || '#ffe600', 1.2));
    case 'dice': return SYM(L('M27 60v4', INK, 1.6) + `<rect x="23.6" y="64" width="7" height="7" rx="1.4" fill="#fff" ${S(1.4)}/>` + C(27, 67.5, 1, INK));
    case 'cherry': return SYM(L('M27 59.6Q28 63 26 66M27 59.6Q29 64 30.4 67', '#2a7a3a', 1.4) + C(25.6, 68, 2.6, '#e2402f', 1.2) + C(30.4, 69, 2.6, '#e2402f', 1.2));
    case 'neckph': { const [c1, c2] = args; return L('M28 80Q50 94 72 80', INK, 5.4) + L('M28 80Q50 94 72 80', c1, 2.4) + SYM(`<rect x="22" y="73" width="12" height="15" rx="5" fill="${c2}" ${S(2.4)}/>`); }
    // eyewear
    case 'square': return SYM(`<rect x="31" y="46" width="17.4" height="13" rx="2.4" fill="rgba(255,255,255,.22)" stroke="${INK}" stroke-width="4.4"/><rect x="31" y="46" width="17.4" height="13" rx="2.4" fill="none" stroke="${arg || INK}" stroke-width="2"/>` + L('M34 49.4l3-2', '#fff', 1.6)) + L('M48.4 51h3.2', INK, 3) + L('M27 49h4M69 49h4', INK, 2.6);
    case 'starsh': return SYM(star(40, 52.5, 10.4, arg || '#ffcd3c', 2.4) + L('M36 49l3-2', '#fff', 1.8)) + L('M47 50h6', INK, 2.6);
    case 'heartsh': return SYM(heart(40, 54, 6.6, arg || '#ff4fa0', 2.4) + L('M35 50.4l3-2', '#fff', 1.6)) + L('M47 50h6', INK, 2.6);
    case 'monocle': return `<circle cx="60" cy="52.5" r="8.6" fill="rgba(255,255,255,.2)" stroke="${INK}" stroke-width="4.4"/><circle cx="60" cy="52.5" r="8.6" fill="none" stroke="#ffcd3c" stroke-width="2"/>` + L('M66.6 58Q73 68 66 82', '#ffcd3c', 1.4, ' stroke-dasharray="2 1"') + L('M55 48.4l3-2', '#fff', 1.6);
    case 'egog': return L('M25 52H75', INK, 7) + L('M25 52H75', args[0] || '#2f62d6', 3.4) + SYM(C(40, 52.5, 9.4, '#c7ccd6', 2.8) + C(40, 52.5, 6.6, args[1] || '#7fe0ff', 1.8) + L('M36 49l3-3', '#fff', 2));
    case 'visorsh': return P('M26 45H74V54Q74 60 62 60Q54 60 50 56Q46 60 38 60Q26 60 26 54Z', arg || '#21d8c8', 2.8) + L('M30 48.4h40', '#fff', 1.6, ' opacity=".6"') + L('M32 53l6-3M57 53l6-3', '#fff', 1.4);
    // headwear
    case 'beret': return P('M23 33Q18 15 44 12Q72 9 80 24Q80 33 71 34Q50 28 29 37Z', F(arg), 3) + L('M30 33Q50 26 72 31', INK, 1.4, ' opacity=".5"') + P('M44 12l1-5 3 .4-1 5Z', INK, 1.4);
    case 'sailor': return P('M31 33Q31 9 50 9Q69 9 69 33Z', '#fff', 3) + P('M23 33Q50 23 77 33L75 43Q50 33 25 43Z', '#fff', 3) + L('M25 37.6Q50 28.6 75 37.6', arg || '#2f62d6', 2.4);
    case 'wrap': return P('M26 40Q24 12 50 12Q76 12 74 40Q50 32 26 40Z', F(arg), 3) + P('M50 14Q38 2 33 10Q34 18 50 15Z', F(arg), 2.4) + P('M50 14Q62 2 67 10Q66 18 50 15Z', F(arg), 2.4) + C(50, 14, 3.4, F(arg), 2.2);
    case 'knit': { const [c1, c2] = args; return P('M58 7Q80 1 87 16Q77 15 67 13Z', c1, 2.6) + P('M25 40Q20 3 56 6Q80 10 75 40Z', c1, 3) + P('M23 32Q50 26 77 32V42Q50 36 23 42Z', c2, 2.8) + L('M30 33v8M37 31.6v8M44 30.6v8M51 30.4v8M58 30.6v8M65 31.6v8M72 33v8', INK, 1.1, ' opacity=".5"'); }
    case 'hband': { const [c1, t] = args; return t === 'bow' ? P('M27 33Q50 25 73 33L73 39Q50 31 27 39Z', c1, 2.6) + P('M34 30L23 20L25 37Z', c1, 2.2) + P('M34 30L45 20L43 37Z', c1, 2.2) + C(34, 30, 3, c1, 2)
        : P('M26 33Q50 24 74 33L74 42Q50 33 26 42Z', '#fff', 2.6) + L('M26.4 35.8Q50 27 73.6 35.8M26.4 39Q50 30.2 73.6 39', c1, 1.6); }
    case 'visor': return P('M27 35Q50 27 73 35L73 40Q50 32 27 40Z', arg, 2.4) + P('M20 40Q50 31 80 40Q78 48 50 45Q22 48 20 40Z', 'rgba(47,190,120,.72)', 2.6) + L('M28 42Q50 37 72 42', '#fff', 1.4, ' opacity=".5"');
    case 'cowboy': { const [c1, c2] = args; return P('M30 31Q26 6 40 8Q50 14 60 8Q74 6 70 31Z', c1, 3) + L('M30 28.6Q50 33.6 70 28.6', c2 || '#e2402f', 3) + P('M5 26Q14 40 50 37Q86 40 95 26Q94 45 50 45Q6 45 5 26Z', c1, 3) + L('M14 38Q50 44 86 38', '#fff', 1.2, ' opacity=".4"') + star(62, 28.4, 3, '#ffcd3c', 1.2); }
    case 'trucker': { const [c1, c2] = args, mesh = F(`dot/${c2}/#fff/3/0`); return P('M24 38Q22 11 50 10Q78 11 76 38Z', c1, 3) + SYM(PF('M24.6 37Q23 18 36 13L39 37Z', mesh)) + P('M40 38Q40 27 50 27Q60 27 60 38Z', F(I.c2), 2.4) + `<rect x="40" y="28.8" width="20" height="3.4" rx="1" fill="${c2}" ${S(1.4)}/>` + L('M50 10V26', INK, 1.4) + C(50, 10.6, 2.2, c1, 1.4); }
    case 'crown': return P('M27 36L24 10L35 21L42 4L50 18L58 4L65 21L76 10L73 36Q50 30 27 36Z', '#c7ccd6', 3) + L('M27 30Q50 24 73 30', '#9aa3b2', 1.4) + L('M30 16l3 14M46 10l2 19M60 10l-2 19', '#fff', 1.6, ' opacity=".6"') + C(42, 4, 3, '#ffcd3c', 1.6) + C(58, 4, 3, '#ff4fa0', 1.6) + C(24, 10, 2.6, '#2fb5ff', 1.4) + C(76, 10, 2.6, '#16c47a', 1.4) + C(50, 28.4, 3, '#e2402f', 1.6);
    case 'bow': return `<g transform="rotate(-14 68 22)">${P('M68 22L52 12L54 32Z', F(arg), 2.6)}${P('M68 22L84 12L82 32Z', F(arg), 2.6)}${C(68, 22, 4.4, F(arg), 2.4)}</g>`;
  }
  return '';
}
/* jumpsuit decoration (patterns, stitched patches, little kustom motifs) */
function deco(t, F, W) {
  const patch = (x, y, w, h, f, r = -8) => `<g transform="rotate(${r} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="${f}" ${S(2)}/>${stitch(`M${x + 1.8} ${y + 1.8}h${w - 3.6}v${h - 3.6}h${-(w - 3.6)}z`, 1)}</g>`;
  switch (t) {
    case 'dot': return patch(22, 86, 13, 11, F('dot/#2f62d6/#fff/4.4/0'));
    case 'chk': return PF(`M50 92L63 77Q${98 - W} 80 ${100 - W} 101H50Z`, F('chk/#1d1a17/#fff7e0/5/0'), ' opacity=".9"') + L(`M50 92L63 77Q${98 - W} 80 ${100 - W} 101`, INK, 2.6);
    case 'str': return PF(`M${W} 101Q${W + 2} 80 37 77L50 92V101Z`, F('str/#f26b1d/#ffb03d/5/90'));
    case 'patch': return patch(21, 85, 14, 12, '#5ec26a', 10) + L('M25 88l6 6M31 88l-6 6', INK, 1.8);
    case 'pin': return `<g transform="rotate(-30 42 84)">${L('M34 84h14', INK, 3.6)}${L('M34 84h14', '#d9dde6', 1.8)}${C(33, 84, 2.6, '#d9dde6', 1.6)}<path d="M48 82v4" stroke="${INK}" stroke-width="2.6"/></g>`;
    case 'heart': return heart(28, 91, 4.6, '#ff4fa0', 2);
    case 'star': return star(28, 91, 6, '#ffcd3c', 2);
    case 'bolt': return bolt(28, 91, 6.4, '#ffe600', 2);
    case 'flame': return flame(28, 99, 4.4, '#e2402f', '#ffcd3c') + flame(36, 99, 3.4, '#ff7a1a', '#ffe600');
    case 'chain': return L('M38 80Q50 92 62 80', INK, 4) + L('M38 80Q50 92 62 80', '#d9dde6', 2, ' stroke-dasharray="2.4 1.6"') + C(50, 90, 4.6, '#2a2622', 2) + L('M48 88.4l1.6-1', '#fff', 1.2);
    // ---- added for the 200-cast ----
    case 'pocket': return L('M24.6 85V76', INK, 4.2) + L('M24.6 85V77', '#ffcd3c', 2) + P('M19 84h14v12H19z', '#ff9a3c', 2) + L('M19 88h14', INK, 1.6);
    case 'zip': return L(`M50 92V101`, INK, 3.6) + L('M50 92.6V101', '#d9dde6', 1.6, ' stroke-dasharray="1.2 1.2"') + P('M48.4 94h3.2v4h-3.2z', '#d9dde6', 1.2);
    case 'tie': return P('M47.6 92L50 89.4L52.4 92L51.6 101H48.4Z', F('str/#2f62d6/#ffcd3c/3/45'), 1.8);
    case 'badge': return C(28, 90, 6.4, '#2fb5ff', 2) + C(28, 90, 3.6, '#fff', 1.4) + C(28, 90, 1.4, '#e2402f');
    case 'tape': return [30, -30].map(r => `<rect x="18" y="87.6" width="20" height="5" fill="#c7ccd6" ${S(1.6)} transform="rotate(${r} 28 90)"/>`).join('');
    case 'splat': return P('M27 83l1.6 4.6 4-3-1 5 5 .6-4 3.2 3 4-5-1.2-1 4.4-2.6-4-4 2 1-5-4.4-2 5-1.6z', '#2fd8c8', 1.6);
    case 'bands': return PF(`M${W + 1.2} 95Q50 92 ${98.8 - W} 95V101H${W + .4}Z`, INK, ' opacity=".82"') + PF(`M${W + 2.4} 89Q50 86 ${97.6 - W} 89V91.6Q50 88.6 ${W + 2} 91.6Z`, INK, ' opacity=".82"');
    case 'moon': return P('M30 83.4a7.4 7.4 0 1 0 6.4 11.4a6 6 0 1 1-6.4-11.4z', '#ffe600', 1.8);
    case 'dice': return `<g transform="rotate(-12 28 90)"><rect x="22" y="84" width="12" height="12" rx="2" fill="#fff" ${S(2)}/>${C(25, 87, 1.2, INK)}${C(28, 90, 1.2, INK)}${C(31, 93, 1.2, INK)}</g>`;
    case 'cherry': return L('M25 91Q27 84 32 83M31.4 92Q31 86 32 83', '#2a7a3a', 1.6) + C(25, 93.4, 3.4, '#e2402f', 1.6) + C(31.4, 94.4, 3.4, '#e2402f', 1.6);
  }
  return '';
}
function inmateSVG(id, opt = {}) {
  const I = INMATES[id] || INMATES[0], f = I.sex === 'f', sk = I.c, sd = dk(sk, .82), u = ++UID, A = I.acc, has = k => A.some(a => a.split('=')[0] === k);
  const defs = []; let pn = 0;
  const F = s => {
    if (!s || !s.includes('/')) return s;
    const [k, a, b, z = 6, r = 0] = s.split('/'), id = `p${u}_${pn++}`, h = z / 2;
    const inner = k === 'dot' ? `<rect width="${z}" height="${z}" fill="${a}"/><circle cx="${h}" cy="${h}" r="${z * .24}" fill="${b}"/>` : k === 'str' ? `<rect width="${z}" height="${z}" fill="${a}"/><rect width="${h}" height="${z}" fill="${b}"/>` : `<rect width="${z}" height="${z}" fill="${a}"/><rect width="${h}" height="${h}" fill="${b}"/><rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${b}"/>`;
    defs.push(`<pattern id="${id}" width="${z}" height="${z}" patternUnits="userSpaceOnUse" patternTransform="rotate(${r})">${inner}</pattern>`);
    return `url(#${id})`;
  };
  let [hb, hf] = hair(I.kind, I.c2, F);
  const head = HEAD[I.head];
  const ear = SYM(P('M31 47Q21 44 22 53Q23 62 32 59Z', sk, 2.8) + L('M27.6 50q-2 2.4 0 5', INK, 1.4));
  const shade = `<g clip-path="url(#hc${u})">${PF('M62 10Q77 40 67 72Q61 82 47 90H100V10Z', sd)}${PF('M20 64Q50 80 80 64V100H20Z', sd, ' opacity=".45"')}</g>`;
  const ir = I.iris, eyes = I.eyes === 'shades' ? '' : (has('eyepatch') ? '' : eye(I.eyes, ir[0], f, sk)) + (has('cyber') ? MIR(eye('round', '#ff3b3b', f, sk)) : MIR(eye(I.eyes === 'wink' ? 'round' : I.eyes === 'side' ? 'sideR' : I.eyes, ir[1] || ir[0], f, sk)));
  const nose = f ? L('M49.6 58.6q2.2 1.6 0 2.8', INK, 2.2) : L('M51 55L48.6 61.4H53', INK, 2.4);
  const feat = brows(I.brow, f) + eyes + nose + mouth(I.mouth, f);
  const under = A.filter(a => UNDER.includes(a.split('=')[0])).map(a => acc(a, I, u, F)).join('');
  const over = A.filter(a => !UNDER.includes(a.split('=')[0])).map(a => acc(a, I, u, F)).join('') + (I.eyes === 'shades' ? acc('shades', I, u, F) : '');
  // cat-ear hood with a fur trim (prison-orange, patched) — replaces the back hair
  if (has('hood')) {
    const fur = Array.from({ length: 17 }, (_, i) => { const a = (160 + i / 16 * 220) * Math.PI / 180; return C((50 + Math.cos(a) * 27).toFixed(1), (48 + Math.sin(a) * 31).toFixed(1), 6.2, '#fff', 2.6); }).join('');
    hb = P('M14 66Q10 14 50 12Q90 14 86 66Q80 92 50 94Q20 92 14 66Z', '#f26b1d', 3.2) + SYM(P('M20 30L18 2L40 16Z', '#f26b1d', 3) + P('M23 24L22 9L33 17Z', '#ff9ec4', 2)) + `<g transform="rotate(14 76 18)"><rect x="70" y="12" width="12" height="10" fill="${F('dot/#ffcd3c/#e2402f/4/0')}" ${S(1.8)}/></g>` + stitch('M71 13l10 0', 1);
    hf = hf + fur + `<rect x="18" y="56" width="10" height="9" rx="1" fill="${F('str/#2f62d6/#fff/4/45')}" ${S(1.8)} transform="rotate(-10 23 60)"/>`;
  }
  // ear hood (cat / bear / bunny ears — clothing): replaces the back hair, thick rim framing the face
  const eh = A.find(a => a.startsWith('ehood='));
  if (eh) {
    const [hc0, ty] = eh.split('=')[1].split('/'), inn = '#ff9ec4';
    hb = (ty === 'cat' ? SYM(P('M22 32L18 4L42 16Z', hc0, 3) + P('M24 25L22 11L34 18Z', inn, 2)) : ty === 'bear' ? SYM(C(22, 17, 10, hc0, 3) + C(22, 17, 5, inn, 2))
      : SYM(P('M28 22Q18 -6 29 -8Q40 -6 40 18Z', hc0, 3) + P('M31 16Q26 -1 30 -2Q35 -1 36 15Z', inn, 2))) + P('M14 66Q10 14 50 12Q90 14 86 66Q80 92 50 94Q20 92 14 66Z', hc0, 3.2);
    hf += L('M23 72Q16 24 50 21Q84 24 77 72', INK, 9) + L('M23 72Q16 24 50 21Q84 24 77 72', dk(hc0, .85), 5) + (opt.noSuit ? '' : L('M38 76l-2 13M62 76l2 13', '#fff', 2));
  }
  // jumpsuit collar + number tag
  const W = f ? 13 : 7;
  const suit = opt.noSuit ? '' : P('M42 68V86H58V68Z', sk, 2.8) + PF('M50 70H58V86H50Z', sd) +
    P(`M${W} 101Q${W + 2} 80 37 77L50 92L63 77Q${98 - W} 80 ${100 - W} 101Z`, '#f26b1d', 3.2) + I.suit.split('+').map(t => deco(t, F, W)).join('') +
    P('M37 77L44 95L50 92Z', '#ff9a3c', 2.6) + P('M63 77L56 95L50 92Z', '#ff9a3c', 2.6) +
    (has('choker') ? `<rect x="41" y="73" width="18" height="5" rx="2" fill="${INK}"/>` + [44, 50, 56].map(x => P(`M${x - 1.6} 78l1.6 3.4 1.6-3.4z`, '#d9dde6', 1)).join('') : '') +
    `<rect x="60" y="86" width="20" height="9" rx="2" fill="#fff" ${S(2.2)}/><text x="70" y="93.4" font-size="7.4" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif">${String(id + 1).padStart(3, '0')}</text>`;
  let bg = '';
  if (opt.bg) {
    bg = `<rect width="100" height="100" fill="${opt.bg}"/>`;
    const ray = (c, n = 16) => `<path d="${Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, b = a + Math.PI / n; return `M50 46L${(50 + Math.cos(a) * 90).toFixed(0)} ${(46 + Math.sin(a) * 90).toFixed(0)}L${(50 + Math.cos(b) * 90).toFixed(0)} ${(46 + Math.sin(b) * 90).toFixed(0)}Z`; }).join('')}" fill="${c}"/>`;
    bg += I.rar === 0 ? `<rect width="100" height="100" fill="${F('dot/rgba(0,0,0,0)/rgba(0,0,0,.08)/7/45')}"/>`
      : I.rar === 1 ? `<rect width="100" height="100" fill="${F('str/rgba(0,0,0,0)/rgba(255,255,255,.35)/10/45')}"/>`
      : I.rar === 2 ? ray('rgba(255,255,255,.45)') + `<rect width="100" height="100" fill="${F('dot/rgba(0,0,0,0)/rgba(255,79,160,.22)/8/0')}"/>` + star(12, 14, 6, '#ffcd3c', 1.6) + star(88, 70, 5, '#ff4fa0', 1.6)
      : ray('rgba(255,205,60,.6)', 20) + flame(10, 100, 7, '#ff7a1a', '#ffcd3c') + flame(90, 100, 7, '#ff7a1a', '#ffcd3c') + star(12, 14, 7, '#ffcd3c', 1.8) + star(88, 16, 5, '#ff4fa0', 1.6) + heart(86, 76, 4, '#e2402f', 1.6) + bolt(13, 70, 6, '#7fe0ff', 1.6);
  }
  const body = `${bg}${hb}${suit}${eh ? '' : ear}${P(head, sk, 3.2)}${shade}${under}${feat}${hf}${over}`;   // F() above must run before defs are joined
  return `<svg viewBox="0 0 100 100" class="inm" aria-hidden="true"><defs><clipPath id="hc${u}"><path d="${head}"/></clipPath>${defs.join('')}</defs>${body}</svg>`;
}
/* guard (patrol mode): pop-punk prison guard — oversized peaked cap with a checker band + star badge, mirrored shades, big moustache, navy uniform, baton */
const GUARD = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="gdchk" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="${INK}"/><rect x="3" y="3" width="3" height="3" fill="${INK}"/></pattern></defs>`
  + P('M5 101Q7 78 36 75L50 88L64 75Q93 78 95 101Z', '#2a4a8a', 3.2) + PF('M70 78Q91 82 94 101H77Z', '#1b3166') + P('M39 75L50 90L61 75Z', '#bfe3ff', 2.6) + P('M46.6 82h6.8l-1 14h-4.8z', '#e2402f', 2.2)
  + star(25, 88, 7, '#ffcd3c', 2.2)
  + L('M74 101L93 70', INK, 10) + L('M74 101L93 70', '#3a3f4a', 5.6) + L('M77 96l6-9', '#6b7385', 1.6) + L('M88 77l5 3', '#ff4fa0', 2.4)
  + P('M41 66V80H59V66Z', '#e3a77c', 2.8)
  + SYM(P('M29 47Q20 45 21 53Q22 61 31 59Z', '#efb88e', 2.8))
  + P('M27 44V60Q27 77 42 82H58Q73 77 73 60V44Z', '#efb88e', 3.2) + PF('M63 44V62Q63 76 53 82H58Q73 77 73 60V44Z', '#d29468') + PF('M30 64Q36 79 44 81H56Q64 79 70 64Q60 73 50 73Q40 73 30 64Z', INK, ' opacity=".14"')
  + L('M51 53L48.4 60.6H53', INK, 2.6)
  + P('M37 66Q43 59 50 63Q57 59 63 66Q57 69 50 66Q43 69 37 66Z', '#3b2416', 2.4) + L('M44 72.6Q50 74.6 56 72', INK, 2.8)
  + `<path d="M29 45H48Q48.5 57 40 57.6Q30 57.6 29 45ZM52 45H71Q70 57.6 60 57.6Q51.5 57 52 45Z" fill="#2fb5ff" ${S(2.8)}/>` + PF('M30 50H48V53Q46 57 40 57.6Q31 57.6 30 50ZM52 50H71Q70 57.6 60 57.6Q53 57 52 53Z', '#ff4fa0') + L('M48 46.6h4M26 46h3M71 46h3', INK, 2.8) + L('M33 48.6l5-2M55 48.6l5-2', '#fff', 2)
  + P('M18 36Q14 8 50 6Q86 8 82 36Z', '#2a4a8a', 3.2) + PF('M60 8Q84 12 82 36H68Q68 18 60 8Z', '#1b3166')
  + `<rect x="17" y="31" width="66" height="9" rx="2" fill="url(#gdchk)" ${S(2.8)}/>`
  + P('M14 41Q50 33 86 41L83 48Q50 41 17 48Z', '#14161c', 3) + L('M28 42q22-3.6 44 0', '#fff', 1.8, ' opacity=".55"')
  + star(50, 19, 9, '#ffcd3c', 2.4) + C(50, 19, 2.4, '#e2402f')
  + `</svg>`;
const KEY = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="34" cy="50" r="18" fill="#ffcd3c" stroke="${INK}" stroke-width="5"/><circle cx="34" cy="50" r="7" fill="#fff6d2" stroke="${INK}" stroke-width="4"/><path d="M50 46h36v8h-6v12h-8V54h-6v8h-8V54h-8z" fill="#ffcd3c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
const LOCK = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="42" r="14" fill="none" stroke="#ffcd3c" stroke-width="7"/><path d="M42 50 L36 78 H64 L58 50Z" fill="none" stroke="#ffcd3c" stroke-width="7" stroke-linejoin="round"/></svg>`;
/* ---------------- UI icons (24×24 line icons) ---------------- */
const ic = (d, extra = '') => `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${extra}</svg>`;
const ICON = {
  back: ic('M15 5l-7 7 7 7'), home: ic('M4 11l8-7 8 7v9h-5v-6H9v6H4z'), help: ic('M9.5 9a2.6 2.6 0 1 1 3.8 2.3c-.8.4-1.3 1-1.3 1.9V14M12 17.5v.5', '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  gear: ic('M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'),
  sound: ic('M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11'), mute: ic('M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6'),
  rank: ic('M5 20V12M12 20V5M19 20v-9'), trophy: ic('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8'),
  book: ic('M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z'),
  locker: ic('M6 3h12v18H6zM12 3v18M9 9v2M15 9v2M8 15h2M14 15h2'), undo: ic('M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3'), retry: ic('M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4'),
  hint: ic('M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z'),
  play: '<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  lock: ic('M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3'), coin: '<svg viewBox="0 0 24 24" class="ico coin" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffcd3c" stroke="#2a2622" stroke-width="2"/><path d="M9 8.5h4.2a2.3 2.3 0 0 1 0 4.6H9.5M9.5 8.5V16M8 13.1h5.5" fill="none" stroke="#2a2622" stroke-width="1.8" stroke-linecap="round"/></svg>',
  daily: ic('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'), course: ic('M4 20h16M6 20V8l6-4 6 4v12M10 20v-5h4v5M9 10h.01M15 10h.01'), modes: ic('M13 2L4 14h7l-1 8 9-12h-7z'),
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z"/></svg>',
  arrowL: ic('M19 12H5M11 6l-6 6 6 6'), arrowR: ic('M5 12h14M13 6l6 6-6 6'), arrowU: ic('M12 19V5M6 11l6-6 6 6'), arrowD: ic('M12 5v14M6 13l6 6 6-6'),
  bolt: ic('M13 2L4 14h7l-1 8 9-12h-7z'), clock: ic('M12 7v5l3 2', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>'),
  exit: '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="1" width="38" height="22" rx="3" fill="#1fa463" stroke="#0b5131" stroke-width="2"/><text x="20" y="16.5" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Jost,Arial,sans-serif">EXIT</text></svg>',
};
/* ---------------- mode icons (48×48, colour) ---------------- */
const MI = {
  sl: `<svg viewBox="0 0 48 48"><path d="M24 4 L4 44 H44Z" fill="#ffe27a" opacity=".85"/><circle cx="24" cy="8" r="6" fill="#2a2622"/><circle cx="24" cy="8" r="3" fill="#fff6c2"/></svg>`,
  chain: `<svg viewBox="0 0 48 48"><rect x="4" y="18" width="18" height="12" rx="6" fill="none" stroke="#c7ccd6" stroke-width="5"/><rect x="26" y="18" width="18" height="12" rx="6" fill="none" stroke="#c7ccd6" stroke-width="5"/><rect x="16" y="20" width="16" height="8" rx="4" fill="none" stroke="#f26b1d" stroke-width="5"/></svg>`,
  silent: `<svg viewBox="0 0 48 48"><path d="M10 30 q14 -22 28 0" fill="none" stroke="#fff" stroke-width="4"/><circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="3" opacity=".4"/><path d="M8 40 L40 8" stroke="#ff5d5d" stroke-width="5" stroke-linecap="round"/><text x="24" y="31" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">shh</text></svg>`,
  key: `<svg viewBox="0 0 48 48"><circle cx="16" cy="24" r="9" fill="#ffcd3c" stroke="#2a2622" stroke-width="3"/><path d="M24 22h18v5h-3v6h-4v-6h-3v4h-4v-4h-4z" fill="#ffcd3c" stroke="#2a2622" stroke-width="2.4"/></svg>`,
  plate: `<svg viewBox="0 0 48 48"><rect x="6" y="28" width="36" height="12" rx="3" fill="#ffcd3c" stroke="#2a2622" stroke-width="3"/><path d="M10 28l6 12M18 28l6 12M26 28l6 12M34 28l6 12" stroke="#2a2622" stroke-width="3"/><path d="M14 6v16M22 6v16M30 6v16M38 6v16" stroke="#c7ccd6" stroke-width="4"/></svg>`,
  oneway: `<svg viewBox="0 0 48 48"><rect x="4" y="14" width="40" height="20" rx="4" fill="#3d8fd1" stroke="#2a2622" stroke-width="3"/><path d="M12 18l8 6-8 6M22 18l8 6-8 6M32 18l8 6-8 6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/></svg>`,
  ice: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="6" fill="#bfe9ff" stroke="#2a2622" stroke-width="3"/><path d="M24 10v28M12 17l24 14M36 17L12 31" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  patrol: `<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="12" fill="#f6d2b0" stroke="#2a2622" stroke-width="3"/><path d="M10 20 Q24 4 38 20 L40 23 H8Z" fill="#2f4d7a" stroke="#2a2622" stroke-width="3" stroke-linejoin="round"/><rect x="21" y="11" width="6" height="5" fill="#ffcd3c"/><path d="M19 29h3M26 29h3" stroke="#2a2622" stroke-width="3" stroke-linecap="round"/></svg>`,
  twin: `<svg viewBox="0 0 48 48"><rect x="3" y="16" width="26" height="14" rx="5" fill="#f26b1d" stroke="#2a2622" stroke-width="3"/><rect x="31" y="3" width="14" height="26" rx="5" fill="#ff9a3c" stroke="#2a2622" stroke-width="3"/><path d="M14 40h8l-3-3M38 34v8l3-3" fill="none" stroke="#1fa463" stroke-width="3" stroke-linecap="round"/></svg>`,
  dig: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="#a1553a" stroke="#2a2622" stroke-width="3"/><path d="M4 16h40M4 30h40M18 4v12M30 16v14M14 30v14M36 30v14" stroke="#6e3524" stroke-width="2.4"/><path d="M20 18l6 6-4 4 6 6" fill="none" stroke="#2a2622" stroke-width="3"/><path d="M30 6l10 10-14 14" fill="none" stroke="#c7ccd6" stroke-width="4" stroke-linecap="round"/></svg>`,
  tilt: `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="4" fill="#d8d2c4" stroke="#2a2622" stroke-width="3" transform="rotate(14 24 24)"/><rect x="24" y="26" width="10" height="10" fill="#c98b55" stroke="#2a2622" stroke-width="2.4" transform="rotate(14 24 24)"/><path d="M4 8q6-6 14-4" fill="none" stroke="#2a2622" stroke-width="3" stroke-linecap="round"/></svg>`,
  big: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="4" fill="#5c6b80" stroke="#2a2622" stroke-width="3"/><path d="M3 13.5h42M3 24h42M3 34.5h42M13.5 3v42M24 3v42M34.5 3v42" stroke="#8796ab" stroke-width="1.6"/><rect x="5" y="15" width="18" height="8" rx="3" fill="#f26b1d" stroke="#2a2622" stroke-width="2"/></svg>`,
  laser: `<svg viewBox="0 0 48 48"><rect x="16" y="2" width="16" height="10" rx="2" fill="#3a3f4a" stroke="#2a2622" stroke-width="3"/><rect x="21" y="12" width="6" height="34" fill="#ff3b3b"/><rect x="23" y="12" width="2" height="34" fill="#fff"/><path d="M8 26h8M32 26h8" stroke="#ff8a8a" stroke-width="3" stroke-linecap="round"/></svg>`,
  heavy: `<svg viewBox="0 0 48 48"><rect x="5" y="7" width="38" height="34" rx="4" fill="#59606e" stroke="#2a2622" stroke-width="3"/><circle cx="24" cy="24" r="9" fill="#c7ccd6" stroke="#2a2622" stroke-width="3"/><path d="M24 15v4M24 29v4M15 24h4M29 24h4" stroke="#2a2622" stroke-width="2.4"/><rect x="9" y="41" width="8" height="4" fill="#2a2622"/><rect x="31" y="41" width="8" height="4" fill="#2a2622"/></svg>`,
  shutter: `<svg viewBox="0 0 48 48"><rect x="3" y="8" width="20" height="32" rx="3" fill="#d64541" stroke="#2a2622" stroke-width="3"/><path d="M3 16h20M3 24h20M3 32h20" stroke="#2a2622" stroke-width="2.4"/><rect x="25" y="8" width="20" height="32" rx="3" fill="none" stroke="#3d8fd1" stroke-width="3" stroke-dasharray="4 3"/><path d="M30 24h10" stroke="#3d8fd1" stroke-width="3"/></svg>`,
  lights: `<svg viewBox="0 0 48 48"><rect x="12" y="4" width="24" height="40" rx="5" fill="#f4efe4" stroke="#2a2622" stroke-width="3"/><rect x="18" y="12" width="12" height="24" rx="3" fill="#2a2622"/><rect x="20" y="14" width="8" height="10" rx="2" fill="#ffcd3c"/><path d="M38 10l6-4M38 20h7M4 14l6 2" stroke="#2a2622" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  vent: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="18" height="18" rx="3" fill="#8d96a8" stroke="#2a2622" stroke-width="3"/><path d="M7 9h10M7 15h10" stroke="#2a2622" stroke-width="2.4"/><rect x="27" y="27" width="18" height="18" rx="3" fill="#8d96a8" stroke="#2a2622" stroke-width="3"/><path d="M31 33h10M31 39h10" stroke="#2a2622" stroke-width="2.4"/><path d="M14 24q0 10 10 10" fill="none" stroke="#ffcd3c" stroke-width="3.4" stroke-dasharray="3 3"/><path d="M22 30l4 4-4 4" fill="none" stroke="#ffcd3c" stroke-width="3"/></svg>`,
  ta: `<svg viewBox="0 0 48 48"><circle cx="24" cy="27" r="17" fill="#f4efe4" stroke="#2a2622" stroke-width="3"/><rect x="20" y="3" width="8" height="6" rx="1" fill="#2a2622"/><path d="M24 27V15M24 27l8 5" stroke="#d64541" stroke-width="3.4" stroke-linecap="round"/><text x="24" y="44" text-anchor="middle" font-size="9" font-weight="900" fill="#2a2622" font-family="Jost,sans-serif">×10</text></svg>`
};
/* ---------------- floor skins (play board) ---------------- */
const SKINS = [
  { id: 'concrete', rar: 0 }, { id: 'brick', rar: 0 }, { id: 'tile', rar: 1 }, { id: 'yard', rar: 1 },
  { id: 'night', rar: 2 }, { id: 'desert', rar: 2 }, { id: 'arctic', rar: 2 }, { id: 'neon', rar: 3 },
];
/* ---------------- mini board (SVG) for cards ---------------- */
const BCOL = ['#7a8fa6', '#a0784f', '#6f8b5e', '#8c7aa0', '#5f8e94', '#a86a5a', '#8d8f99', '#b49554'];
function miniBoard(P, S, cls = 'mini') {
  const w = P.w, h = P.h, u = 10, pad = 3;
  let s = `<svg viewBox="0 0 ${w * u + pad * 2 + 4} ${h * u + pad * 2 + 4}" class="${cls}"><rect x="1" y="1" width="${w * u + pad * 2 + 2}" height="${h * u + pad * 2 + 2}" rx="3" fill="#3a3f4a"/><rect x="${pad + 1}" y="${pad + 1}" width="${w * u}" height="${h * u}" fill="#d8d2c4"/>`;
  const X = c => pad + 1 + (c % w) * u, Y = c => pad + 1 + ((c / w) | 0) * u;
  const pi = P.pc.findIndex(p => p.t === 'P'); if (pi >= 0) { const y = S[2 * pi + 1]; s += `<rect x="${pad + 1 + w * u}" y="${pad + 1 + y * u + 1}" width="${pad + 2}" height="${u - 2}" fill="#1fa463"/>`; }
  const qi = P.pc.findIndex(p => p.t === 'Q'); if (qi >= 0) { const x = S[2 * qi]; s += `<rect x="${pad + 1 + x * u + 1}" y="${pad + 1 + h * u}" width="${u - 2}" height="${pad + 2}" fill="#1fa463"/>`; }
  P.walls.forEach(c => { s += `<rect x="${X(c)}" y="${Y(c)}" width="${u}" height="${u}" fill="#6b5a4e"/>`; });
  P.cracks.forEach(c => { s += `<rect x="${X(c)}" y="${Y(c)}" width="${u}" height="${u}" fill="#a1553a"/><path d="M${X(c) + 3} ${Y(c) + 2}l3 3-2 2 3 3" stroke="#2a2622" stroke-width="1" fill="none"/>`; });
  if (P.plate >= 0) s += `<rect x="${X(P.plate) + 1}" y="${Y(P.plate) + 1}" width="${u - 2}" height="${u - 2}" fill="#ffcd3c"/>`;
  P.doors.forEach(c => { s += `<path d="M${X(c) + 3} ${Y(c)}v${u}M${X(c) + 7} ${Y(c)}v${u}" stroke="#8d96a8" stroke-width="1.6"/>`; });
  P.gate.forEach(c => { s += `<path d="M${X(c) + 2} ${Y(c)}v${u}M${X(c) + 5} ${Y(c)}v${u}M${X(c) + 8} ${Y(c)}v${u}" stroke="#d64541" stroke-width="1.6"/>`; });
  P.pc.forEach((p, i) => {
    const x = S[2 * i]; if (x < 0) return; const y = S[2 * i + 1];
    const pw = (p.v ? 1 : p.l) * u - 1.6, ph = (p.v ? p.l : 1) * u - 1.6;
    const fill = p.t === 'P' ? '#f26b1d' : p.t === 'Q' ? '#ff9a3c' : p.t === 'g' ? '#2f4d7a' : p.t === 'k' ? '#ffcd3c' : p.t === 'x' ? '#c98b55' : p.t === 'o' ? '#3d8fd1' : p.hv ? '#4a505c' : BCOL[i % BCOL.length];
    s += `<rect x="${pad + 1 + x * u + .8}" y="${pad + 1 + y * u + .8}" width="${pw}" height="${ph}" rx="2" fill="${fill}" stroke="#2a2622" stroke-width=".8"/>`;
  });
  if (P.lock >= 0) s += `<circle cx="${X(P.lock) + 5}" cy="${Y(P.lock) + 5}" r="3.2" fill="rgba(42,38,34,.6)" stroke="#ffcd3c" stroke-width="1.6"/>`;   // keyhole on top: it can start under a block
  // 2026-10 rules: beams, emitters, shutters, lights switch, vents, heavy safes
  const EN = window.JBEngine;
  if (P.lz && P.lz.length && EN) { const L = EN.lit(P, S, EN.grid(P, S)); L.forEach((v, c) => { if (v) s += `<rect x="${X(c) + 3.8}" y="${Y(c)}" width="2.4" height="${u}" fill="#ff3b3b" opacity=".85"/>`; }); P.lz.forEach(([c]) => { s += `<rect x="${X(c) + 1}" y="${Y(c) + 1}" width="${u - 2}" height="${u - 2}" rx="1.5" fill="#2a2622"/><circle cx="${X(c) + 5}" cy="${Y(c) + 5}" r="2" fill="#ff3b3b"/>`; }); }
  (P.sr || []).forEach(c => { s += `<rect x="${X(c) + 1}" y="${Y(c) + 1}" width="${u - 2}" height="${u - 2}" fill="#d64541" stroke="#2a2622" stroke-width=".8"/>`; });
  (P.sb || []).forEach(c => { s += `<rect x="${X(c) + 1.2}" y="${Y(c) + 1.2}" width="${u - 2.4}" height="${u - 2.4}" fill="none" stroke="#3d8fd1" stroke-width="1.4" stroke-dasharray="2 1.4"/>`; });
  if (P.sw >= 0) s += `<rect x="${X(P.sw) + 2.5}" y="${Y(P.sw) + 1.5}" width="5" height="7" rx="1" fill="#ffcd3c" stroke="#2a2622" stroke-width="1"/>`;
  if (P.vt) P.vt.forEach(c => { s += `<rect x="${X(c) + 1}" y="${Y(c) + 1}" width="${u - 2}" height="${u - 2}" rx="1.5" fill="none" stroke="#c7ccd6" stroke-width="1.4"/><path d="M${X(c) + 3} ${Y(c) + 4}h4M${X(c) + 3} ${Y(c) + 6.5}h4" stroke="#c7ccd6" stroke-width="1"/>`; });
  P.pc.forEach((p, i) => { if (!p.hv || S[2 * i] < 0) return; const x = S[2 * i], y = S[2 * i + 1], cx = pad + 1 + (x + (p.v ? .5 : p.l / 2)) * u, cy = pad + 1 + (y + (p.v ? p.l / 2 : .5)) * u; s += `<circle cx="${cx}" cy="${cy}" r="2.6" fill="#c7ccd6" stroke="#2a2622" stroke-width=".8"/>`; });
  return s + '</svg>';
}
window.JBArt = { INMATES, inmateSVG, GUARD, KEY, LOCK, ICON, MI, SKINS, miniBoard, BCOL, RAR: ['N', 'R', 'SR', 'SSR'] };
})();
