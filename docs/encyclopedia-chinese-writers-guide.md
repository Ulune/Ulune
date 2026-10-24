# The encyclopedia’s Chinese pages: the writers’ guide

Encyclopedia plan, parts 23–26 (`claude/ulune-encyclopedia-plan.md`, “An entry, start to finish”, “Writing it”, “Checks on every build”; the Chinese setup is part 23, `claude/ulune-chinese-part20-plan.md`). Rebuilt on 23 October 2026 from the pilot pages (the five phases, yin and yang), the tradition introductions, the astrology pages they follow, and the build’s own checks, after the first copy was lost with a workspace reset.

This guide is for whoever writes the next family. The model is the pilot: `content/encyclopedia/chinese/phase*.md` and `content/encyclopedia/shared/yin-yang*.md`, read with `content/encyclopedia/astrology/saturn.*.md` beside them. When this guide and the pilot disagree, the pilot wins and this guide is corrected.

## 1. What is written, and where

- **The manifest is the list.** `content/encyclopedia/chinese-manifest.json` names every Chinese entry (389 in 26 families): its id, tradition, family, kind, its address in each language, its titles, its Chinese name and where that name comes from, a glyph and the entries it is closest to. It is made by `scripts/encyclopedia/chinese-manifest.mjs` from the engine’s own names and the term registry (`src/lib/chinese/term-ids.ts`) and never edited by hand; a test fails when it is out of date.
- **One file per entry and language**: `content/encyclopedia/<tradition>/<id>.en.md` and `<id>.fr.md`. The tradition is the manifest’s: `chinese` (Chinese cosmology, the foundations the three languages share: phases, stems, branches, the sixty pillars, Na Yin, solar terms, relations, trigrams and four key ideas), `chinese-astrology`, `bazi`, `feng-shui`, and `shared` for yin and yang.
- **A family is written whole, then goes live** (section 8). Write it in the engine’s order, the family’s own entry (what a Heavenly Stem is) first or last, as is easier, but never leave a family half done in a commit that puts it live.
- **Combination families** (the sixty pillars, the thirty Na Yin, the 45 pairs of Flying Stars) are assembled like astrology’s combination pages, from Ulune’s own reading texts with a written opening in `content/encyclopedia/combinations/`. The builder (`scripts/encyclopedia/combinations.mjs`) does not make the Chinese ones yet: extend it before writing their openings.
- **A tradition’s home text** is `content/encyclopedia/<tradition>/_home.<lang>.md`: its introduction, no heading, linking only what exists. When a family goes live, read the home texts again: a sentence such as “the animals’ own pages are written next” must change once they are.

## 2. The header (front matter)

Keys in this order, as the pilot writes them. The parser is deliberately narrow (`scripts/encyclopedia/parse.mjs`): `key: value`, inline lists `[a, b]`, block lists of `  - item`, double quotes when a value starts with a sign the format refuses or holds `, ` inside an inline list; `#` after a space starts a comment.

| Key | What it holds | Rules the build applies |
| --- | --- | --- |
| `id` | The manifest’s id: `stem-jia`, `branch-zi`, `animal-horse`, `tai-sui` | The file’s name; a term of the manifest, in its tradition |
| `lang` | `en` or `fr` | The file’s |
| `slug` | The manifest’s address in that language: `jia-wood`, `jia-bois` | Exactly the manifest’s; it never changes once published |
| `title` | The manifest’s title (`Jia · Yang Wood`, `Jia · Bois yang`) | Plain text; the part before ` · ` is the name the lexicon may link |
| `aliases` | Other names a reader may type: pinyin with tones, the characters, the usual English or French names | Optional; French typography applies |
| `tradition`, `family`, `kind` | As the manifest gives them | Checked against it |
| `page` | `true` | A page with no section is refused |
| `glyph` | The manifest’s glyph, quoted: `"甲"`; none where the manifest has none (Relations, the solar month) | At most eight characters; the same in both files. Two characters at most draw well on the preview image: a longer name takes its usual short form (天干五合 → `"五合"`, 天干四沖 → `"四沖"`) |
| `hant`, `hans`, `pinyin` | The Chinese name: Traditional and Simplified characters, Hanyu Pinyin with tone marks | See section 3 |
| `summary` | The card’s sentence | One sentence, a full stop, at most 160 characters |
| `related` | Five to eight ids, the closest first; a family’s own entry lists its members first, then its neighbours | Ids of entries or of manifest terms; never itself, never twice |
| `sources` | The books the page draws on (section 6) | Free text, one per line |
| `revised` | The date of the last real change, `YYYY-MM-DD` | A real date |

