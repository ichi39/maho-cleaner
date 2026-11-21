# 開発資料(改修を引き継ぐ人へ)

仕様は [SPEC.md](SPEC.md) にあります。この文書は、コードをどう触ればよいか、どこに落とし穴があるかをまとめたものです。

## 1. ファイルの作り

`index.html` の1ファイルに、次の順で入っています。

| 部分 | 内容 |
|---|---|
| `<style>` | すべての CSS |
| `<body>` の各 `<section class="screen">` | 画面ごとの HTML。モーダルも同じ場所にある |
| `<script>/*VOICE_DATA_START*/…/*VOICE_DATA_END*/</script>` | 声のデータ(`tools/make-voice.js` が書き換える。今は空 `{}`) |
| `<script>/*BGM_DATA_START*/…/*BGM_DATA_END*/</script>` | BGM のデータ(約2.7MB。`tools/make-bgm.js` が書き換える) |
| `<script>'use strict'; …</script>` | ゲーム本体 |

- **しるし(START/END)の中は手で直さないでください。** 道具が丸ごと書き換えます。
- 本体のコードは、コメントの見出し `/* ========= 名前 ========= */` で区切ってあります。主な見出しは次のとおりです(上から順)。

| 見出し | 中身 |
|---|---|
| ユーティリティ | `$`, `$$`, `rnd`, `shuffle`, `shade`(色を明るく・暗く), `mulberry`(シード付き乱数) |
| ドット絵描画 | `D` クラス(22×22 の点の配列)、`bake`(縁取りを付けて 24×24 の canvas にする)、`spr(kind,opt)`(キャッシュ付き。`.c` がカラー、`.g` が灰色) |
| スプライト定義 | `K = { 絵の種類: (d,o)=>{…} }`。物・人物・人形・服(`wear`)・アイコンなど |
| ゲームデータ | `ROWS`/`POOL`(50音)、`THEMES`(部屋の色)、`CATS`(お店)、`ITEMS`、`COLS`(服の色)、`CLIENTS`、保存データの読み込み |
| 依頼づくり | `allowed`, `pickItems`, `pickColor`, `makeRequest`, `greetText`, `thanksText` |
| おと | 効果音・BGM・声・音の設定。下の「4. 音の仕組み」を参照 |
| パーティクル / 部屋の背景 | `burst`, `stepParts`, `makeBg(テーマ番号 / 'home' / 'mine')` |
| 画面管理 | `show`, 片付ける部屋(`drawRoom`, `openRequest`, `showClear`, `leaveClient`) |
| パズル | `openPuzzle`, `layoutPuzzle`, ドラッグ処理, `arrive`, `completePuzzle`, `finishItem`, `drawPuzzle` |
| タイトル画面 | `drawTitle` |
| しょうてんがい と おみせ | 品ぞろえ(`genStock`, `stockOf`)、商店街(`onShow.shelf`, `drawFront`)、お店の中(`openShop`, `drawShop`, `buyEntry`)、届いた箱(`openBoxUI`) |
| じぶんの おへや | 人形(`drawDoll`)、持ち物の段(`renderMine`)、ドラッグ、おもちゃ箱(`drawToybox`) |
| おそうじ屋さん | 自分のお店(`drawHome`, `spawnClient`, `tapClient`, 支払い, 吹き出し, 飾り) |
| まほうの にっき | `NOTE`(全部の物の感想)、`renderDiary`, `addDiary`, `addEvent` |
| ちいさな ゴール | スタンプ、お店の星(`onServed`, `rankOf`, `drawRankDecor`)、ごほうび(`openGift`, `giftChoices`) |
| 1にちの ながれ | `newDay`, `drawSky`, `checkClose`, `showDayEnd`, `goMorning` |
| おでかけ | `transit`, 自分のお店のドア(`drawDoor`, `goShopping`, `comeHome`)、商店街の魔女(`walkStreet`, `enterShop`, `leaveStreet`) |
| ボタン・メインループ | ボタンの登録、チュートリアル、`frame()`(毎コマ、今の画面の draw 関数を呼ぶ) |

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
| `day` | その日の状態(`n`, `quota`, `done`, `served`, `met`, `items`, `coins`, `closed`, `next`) |
| `stock` | その日の品ぞろえ `{n:日, shops:{お店:[{k,slot,sale,tz}]}}` |
| `keeper` | お店ごとの店番(お客さんの番号) |
| `stamps` / `servedTotal` | スタンプの数 / 支払いを受けた合計人数 |
| `diary` / `events` / `dayLog` | 日記の3つのタブの中身 |
| `aud` | 音の設定 `{bgm,sfx,voice}` |
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
1. `tools/make-bgm.js` の `BGM_SONGS`(テンポ・調・コード・リズム・楽器)を直す。
2. `node tools/make-bgm.js` を実行して、`index.html` の `BGM_DATA` を書き換える。
- 曲は IMA ADPCM(4bit、16kHz)で埋め込んでいます。ゲームの中では wav に戻して `<audio>` で流します。
- 曲を足すときは、`wantBgm()` にその曲を流す場面を書きます。お店の種類と同じ名前なら、自動でその部屋とお店で流れます。

