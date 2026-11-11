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

## 隷書 (reisho) 3D set (2026-11-11)

`../../images/atlas/shogi-glyphs-reisho.png`, `shogi-pieces-reisho.png` and `../../atlas/img/pc3-shogi-reisho.webp` are set in the free brush font 「青柳隷書しも」 (aoyagireisyosimo v2.02, made by SIMO from the calligraphy of 青柳衡山). Its readme: free, no conditions of use, commercial use allowed. The promoted sides are the `minase` set's cursive inscriptions (CC BY-SA 4.0, LuffyKudo), as real 隷書 sets carve them in cursive. The font file itself is not in this repository (`atlas/tools/shogi-glyphs-font.py` reads it from a path).