`family`, `kind`, `page`, `glyph`, `related`, `hant`, `hans` and `pinyin` must be the same in both languages: the build compares them. The aliases differ by language (the French file says « branche du Rat »).

## 3. The Chinese name

- **The engine’s name is the entry’s.** When the manifest row says `"engine": true`, copy its `hant`, `hans` and `pinyin` exactly: the build refuses any other (`checkChineseName`, `scripts/encyclopedia/chinese.mjs`), and refuses an entry that leaves out a name the engine has.
- **Form**: Han characters only (no space, no Latin letter); pinyin in small letters, one tone-marked syllable per character, syllables joined or apart (`lìchūn`, `hǎizhōng jīn`), an apostrophe where two would run together (`shí’èr`).
- **A name the engine does not hold** (`"engine": false`, the manifest’s `from` says “a suggestion, check it in a dictionary”) is never presented as checked. Before using it, look for it in the engine’s own texts and notes (`grep -rn '<characters>' src/lib/chinese src/lib/i18n/catalog/chinese.ts`). Then either:
  - the engine already writes it, characters and pinyin, in a text a reader sees: use it as written there and say where in a comment above `hant`;
  - or it does not: use the manifest’s suggestion only with the comment `# Chinese name: the manifest’s suggestion, not in the engine: to check in a dictionary` above `hant`. `chinese-manifest.mjs --status` lists every written page whose name is still a suggestion, for the owner’s dictionary check.
  Once a name is checked, it belongs in the engine (the module that owns the term, `names.ts` for the shared ones), the manifest is written again with `--write`, and the comment goes. Appendix A gives the engine check of all 44 suggestions.
- **No name at all** (`"chinese": null`: Relations, the solar month, the Kua numbers, the pairs of stars…): leave the three keys out. Do not invent one.
- **In the body**, a Chinese word is written with its characters then its pinyin: 相生 xiāngshēng, 太歲 Tài Suì in a name, `(仁 rén)` in brackets after a translation. Traditional characters in the body, as the pages show by default; the head shows the reader’s choice.

## 4. The body: sections, order, lengths

The headings are fixed, in this order, each optional, never two of one kind (`SECTIONS`, `scripts/encyclopedia/registry.mjs`):

| English | French | What goes there | Length (pilot) |
| --- | --- | --- | --- |
| `## Meaning` | `## Sens` | What it stands for, its gifts and its difficulties, in Ulune’s voice | Three short paragraphs |
| `## In practice` | `## En pratique` | How it shows in each language that reads it (BaZi, the zodiac, Feng Shui, the Calendar), and how to read it, as a list of three to five bold-led items | 120–220 words |
| `## Across traditions` | `## D’une tradition à l’autre` | The same idea elsewhere, side by side and never merged: Western astrology, Chinese astronomy, Japan, Korea, Vietnam, India, the sciences | Two to four bold-led items |
| `## Origin and history` | `## Origine et histoire` | Where the idea comes from, the texts and people, with dates | One or two paragraphs |
| `## How Ulune calculates it` | `## Comment Ulune le calcule` | The method, exactly as the code does it (section 5) | One or two paragraphs |
| `## Correspondences` | `## Correspondances` | A small table: rows of `Correspondence | <title>` | 8–16 rows |

