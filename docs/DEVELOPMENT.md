# 開発資料(改修を引き継ぐ人へ)

仕様は [SPEC.md](SPEC.md) にあります。この文書は、コードをどう触ればよいか、どこに落とし穴があるかをまとめたものです。

## 1. ファイルの作り

`index.html` の1ファイルに、次の順で入っています。

| 部分 | 内容 |
|---|---|
| `<style>` | すべての CSS |
| `<body>` の各 `<section class="screen">` | 画面ごとの HTML。モーダルも同じ場所にある |
| `<script>/*VOICE_DATA_START*/…/*VOICE_DATA_END*/</script>` | 声のデータ(`tools/make-voice.js` が書き換える。今は空 `{}`) |
| `<script>/*BGM_DATA_START*/…/*BGM_DATA_END*/</script>` | BGM のデータ(約3.0MB。`tools/make-bgm.js` が書き換える) |
| `<script>'use strict'; …</script>` | ゲーム本体 |

- **しるし(START/END)の中は手で直さないでください。** 道具が丸ごと書き換えます。
- 本体のコードは、コメントの見出し `/* ========= 名前 ========= */` で区切ってあります。主な見出しは次のとおりです(上から順)。

| 見出し | 中身 |
|---|---|
| ユーティリティ | `$`, `$$`, `rnd`, `shuffle`, `shade`(色を明るく・暗く), `mulberry`(シード付き乱数) |
| ドット絵描画 | `D` クラス(22×22 の点の配列)、`bake`(縁取りを付けて 24×24 の canvas にする)、`spr(kind,opt)`(キャッシュ付き。`.c` がカラー、`.g` が灰色) |
| スプライト定義 | `K = { 絵の種類: (d,o)=>{…} }`(22×22)。物・人物・アイコンなど。`K.doll` は、ねこの小さなアイコン(持ち物の段・チュートリアル用)。`K.wear` は、服のアイコン(`wi`)の元で、部屋の人形には使いません |
| ゲームデータ | `ROWS`/`POOL`(50音)、`THEMES`(部屋の色)、`CATS`(お店)、`ITEMS`、`COLS`(服の色)、`CLIENTS`、保存データの読み込み |
| 依頼づくり | `allowed`, `pickItems`, `pickColor`, `makeRequest`, `greetText`, `thanksText` |
| おと | 効果音・BGM・声・音の設定。下の「4. 音の仕組み」を参照 |
| パーティクル / 部屋の背景 | `burst`, `stepParts`, `makeBg(テーマ番号 / 'home' / 'mine')` |
| 画面管理 | `show`, 片付ける部屋(`drawRoom`, `openRequest`, `showClear`, `leaveClient`) |
| パズル | `openPuzzle`, `layoutPuzzle`, ドラッグ処理, `arrive`, `completePuzzle`, `finishItem`, `drawPuzzle` |
| タイトル画面 | `drawTitle` |
| しょうてんがい と おみせ | 品ぞろえ(`genStock`, `stockOf`)、商店街(`onShow.shelf`, `drawFront`)、お店の中(`openShop`, `drawShop`, `buyEntry`)、届いた箱(`openBoxUI`) |
| じぶんの おへや | 人形(`drawDoll` → `CATDOLL.get`)、持ち物の段(`renderMine`)、ドラッグ、おもちゃ箱(`drawToybox`) |
| ねこの にんぎょう | `/*CATDOLL_START*/ … /*CATDOLL_END*/` の間。32×32ドット。`dev/cat-lab.html` から `tools/sync-catdoll.js` で取りこむ(直接直さない)。下の「ねこの にんぎょう」を参照 |
| おそうじ屋さん | 自分のお店(`drawHome`, `spawnClient`, `tapClient`, 支払い, 吹き出し, 飾り) |
| まほうの にっき | `NOTE`(全部の物の感想)、`renderDiary`, `addDiary`, `addEvent` |
| ちいさな ゴール | スタンプ、お店の星(`onServed`, `rankOf`, `drawRankDecor`)、ごほうび(`openGift`, `giftChoices`) |
| 1にちの ながれ | `newDay`, `drawSky`, `checkClose`, `showDayEnd`, `goMorning` |
| おでかけ | `transit`, 自分のお店のドア(`drawDoor`, `goShopping`, `comeHome`)、商店街の魔女(`walkStreet`, `enterShop`, `leaveStreet`) |
| おしろの としょしつ | `LB`(状態)、`lbEnterHall`(ロビー)、`lbStart`(言葉を決める)、`lbWipe`(ほこり)、`lbArrive`(はめる)、`lbStartMelody` → `lbStartMorph` → `lbStartMagic`(完成の演出)、`lbShelve`(本棚へ)、`lbAudCheer`(下の人たち)、`lbSetWeather`(天気)、`drawLibrary`。名前は `lb` / `LB` で始まる。仕様は SPEC.md 14.5 |
| てんき・ほしの へや | `wxSky`(窓の天気)、`drawStreetWeather`(商店街)、`wxDayEnd`、`COLTABS` / `colRender`(星の部屋)。仕様は SPEC.md 14.5・14.6 |
| ボタン・メインループ | ボタンの登録、チュートリアル、`frame()`(毎コマ、今の画面の draw 関数を呼ぶ) |

