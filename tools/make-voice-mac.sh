#!/bin/bash
# Mac で こえを つくって index.html に うめこむ。
# つかいかた: bash tools/make-voice-mac.sh(いまの ほんばんは VOICEVOX: node tools/make-voice-voicevox.js)
# こえを かえる ときは VOICE を かえる(say -v '?' | grep ja で いちらんが でる)。
set -e
cd "$(dirname "$0")/.."
VOICE="${VOICE:-Kyoko}"
RATE="${RATE:-150}"
node tools/make-voice.js list
rm -rf tools/voice-wav && mkdir -p tools/voice-wav
i=0
while IFS= read -r line; do
  [ -z "$line" ] && continue
  i=$((i+1))
  say -v "$VOICE" -r "$RATE" --file-format=WAVE --data-format=LEI16@22050 -o "$(printf 'tools/voice-wav/%04d.wav' "$i")" "$line"
done < tools/voice-list.txt
node tools/make-voice.js embed tools/voice-wav
echo "できました。index.html を ひらいて ためしてください。"