“In your chart” is not written: it is worked out on the device (`src/encyclopedia/in-your-chart.ts`). **For the Chinese entries it is not available yet**: the studio does not publish the pillars to the encyclopedia. Do not write a section that stands in for it, and do not promise it in the text.

The pilot’s standard, which `scripts/encyclopedia-chinese.test.mjs` checks for every written Chinese family: the six sections in order, at least five sources, more than 550 words in each language (counted as the test counts them), and the summary as the card’s text. A family page (the five phases, the Heavenly Stems) is longer, about 1,000 words. A part with nothing true to say is left out rather than padded, but every Chinese family so far has had something for each.

The Markdown is narrow: paragraphs, `- ` lists (no nesting), pipe tables, `**bold**`, `*italic*`, links `[[id]]` and `[[id|words]]`. No quotes block, no code, no HTML, no images, no other links. `\*` writes an asterisk.

## 5. Facts, and how Ulune calculates

- **The engine is the reference.** Every fact Ulune computes is said as the code does it, and read from the code before it is written: `src/lib/chinese/names.ts` (names, phases, polarities, hidden stems with their weights, double hours, solar months), `pillars.ts` (the year from Lichun, the month from its jie and the five tigers, the day count, the hour and the five rats, true solar time and the day that turns at 23:00 by default), `bazi.ts` (the Ten Gods), `bazi-signs.ts` (life stages, empty branches, symbolic stars), `bazi-balance.ts` (the nine points, the strength tests, the structure), `bazi-interactions.ts` and `relations.ts` (combinations, harmonies, trines, trios, clashes, harms, punishments, destructions, and the transformation conditions), `zodiac.ts` and `zodiac-time.ts` (the four animals, the year ahead, Tai Sui), `fengshui*.ts` (the 24 mountains, the stars). Where schools differ, say which one Ulune follows and that others exist, as the code’s comments do.
- **Agree with the readings.** The zodiac’s portraits (`zodiac-texts.ts`), the year texts (`zodiac-time-texts.ts`), BaZi’s and Feng Shui’s texts are already reviewed: the encyclopedia says the same, in more depth, never the opposite. The app’s own words are the catalog’s (`src/lib/i18n/catalog/chinese.ts`): Day Master / Maître du jour, Heavenly Stem / Tronc céleste, luck pillars / piliers de chance, Retreat, Rest, Storehouse and Pause for four life stages.
- **Dates and examples** are checked against the engine where it can say them (a year’s pillar, a month’s branch, the day 1 January 2000, Wu-Wu): run it rather than count by hand.
- **A solar term’s instant** comes from `src/lib/chinese/terms.ts` (`termsOfYear(2026)`, the Swiss Ephemeris table), written to the minute without rounding up (“20 January, 01:44 UT”; « 1 h 44 UT »), in the past tense when the instant is already gone on the page’s `revised` date, else in the present (“it falls on”); add the date in China (UTC+8) when it differs. Every term page says what changes at it: an opening term (jie, even index) the month pillar, the month animal and the month’s star, Lichun the year’s too; a principal term (odd index) no pillar, only the lunar month it names and the Calendar’s mark.
- **A Ten God’s stems** for each Day Master come from `tenGodOf` in `src/lib/chinese/bazi.ts`, printed for all ten rather than counted by hand; its structure follows `structureOf` in `bazi-balance.ts` (the month’s Prosperity or Sword Edge branch, else the first of the month branch’s hidden stems, peers aside, to show among the stems, else the first of them); what its presence, its decades and its years mean is what `bazi-texts.ts` and `bazi-readings-texts.ts` say, in more depth.
- **Facts the writer could only check from memory or online** (a date, a quotation, a custom) go in the batch’s report to the owner, who reviews every core page (decision 12).

## 6. Voice and tone