### お店(`CATS`)の内部名と表示名

内部名(コードの `cat`・BGM のキー・`CAT_THEME`)は、昔の名前のまま残っているものがあります。表示名と食い違うので注意してください。

| 内部名 | 表示名 | 部屋の色(`THEMES`) | BGM |
|---|---|---|---|
| `clothes` | ようふくやさん | 0 | clothes |
| `toy` | おもちゃやさん | 1 | toy |
| `animal` | どうぶつやさん | 8(そうげん) | animal(昔の `denki` の曲) |
| `fruit` | やおやさん(くだもの+やさい) | 2 | fruit |
| `sweets` | たべものやさん(おかし+ごはん) | 4 | sweets |
| `books` | ほんやさん | 3 | books |
| `music` | おんがくやさん | 3 | music |
| `home` | ざっかやさん | 6 | home |
| `nature` | しぜんの おみせ | 5 | nature |

お店の並び順(`CATS` の順)が、商店街の並びと、開発ページ(`dev/shop-items.html`)の番号(1xx〜9xx)になります。お店を足す・消すときは、`CATS`・`CAT_THEME`・`THEMES`・`CLIENTS` の `fav`/`dis`・`tools/make-bgm.js` の曲を合わせて直してください(古いセーブの `reqs` は `cleanSave()` が、なくなったお店の分を捨てます)。

## 2. よく使う変数

| 変数 | 役割 |
|---|---|
| `save` | 保存データ(下の「3. 保存データ」を参照)。変えたら `persist()` |
| `screen` | 今の画面の id |
| `S` | 片付けや画面まわりの一時的な状態(`S.r` = 今の依頼など) |
| `P` | パズルの状態(`P.L` = 動かせる文字, `P.slots` = ガイド, `P.tl` = 完成時の時間の記録) |
| `H` | 自分のお店の状態(`H.cs` = お客さん, `H.w` = 魔女の位置, `H.door`) |
| `M` | 自分の部屋の状態(選んだ物、ドラッグ中、しまう動き) |
| `SH` | お店の中の状態(`SH.cat`, `SH.sel`, `SH.anim`) |
| `AU` | 音の状態(下の「4. 音の仕組み」を参照) |
| `TR` | 画面の切り替えの最中かどうか |

- 描画は canvas で、論理サイズは部屋・お店・自分の部屋・自分のお店が 240×150、パズル上の絵が 150×120 です。CSS で拡大し、`image-rendering: pixelated` で点をくっきり見せています。
- パズルの文字は別の canvas(`#lc`)に、端末の解像度で描いています。
- タップの位置は `roomPoint(canvas, event, 240, 150)` で論理座標に直します。

### ねこの にんぎょう(`CATDOLL`)

