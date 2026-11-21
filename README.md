# 魔法のお掃除屋さん(maho-cleaner)

ひらがな・カタカナを、遊びながら自然に覚えるためのブラウザゲームです。
魔女のお掃除屋さんになって、お客さんの依頼を受けます。散らかったお店にある、文字がばらばらになった物を直していきます。
勉強を意識させないことを大切にしています。

- 遊ぶ: https://ichi39.github.io/maho-cleaner/
- 対象: 文字を覚え始めた子ども(主に iPhone Safari で確認)
- 形式: `index.html` 1ファイルで完結します(外部ファイル・通信なし)。GitHub Pages で公開しています。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | ゲームの仕様(遊びの流れ、各画面、数値、決まりごと) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 改修する人向けの資料(コードの構成、保存データ、音の仕組み、道具、確認方法、注意点、残っている課題) |

## すぐに動かす

```bash
# そのまま開くだけで動きます
open index.html            # Mac
# または簡単なサーバーで
python3 -m http.server 8000   # → http://localhost:8000/
```

ビルドは不要です。`index.html` を直接編集します。

## リポジトリの中身

```
index.html                ゲーム本体(HTML/CSS/JS と、埋め込んだ BGM・声のデータ)
tools/make-bgm.js         BGM を前もって作り、index.html に埋め込む道具(Node.js)
tools/make-voice.js       読み上げの声を index.html に埋め込む道具(Node.js)
tools/make-voice-mac.sh   Mac の声で全部の声を作って埋め込むスクリプト
tools/voice-list.txt      読み上げる文字・言葉の一覧(make-voice.js list で作る)
dev/doll-lab.html         人形のフォルムと服を見比べる開発用画面(ゲームとは別。ブラウザで開くだけ)
docs/                     仕様と開発資料
```