- **Ulune’s voice**: calm, exact, warm; short sentences in plain words; British English (`colour`, `centre`, `-ise` where usual); the tradition is reported, not preached: “the tradition reads…”, “the classics give…”, “Ulune counts…”.
- **Suggestions, never predictions.** No fixed fate, no year or animal or person that is good or bad in itself: “a phase that is missing is an invitation, not a flaw”.
- **Nothing frightening.** No illness, accident, death, divorce or misfortune predicted, not even as the tradition’s claim. Names that sound harsh (Clash, Punishment, Seven Killings, the stages 病, 死, 墓, 絕) are explained for what they describe, a friction or a phase’s strength, and Ulune’s gentler names are used where the app uses them.
- **No health predictions.** Old correspondences (organs, tastes) may appear in a table as history, never as advice.
- **Nothing to buy.** No cures, charms, crystals or objects; a balance is found through what a phase stands for (rest, plans, company, order), never through a purchase. Customs (red worn in one’s own year) are described, never urged.
- **Respect**: the traditions are presented as living ways of seeing, with their history and their debates, and never mocked; other traditions are set side by side, never merged.

## 7. French

- **Written, not translated**: from the same notes as the English, in French sentences and with French examples where they serve better. Never shorter than the English, never saying less.
- **Typography** (checked by the build on the title, the aliases, the summary and every body line): the narrow no-break space U+202F before `:` `;` `!` `?` and `»`, and after `«`; the apostrophe `’`; quotations in « » ; no `'` and no `"`. Write the U+202F as the character itself in the Markdown files. A safe way after writing: `python3 -c "import re,sys; p=sys.argv[1]; t=open(p,encoding='utf-8').read(); t=re.sub(r'[  ]([:;!?»])', ' \\1', t); t=re.sub(r'«[  ]', '« ', t); open(p,'w',encoding='utf-8').write(t)" <file>` (it leaves `key:` lines alone, which have no space before the colon).
- **Hours** as the catalog writes them: « 23 h », with U+202F before the h. **Centuries** in small capitals’ stead: « IIIe siècle av. J.-C. ». **Elision** before a vowel: « l’Eau », « d’Eau », « près d’Amsterdam ».
- **The app’s French words**: Tronc céleste, Branche terrestre, Maître du jour, Dix Dieux, troncs cachés, piliers de chance, double heure, mois solaire, Réglages, temps solaire vrai, phase (féminin), le Bois, le Feu, la Terre, le Métal, l’Eau. The lenses are « prismes »: le prisme Cycles, le prisme Relation (in English the Cycles lens, the Relationship lens); the clocks are le temps solaire vrai, le temps moyen local, l’heure de la pendule, chosen in Réglages → Traditions chinoises (Settings → Chinese traditions); the Rabbit is le Lapin, never le Lièvre.

## 8. Links

- **Write the link**: `[[stem-jia]]` shows the entry’s title; `[[stem-jia|Jia]]` the words given. Inside a sentence, the words fit the sentence (`[[phase-water|l’Eau]]` is wrong: write `l’[[phase-water|Eau]]`).
- **Once per paragraph or list item**, at the first mention; a table may link in every cell. The build warns otherwise.
- **Never** in a heading, never to the page itself.
- **A term still to be written** (any id of the manifest) may be linked already: it reads as plain words until its page exists, then links by itself. Any other unknown id is a mistake.
- **A tradition’s home** links by its id: `[[bazi]]`, `[[chinese-astrology|Chinese astrology]]`, `[[chinese|Chinese cosmology]]`.
- **What links by itself in the readings** (`scripts/encyclopedia/lexicon.mjs`): an entry’s title (the part before ` · `). Never a word with an everyday meaning (`GENERIC`: the phases’ Wood, Fire, Earth, Metal, Water) and never a stem’s or a branch’s own syllable (Jia, Yin, You, Shen…), which other Chinese words share (yin and yang, Wu Gui, Fu Wei, Shen Sha) and which English shares too (“You”): those link in the tables, which know their term, and where a writer marks them. Nor a form shorter than three letters (“Ox”), which never links by itself. A Chinese term’s name that holds another entry’s, as the star “Travelling Horse” holds the animal “Horse”, is matched first, as the longer name: it links its own page once that is written and reads as plain words until then, so the word inside never leads to the wrong page (a combination’s name, a pillar’s “Yang Earth Dragon”, is made of its parts and does not hold them back). The solar terms also link by their aliases, which are names (their pinyin, “at Lichun”, and their other English names), and only as written, with their capital: in small letters « grand froid » or « au début du printemps » are everyday words (`AS_WRITTEN`); their family, “solar terms”, « termes solaires », links in small letters too. Run the link review (section 9) after every family and read what it would link.
- **Related**: five to eight ids, the family’s own entry first, then the nearest (the phase, the animal, the opposite, the same idea elsewhere); a family’s own entry lists all its members.