### 声を作る(まだ作っていません)
この作業環境には日本語の読み上げソフトがないため、`VOICE_DATA` は空のままです。今は端末の読み上げで読んでいます。
1. Mac で `bash tools/make-voice-mac.sh` を実行する(Kyoko の声で217個作り、埋め込むまで自動)。
   - 声の種類や速さは `VOICE=Otoya RATE=140 bash tools/make-voice-mac.sh` のように変えられる。
2. 言葉を足したときは、もう一度実行する(一覧 `tools/voice-list.txt` は `ITEMS` から自動で作る)。
3. 自分で録音した wav でも、`tools/voice-wav/0001.wav …` の番号を一覧の順にそろえれば、`node tools/make-voice.js embed tools/voice-wav` で入れられる。
- 前後の無音は自動で削ります。大きさは約1.2MB増える見込みです。

## 5. よくある改修

### 物を足す
1. 絵がなければ、`K` に絵の関数を足す(22×22。`d.r`=四角, `d.e`=だ円, `d.t`=台形, `d.l`=線, `d.p`=点)。縁取りは自動で付く。
2. `A2('お店',[['ことば','絵の種類',{設定}], …])` に足す。服なら `W('部位の種類',{c:色})` を使い、`K.wear` に人形に着せたときの絵を足して、`SLOT_OF_` に部位を書く。
3. `NOTE` に、日記の感想(ひらがな)を足す。
4. 声を作っているなら、`make-voice-mac.sh` をもう一度実行する。

### お客さんを足す
`CLIENTS` に1人足します。必要な項目は、名前・見た目・`fav`/`dis`/`favC`・セリフの全部です。セリフは全部ひらがなにしてください。

### 数値を変える
値段 `priceOf`、お礼 `S.gain`、1日の人数 `newDay`、スタンプ `STAMP_MAX`、星 `RANKS`、難しさ `allowed` と `pickItems`。変えたら SPEC.md も直してください。

## 6. 確かめ方

- 自動テストはありません。開発中は Playwright(ブラウザを自動で動かす道具)で、画面を開いて操作し、状態とコマの時間を調べていました。
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

- [ ] 声のデータを Mac で作って埋め込む(`tools/make-voice-mac.sh`)。
- [ ] iPhone で、完成時の時間(おとテストの「さいごの かんせい」)を測って、間が空いていないか確かめる。
- [ ] `index.html` が大きい(BGM で約3MB。声を入れると約4.3MB)。気になるなら、曲の長さを短くするか、サンプリングレートを下げる(`make-bgm.js` の `SR`)。
- [ ] 古い仕様の名残が残っている。使っていない CSS(`.shopbtn`, `.stabs`, `#buyBar`, `.rbub`)、なかよし度の関数(`hearts`, `heartsHTML`, `needOf`)、使っていない保存データのキー。
- [ ] タイトルの「買い物」ボタンは、ドアを通らずに直接商店街へ行く(帰りは自分のお店に戻る)。
- [ ] カタカナの「ヲ」と「ヌ」は、出てくる言葉がない(「ヌ」は、ヌードルを ラーメン に直したため)。「ヌ」を含む言葉(例: カヌー)を足せば戻せる。確認は dev/shop-items.html の「もじ表」で。
- [ ] 1日の人数、お金、値段の釣り合いは、実際に遊んで調整する余地がある。