部屋の人形は、白いねこです。絵は32×32ドット(縁取り込みで34×34の canvas)で、ほかの絵(22×22)とは別あつかいです。`DSZ=68` は、その2倍で、ドットがきれいに出ます。

- **仕組み**: 体の寸法(リグ。あご・かた・こし・足のつけねの行、うでの位置と幅など)を先に決めて、服はその寸法から計算して描きます。服ごとに数字を持たないので、体を変えても服はずれません。
- **合成**: 奥(はね)→体→顔→手前の服(部位の順 `SLOTS[z]`)の順に重ねます。かさ(`held`)がいちばん手前です。外がわに1本の縁取りを付け、服が体や別の服に触れる所は、その服の色の暗い色にします(`innerEdge`)。
- **耳**: 頭の上に重ねて描きます。ぼうし・ヘルメット(`hat`)のときだけ、帽子より手前に出して、あなから出ているように見せます。
- **キャッシュ**: 同じ着せかえは、一度作った canvas を使い回します(`CATDOLL.get(save.doll.wear)`)。保存の形(`wear:{部位:キー}`)は、これまでと同じです。
- **服の絵の引き当て**: `wearKind(it)`(服の種類)で `WEAR[種類]` を選び、`it[2]` の `c`・`c2`・`t`(`ブーツ` の `tall:1` は `t:'tall'` に直す)を渡します。
- **直し方**: ねこの形や服の絵は、`dev/cat-lab.html` で直して見比べます。そのあと `node tools/sync-catdoll.js` で `index.html` に取りこみます(`--check` で、ずれていないか調べられます)。
- **注意**: 持ち物の段・お店・日記の「服のアイコン」は、22×22の別の絵(`K.shirt` など、`wi` は `K.wear`)です。ねこに着せた絵を直しても、アイコンは変わりません。

## 3. 保存データ(localStorage `maho-cleaner-3`)

読み込みのあとに `cleanSave()` が走り、なくなった言葉の持ち物などを取り除きます。

| キー | 中身 |
|---|---|
| `seen` | 文字ごとの、正しくはめた回数(難しさの調整に使う) |
| `got` / `gotC` | 直したことのある言葉 / 言葉ごとに直した色の番号 |
| `owned` | 持ち物(キーは `言葉` または `言葉#色`) |
| `deliv` | 届いていて、まだ開けていない箱 |
| `placed` | 自分の部屋に置いた物 `{w,x,y}` |
| `doll` | 人形の位置と、着ている物 `wear:{部位:キー}` |
| `coins` | お金 |
| `reqs` | 今ある依頼(`items`, `done`, `leaving`, `hx` = 元いた位置, `gain`) |
| `day` | その日の状態(`n`, `min`(時計・分), `end`(閉店時刻・分), `cap`(最大人数), `spawned`, `done`, `served`, `met`, `items`, `coins`, `closed`, `next`) |
| `stageP` / `stageDone` / `stagePending` / `cleared` | まほうの みち(進み具合・もらった段・未受取のごほうび・クリア済み) |
| `cleared` / `festSeen` | クリア済み(商店街にちょうちん) / 商店街の花火を見せた |
| `conste` / `newShops` | 完成した星座 / 開いたばかりのお店(お店に戻ったとき知らせる) |
| `stock` | その日の品ぞろえ `{n:日, shops:{お店:[{k,slot,sale,tz}]}}` |
| `keeper` | お店ごとの店番(お客さんの番号) |
| `libWins` / `libDone` / `libOrder` / `libRecent` / `weather` | 図書室で完成した回数 / 言葉ごとの完成回数 / 初めて完成した言葉の順(本棚の背表紙) / 直近6語 / 天気 `{type,day}`(1日で消える) |
| `castleSeen` / `ate` / `colDone` | おしろのお祝いを見たか(最初の1回だけ) / 食べさせた食べ物 / 星の部屋でお祝いした棚 |
| `jar` / `rest` | 貯金びんのコイン(商店街の復興だけに使う。おさいふとは別) / お店ごとの復興 `{お店:{l:段階0〜2,c:今の段階に入れたコイン}}`(`REST`・`restApply`・`tierOf`) |
| `dream` / `dreamDay` / `dreamH` | 人形がぼんやり思っている食べ物(`{w,n(思った日),lb(依頼に混ぜた回数)}`、4日で期限切れ) / 最後に雲を出した日(1日1回まで) / 直近に思った物(最大5) |
| `stamps` / `servedTotal` | スタンプの数 / 支払いを受けた合計人数 |
| `diary` / `events` / `dayLog` | 日記の3つのタブの中身 |
| `aud` | 音の設定 `{bgm,sfx,voice}` |
| `offered` / `fixN` / `recentCat` | お店に最後に並べた日(`{かぎ:日}`、並べる順を回すため) / 言葉ごとに直した回数(依頼で少ない物を優先) / 直近の依頼のお店 |
| `tut`, `tutDrag`, `shopSeen`, `mineUnlocked`, `diaryNew`, `made`, `recent*`, `lastCl` | 案内を出したか、などの小さな記録 |