## 9. Checking a batch: the exact commands

From the repository (`cd /home/claude/o47` here). The heavy ones go through the lock on a shared machine (`flock $SP/heavy.lock -c '…'`).

1. **Build and status** (mistakes with file and line, warnings, then each family written or not, which can go live, and the pages whose Chinese name is still a suggestion):
   `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/encyclopedia/chinese-manifest.mjs --status`
2. **The encyclopedia’s tests**:
   `node --experimental-strip-types --import ./scripts/register-ts.mjs --test scripts/encyclopedia.test.mjs scripts/encyclopedia-chinese.test.mjs scripts/chinese-term-ids.test.mjs scripts/encyclopedia-figures.test.mjs scripts/encyclopedia-previews.test.mjs`
   `chinese-term-ids.test.mjs` fails when a family is fully written but not live, or live with an entry missing.
3. **The link review** (what every reading text would link, with contexts; read the new family’s forms):
   `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/encyclopedia/link-review.mjs $SP/link-review.md`
4. **Preview images** for the new core pages (needs the Chromium of `/opt/pw-browsers` and the system’s Noto CJK fonts; the previews test fails until they are drawn):
   `node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/encyclopedia/previews.mjs`
5. **Typecheck, units and lint**: `npx tsc --noEmit -p .`; `npm run test:unit`; `npx eslint src scripts`.
6. **The browser suites** (the brief’s `PLAYWRIGHT_BROWSERS_PATH`): `node scripts/e2e/encyclopedia.mjs`, `reading.mjs`, `bazi.mjs`, `zodiac.mjs`, `zodiac-time.mjs`, `fengshui.mjs`; after `npm run build`, `enc-offline.mjs`, and the budgets (`scripts/perf/budgets.mjs bundle`: the encyclopedia’s rows and “/” within their limits).
7. **By eye**, in both languages: a new page on a phone and a computer; a newly live word in BaZi’s board and table and in the zodiac’s wheel and table, its short card on hover or focus, its page on a click.

## 10. How a family goes live

1. Every entry of the family is written in both languages and the build has no mistake and no warning.
2. Add the family to `LIVE_FAMILIES` in `src/lib/chinese/term-live.ts` (with a comment naming the part). From then on every word of it links: the tables’ cells (`ChineseTermWord`), a reading’s “In the encyclopedia” (`ChineseReadingTerms`) and its running text (the lexicon).
3. Update the tests that name what is live (`scripts/encyclopedia-chinese.test.mjs`: the live families, a word that does or does not link yet) and the home texts that say what comes next.
4. Run section 9 in full, and draw the previews.
5. Add one line per language to What’s new (`src/lib/changes.ts`), in the entry of the version that brings it, in its place. (Every family went live with 2.0; this is for a family added later.)

## Appendix A. The manifest’s 44 suggested names, checked against the engine (23 October 2026)

