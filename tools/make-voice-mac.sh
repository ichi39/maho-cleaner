#!/bin/bash
# Mac で こえを つくって index.html に うめこむ。
# つかいかた: bash tools/make-voice-mac.sh          … いまある wav は のこし、ない ものと 読み替え表の ものだけ つくる
#             FULL=1 bash tools/make-voice-mac.sh   … wav を ぜんぶ けして、さいしょから つくる
# こえを かえる ときは VOICE を かえる(say -v '?' | grep ja で いちらんが でる)。
# 読み替え表(tools/voice-reading.txt)の ことばは、よみ・こえ(ない ときは REDO_VOICE)で つくり なおす。
set -e
cd "$(dirname "$0")/.."
VOICE="${VOICE:-Kyoko}"
REDO_VOICE="${REDO_VOICE:-Kyoko (Enhanced)}"
RATE="${RATE:-150}"
TABLE=tools/voice-reading.txt
node tools/make-voice.js list
[ "$FULL" = 1 ] && rm -rf tools/voice-wav
mkdir -p tools/voice-wav
i=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  i=$((i+1))
  wav="$(printf 'tools/voice-wav/%04d.wav' "$i")"
  entry=""
  [ -f "$TABLE" ] && entry=$(awk -F'\t' -v t="$line" '$1!~/^#/ && $1==t{print $2 "\t" $3; exit}' "$TABLE")
  if [ -n "$entry" ]; then
    text="${entry%%$'\t'*}"; v="${entry#*$'\t'}"
    [ -z "$text" ] && text="$line"
    [ -z "$v" ] && v="$REDO_VOICE"
    echo "つくりなおし $i: $line → $text ($v)"
    say -v "$v" -r "$RATE" --file-format=WAVE --data-format=LEI16@22050 -o "$wav" "$text"
  elif [ ! -f "$wav" ]; then
    say -v "$VOICE" -r "$RATE" --file-format=WAVE --data-format=LEI16@22050 -o "$wav" "$line"
  fi
done < tools/voice-list.txt
node tools/make-voice.js embed tools/voice-wav
echo "できました。index.html を ひらいて ためしてください。"