**互換性を壊す変更**をするときは、キーの名前(`maho-cleaner-3`)を上げるか、`cleanSave()` に変換を書いてください。今までに2回キーを変えて、記録を消しています。

古い仕様の名残で、今は使っていないキーもあります(`shown`, `snd`, `friend`, `pendingGift`, `days`)。

## 4. 音の仕組み(いちばん苦労した所)

iPhone Safari で何度も試して、今の形になりました。**直すときは、必ず iPhone の実機で確かめてください。**

### iPhone で分かったこと
- **`<audio>.play()` は、鳴らすたびに重い。** iOS が音の設定(AVAudioSession)を組み直すので、短い効果音に使うと画面が一瞬止まる。
- **Web Audio は、マナーモードのスイッチで消える。** `<audio>` は消えない。
- **`speechSynthesis`(端末の読み上げ)を使うと、Web Audio が止まる。** 止まった Web Audio は、画面に触れた瞬間にしか戻せない。
- **`speechSynthesis` は、話し始めるまで時間がかかる。** `cancel()` の直後に読ませた声は捨てられることがある。語尾に「。」がないと、終わりが切れることがある。
- **iPhone では、`<audio>` の音量をプログラムから変えられない。**

### 今の作り
| 種類 | 鳴らし方 | 理由 |
|---|---|---|
| 効果音 | Web Audio の AudioBuffer(最初のタッチで全部作る) | 鳴らすのが速く、止まらない |
| BGM | `<audio>` 2つを交互に使う(最初のタッチで1度鳴らしておく) | 声で Web Audio が止まっても、タッチなしで鳴り直せる |
| 声 | `VOICE_DATA` があれば Web Audio、なければ `speechSynthesis` | 前もって作った声なら、待ち時間も Web Audio の停止もない |
| マナーモード対策 | 無音の `<audio>` を繰り返し流す + `navigator.audioSession.type='playback'` | Web Audio をマナーモードでも鳴らすため |

- `AU.ctx`(AudioContext)が止まったかは、0.4秒ごとに `currentTime` が進んでいるかで調べます。止まっていたら `AU.dead` にして、次のタッチで `rebuildCtx()`(作り直し)します。
- BGM はパズル中は止めます(`wantBgm()` が `null` を返す)。曲を音に戻す処理も、パズル中とドラッグ中は休みます(`busyNow()`)。
- 重い処理は、1回4ミリ秒までに分けます(曲の展開など)。画面が止まらないようにするためです。
- タイトル左下の「おとテスト」で、音の状態と、直前に完成したパズルの時間の記録が見られます。

