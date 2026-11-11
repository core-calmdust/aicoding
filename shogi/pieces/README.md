# Piece images

The image piece sets in this folder come from [lishogi](https://github.com/WandererXII/lishogi) (`ui/@build/pieces/assets/standard`). They keep their original licences:

| Folder | Author | Licence |
|---|---|---|
| `orangain/` | [orangain](https://github.com/orangain) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `2kanji_3d/` | [Little-Mage](https://github.com/Little-Mage) and [orangain](https://github.com/orangain) | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `1kanji_3d/` | [Little-Mage](https://github.com/Little-Mage) and [CouchTomato87](https://github.com/CouchTomato87) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

The files are used unchanged, except that in the 3D sets the sente pieces use the same lighter face colour as the gote pieces (#fee572 → #feec99). File names: `0` = piece pointing up (sente side), `1` = pointing down; `GY` = 玉, `OU` = 王.

`../../images/atlas/shogi-glyphs.png` (the inscriptions, cut out of the `2kanji_3d` SVGs) and `../../images/atlas/shogi-pieces.png` (3D renders of boxwood pieces carrying those inscriptions, used by the portal skin) are derived from `2kanji_3d` and are shared under the same licence, CC BY-SA 3.0 (Little-Mage and orangain).

## Ryoko (菱湖) · Kinki (錦旗) · Minase (水無瀬)

| Folder | Author | Licence |
|---|---|---|
| `ryoko/`, `kinki/`, `minase/` | [LuffyKudo](https://github.com/LuffyKudo/Shogi-Themes) (Jemierry J.I. Maglinte Jumawan) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |

From `Pieces (2-Kanji)` of [LuffyKudo/Shogi-Themes](https://github.com/LuffyKudo/Shogi-Themes) (promoted pieces from `Red Promoted`, gote from `180°`). Changes: renamed to this folder's scheme (`0` up / `1` down, `FU` … `UM`, `GY` 玉 / `OU` 王), the Inkscape editor metadata removed, in `ryoko/` the inscription turned back 3° clockwise around its own centre (the calligraphy leaned too much on screen), and the viewBox widened by 8% (centred) so the pieces show at the same size as `2kanji_3d`. The changed files are shared under the same licence, CC BY-SA 4.0.

## 3D piece sets (2026-11-11)

`../../images/atlas/shogi-glyphs-<set>.png` (the inscriptions of the SVGs above, reproduced as drawn — same place and size on the face — by `atlas/tools/shogi-glyphs-faithful.py`), `../../images/atlas/shogi-pieces-<set>.png` (top-down renders of the 3D boxwood pieces with those inscriptions) and `../../atlas/img/pc3-shogi-<set>.webp` (their tile pictures) are derived works of the matching folder and are shared under its licence: `ichiji` ← `1kanji_3d` (CC BY 4.0, Little-Mage and CouchTomato87), `kinki` / `minase` / `ryoko` ← `kinki/` / `minase/` / `ryoko/` (CC BY-SA 4.0, LuffyKudo), `moriage` ← `2kanji_3d/` (CC BY-SA 3.0, Little-Mage and orangain).

## 浮木 (Ukiki, key futofude) 3D set (2026-11-11)

`futamoji/piece.svg` is the two-character piece sheet of [sunfish-shogi/shogi-images](https://github.com/sunfish-shogi/shogi-images), dedicated to the public domain (CC0 1.0), kept unchanged. `../../images/atlas/shogi-glyphs-futofude.png`, `shogi-pieces-futofude.png` and `../../atlas/img/pc3-shogi-futofude.webp` are made from it by `atlas/tools/shogi-glyphs-futamoji.py` (CC0 as well).

## 水無瀬 (Minase) — inscriptions traced from a real set (2026-11-12)

The inscriptions of the unpromoted 水無瀬 pieces (歩 香 桂 銀 金 角 飛 王 玉) are no longer LuffyKudo's drawing: they are outlines traced from the user's reference photo of a real 水無瀬書 盛り上げ set (`atlas/tools/shogi-glyphs-photo.py`; the photo itself is not kept in the repo). 水無瀬 is a traditional script (after Minase Kanenari, c. 1600). `minase/traced.png` holds the traced masks; `atlas/tools/shogi-traced-svg.py` writes them into `minase/{0,1}{FU,KY,KE,GI,KA,HI,KI,GY,OU}.svg` in place of the black ink path (the piece's face, band and maker's mark stay LuffyKudo's, CC BY-SA 4.0). The promoted sides (red) are unchanged. `shogi-glyphs-minase.png`, `shogi-pieces-minase.png` and `pc3-shogi-minase.webp` carry the same traced inscriptions.

## 菱湖 (Ryoko) — inscriptions traced from a real set (2026-11-12)

The same for 菱湖 (`atlas/tools/shogi-glyphs-photo.py <photo> ryoko 8`, `ryoko/traced.png`, `atlas/tools/shogi-traced-svg.py ryoko`): the unpromoted inscriptions, and their place and size on the piece, come from the user's reference photo of a real 菱湖書 盛り上げ set. The promoted sides, the face, band and maker's mark stay LuffyKudo's (CC BY-SA 4.0).

## 錦旗 (Kinki) — inscriptions traced from a real set (2026-11-12)

The same for 錦旗: the unpromoted inscriptions are traced from the user's reference photo of a real 錦旗書 盛り上げ set (`atlas/tools/shogi-glyphs-photo.py <photo> kinki 8`, `kinki/traced.png`, `atlas/tools/shogi-traced-svg.py kinki`); 王將 and 玉將 are each traced from their own piece. The promoted sides, the face, band and maker's mark stay LuffyKudo's (CC BY-SA 4.0).