“Shown” means the engine writes the name in a text or mark a reader sees; “notes” means only in the code’s comments; “none” means nowhere in `src/`. Every one is still to be checked in a dictionary by the owner before it counts as the engine’s; the ones marked ✓ are written in the encyclopedia already, with the comment of section 3.

| Entry | Suggested name | The engine | Written |
| --- | --- | --- | --- |
| na-yin | 納音 纳音 nàyīn | shown (catalog: 納音, characters); notes (names.ts: 納音 nàyīn) | |
| trigram | 八卦 bāguà | notes (fengshui.ts: 後天八卦) | |
| hidden-stems | 藏干 cánggān | notes (names.ts: 地支藏干, characters) | ✓ |
| lo-shu | 洛書 洛书 luòshū | none | ✓ |
| year-animal | 年支 niánzhī | none (it means “the year’s branch”) | ✓ |
| month-animal | 月支 yuèzhī | none (“the month’s branch”) | ✓ |
| day-animal | 日支 rìzhī | none (“the day’s branch”) | ✓ |
| hour-animal | 時支 时支 shízhī | none (“the hour’s branch”) | ✓ |
| ben-ming-nian | 本命年 běnmìngnián | shown, characters and pinyin (zodiac-time-texts.ts, YEAR_TEXTS.same) | ✓ |
| ten-god | 十神 shíshén | notes, characters and pinyin (bazi.ts) | ✓ |
| life-stage | 十二長生 十二长生 shí’èr chángshēng | notes (bazi-signs.ts: 十二長生) | |
| shen-sha | 神煞 shénshà | notes, characters and pinyin (bazi-signs.ts) | |
| structure | 格局 géjú | notes (bazi-balance.ts: 格局) | |
| year-pillar, month-pillar, day-pillar, hour-pillar | 年柱 niánzhù, 月柱 yuèzhù, 日柱 rìzhù, 時柱 时柱 shízhù | none | |
| empty-branches | 空亡 kōngwáng | shown, characters and pinyin (bazi-reading.ts, the reading’s kicker) | |
| favourable-phases | 喜用神 xǐyòngshén | none | |
| luck-pillar | 大運 大运 dàyùn | shown (the luck readings’ mark 大運, characters) | |
| annual-pillar, monthly-pillar, daily-pillar | 流年 liúnián, 流月 liúyuè, 流日 liúrì | notes (bazi-luck.ts, characters) | |
| partner-palace | 夫妻宮 夫妻宫 fūqīgōng | shown (catalog: 夫妻宮, characters) | |
| kua | 命卦 mìngguà | notes, characters and pinyin (fengshui.ts) | |
| mansion | 八宅 bāzhái | shown (Feng Shui readings’ mark 八宅, characters) | |
| mountain | 二十四山 èrshísì shān | notes (fengshui-home.ts: 二十四山) | |
| flying-star | 玄空飛星 玄空飞星 xuánkōng fēixīng | notes (fengshui-stars.ts: 玄空飛星) | |
| period | 三元九運 三元九运 sān yuán jiǔ yùn | notes (fengshui-home.ts: 三元九運) | |
| period-1 … period-9 | 一運 yī yùn … 九運 jiǔ yùn | none (九運 only inside 三元九運) | |
| facing | 向 xiàng | shown, characters and pinyin, inside the formations’ names (fengshui-stars-texts.ts: 旺山旺向 wàng shān wàng xiàng) | |
| luopan | 羅盤 罗盘 luópán | shown (the home reading’s mark 羅盤, characters) | |
| flying-star-chart | 飛星盤 飞星盘 fēixīngpán | none | |
| replacement-chart | 替卦 tìguà | notes (fengshui-home.ts, fengshui-stars.ts: 替卦) | |
| annual-stars, monthly-stars | 流年飛星 liúnián fēixīng, 流月飛星 liúyuè fēixīng | none | |

Where the engine writes the characters it writes the manifest’s; where it writes the pinyin, the manifest’s too. Nothing found disagrees.