### BGM を変える
(おしろのクリア曲 `castle` は、手書きのメロディとコード(`mel` / `ch`)で作る曲です。メロディに重ねる音は `dbl` で決めます。)
1. `tools/make-bgm.js` の `BGM_SONGS`(テンポ・調・コード・リズム・楽器)を直す。
2. `node tools/make-bgm.js` を実行して、`index.html` の `BGM_DATA` を書き換える。
- 曲は IMA ADPCM(4bit、16kHz)で埋め込んでいます。ゲームの中では wav に戻して `<audio>` で流します。
- 曲を足すときは、`wantBgm()` にその曲を流す場面を書きます。お店の種類と同じ名前なら、自動でその部屋とお店で流れます。

### 声を作る(VOICEVOX)
読み上げの声は VOICEVOX(既定は 春日部つむぎ ノーマル)で作り、`VOICE_DATA` に埋め込んでいます。きまりにより、タイトル画面の下に「こえ: VOICEVOX:キャラ名」を出しています(`VOICE_CREDIT`)。
1. VOICEVOX アプリ(https://voicevox.hiroshiba.jp/)を開いた状態で、`node tools/make-voice-voicevox.js` を実行する(一覧を作り直し、全部作って埋め込むまで自動)。
   - 声は `SPEAKER=四国めたん STYLE=ノーマル node tools/make-voice-voicevox.js` のように変えられる(`… speakers` で一覧)。声を変えたら、そのキャラの利用規約を確かめる。
2. イントネーションが変な言葉は `dev/voice-check.html` の ✎ で直す。アクセントつきのカナ(例: `カ'メ`)や話速・抑揚・音高を変えて、その場で VOICEVOX で試せる。決まった行を `tools/voice-accent.txt` に貼って、1. をもう一度実行する。
3. 1音ずつの高さまで直したいときは、VOICEVOX アプリで調整して wav に書き出し、`tools/voice-manual/ことば.wav` に置く(そのまま使われる)。
4. 言葉を足したときは、1. をもう一度実行する(一覧 `tools/voice-list.txt` は `ITEMS` から自動で作る)。
- Mac の声(Kyoko)で作る `bash tools/make-voice-mac.sh` も残してあります(VOICEVOX が使えないときの予備)。
- 前後の無音は自動で削ります。大きさは約1.2MB増える見込みです。

## 5. よくある改修

### 物を足す
1. 絵がなければ、`K` に絵の関数を足す(22×22。`d.r`=四角, `d.e`=だ円, `d.t`=台形, `d.l`=線, `d.p`=点)。縁取りは自動で付く。
2. `A2('お店',[['ことば','絵の種類',{設定}], …])` に足す(お店の中の順番が、`dev/shop-items.html` の番号になります)。服なら `W('部位の種類',{c:色})` を使い、`SLOT_OF_` に部位を書く。ねこに着せた絵は `dev/cat-lab.html` の `WEAR` に足して、`node tools/sync-catdoll.js` で取りこむ(アイコンは `K.wear` / 専用の `K.xxx`)。
3. `NOTE` に、日記の感想(ひらがな)を足す。
4. `node tools/make-voice.js list` で、読み上げの一覧 `tools/voice-list.txt` を作り直す(**手で書き足さない**。新しい言葉に出てくる新しい文字(例: ぎ・じ)の1文字の読み上げが、抜けてしまう)。声を作っているなら、そのあと `make-voice-mac.sh` をもう一度実行する。
   - 「とくべつ」(ごほうびの服)の言葉は、これまでも読み上げの対象外です。

### お客さんを足す
`CLIENTS` に1人足します。必要な項目は、名前・見た目・`fav`/`dis`/`favC`・セリフの全部です。セリフは全部ひらがなにしてください。

### 数値を変える
値段 `priceOf`、お礼 `S.gain`、1日の人数 `newDay`、スタンプ `STAMP_MAX`、星 `RANKS`、難しさ `allowed` と `pickItems`。変えたら SPEC.md も直してください。

## 6. 確かめ方

- **マージの前に、必ず次の2つを実行する。**
  - `node tools/smoke-test.js` … ゲームの script を、にせの画面環境で実際に動かす「けむりテスト」です。読み込み、毎コマの描画、依頼づくり、お客さんの見た目、持ち物の段、ねこの着せかえ(全部の服と色違い)、全部の部屋の背景を通します。**定義が消えて、ゲームが動かなくなる**ような壊れ(ReferenceError)を見つけられます。(お店の再編で `isWear` などの定義を消して、本番のゲームが動かなくなったことがあります。)
  - `node tools/sync-catdoll.js --check` … `index.html` のねこ(`CATDOLL`)が、`dev/cat-lab.html` と同じか調べます。
  - どちらもブラウザの代わりではありません。見た目、音、iPhone での動きは、実際に開いて確かめます。
- 食べ物のリアクションや、時間帯ごとの窓・商店街、閉店・1日のまとめの演出は、`dev/play-lab.html` で確かめます。ゲーム本体を `index.html?lab` で埋め込みます。`?lab` のときはセーブを読まず、書きません(`LAB`)。ボタンはゲームの関数(`startEat`、`show` など)を直接呼ぶので、関数名を変えたらラボも直してください。
- 絵や品ぞろえは、`dev/shop-items.html`(お店ごとの一覧・もじ表)と `dev/cat-lab.html`(ねこの着せかえ)で見て確かめます。
- 自動テスト(けむりテスト以外)はありません。開発中は Playwright(ブラウザを自動で動かす道具)で、画面を開いて操作し、状態とコマの時間を調べていました。
  - 例: 文字をドラッグしてはめる、1コマが17ミリ秒を超えないか、読み上げの順番(`speechSynthesis.speak` を差し替えて記録する)。
  - iPhone のふりをしたいときは、userAgent を iPhone にした context を作ると、iPhone 用の分岐を通せる。
- **音と止まりは、iPhone の実機でしか本当には確かめられません。** iPhone のふりをしたブラウザでは、音の順番までしか分かりません。
- 開発環境に日本語フォントがないと、文字が□になります(ゲームの不具合ではありません)。

## 7. 決まりごと

- **画面の文字はひらがな。** カタカナの物の名前だけは例外。数字は使ってよい。
- **操作と行き先は絵で分かるようにする。** 文字のボタンを増やさない。
- 勉強っぽい表示(正解率、覚えた文字の一覧、「ポイント」)は出さない。
- 気持ちよさを最優先にする。特に、文字がはまる瞬間に画面が止まらないこと。重い処理はパズル中に入れない。
- コードのコメントは、ひらがな中心で書いている(そろえなくても動作には関係ない)。

## 8. 残っている課題

- [x] 声のデータを作って埋め込む(VOICEVOX、`tools/make-voice-voicevox.js`)。
- [ ] iPhone で、完成時の時間(おとテストの「さいごの かんせい」)を測って、間が空いていないか確かめる。
- [ ] `index.html` が大きい(BGM で約3MB。声を入れると約4.3MB)。気になるなら、曲の長さを短くするか、サンプリングレートを下げる(`make-bgm.js` の `SR`)。
- [ ] 古い仕様の名残が残っている。使っていない CSS(`.shopbtn`, `.stabs`, `#buyBar`, `.rbub`)、なかよし度の関数(`hearts`, `heartsHTML`, `needOf`)、使っていない保存データのキー。
- [ ] タイトルの「買い物」ボタンは、ドアを通らずに直接商店街へ行く(帰りは自分のお店に戻る)。
- [ ] カタカナの「ヲ」は、出てくる言葉がない。確認は dev/shop-items.html の「もじ表」で。
- [ ] ねこの人形(32×32)を、iPhone の実機で確かめる(表示の鮮明さ、着せかえの引っかかり)。
- [ ] 服のアイコン(22×22)と、ねこに着せた絵(32×32)は、別の絵。デザインをそろえるなら、アイコンも32×32から作り直す。
- [ ] 声(読み上げ)の一覧 `tools/voice-list.txt` は252個。声のデータは、まだ作っていない。
- [ ] 1日の人数、お金、値段の釣り合いは、実際に遊んで調整する余地がある。
