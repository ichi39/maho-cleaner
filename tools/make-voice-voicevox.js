#!/usr/bin/env node
// まほうの おそうじやさん: VOICEVOX で よみあげの こえを ぜんぶ つくり、index.html に うめこむ。
//
// じゅんび: VOICEVOX(https://voicevox.hiroshiba.jp/)を いれて、アプリを ひらいておく(http://127.0.0.1:50021 で うごく)。
//
//  node tools/make-voice-voicevox.js speakers   … つかえる こえ(キャラと スタイル)の いちらん
//  node tools/make-voice-voicevox.js            … tools/voice-list.txt を つくりなおし、ぜんぶの こえを つくって うめこむ
//      SPEAKER=四国めたん STYLE=ノーマル node tools/make-voice-voicevox.js   … こえを かえる
//
// イントネーションの なおしかた(tools/voice-accent.txt)
//   ことば<TAB>よみ<TAB>オプション   の 1ぎょう。
//   よみ に ' が あれば、AquesTalk ふうの カナ として あつかう。' の まえの おとが さいごの たかい おと。
//     例: かめ	カ'メ      (あたまだかの カ↑メ↓)
//         りんご	リンゴ'    (へいばん。さいごに ' で へいばん)
//         ほんをよむ	ホ'ンヲ/ヨ'ム   (/ で アクセントの くぎり、、で ひとやすみ)
//   ' が なければ、その もじを そのまま よませる(漢字に すると アクセントが なおる ことが ある)。
//   オプション: speed=0.9 intonation=1.3 pitch=0.03 (VOICEVOX の 話速・抑揚・音高)
//   それでも なおらない ときは、VOICEVOX アプリで 1おとずつ たかさを なおして wav に かきだし、
//   tools/voice-manual/<ことば>.wav に おく(この wav が そのまま つかわれる)。
//
// できた もの: tools/voice-wav/NNNN.wav(git に いれない)、tools/voice-meta.json(dev/voice-check.html が よむ)、index.html
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..'),LIST=path.join(__dirname,'voice-list.txt'),ACCENT=path.join(__dirname,'voice-accent.txt');
const MANUAL=path.join(__dirname,'voice-manual'),OUT=path.join(__dirname,'voice-wav'),META=path.join(__dirname,'voice-meta.json');
const HOST=process.env.VOICEVOX_URL||'http://127.0.0.1:50021';
const SPEAKER=process.env.SPEAKER||'春日部つむぎ',STYLE=process.env.STYLE||'ノーマル';

async function api(p,opt={}){
  let r;try{r=await fetch(HOST+p,opt);}catch(e){throw new Error(`VOICEVOX に つながりません(${HOST})。アプリを ひらいてください`);}
  if(!r.ok)throw new Error(`${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r;
}
const q=o=>new URLSearchParams(o).toString();
const kata=s=>s.replace(/[\u3041-\u3096]/g,c=>String.fromCharCode(c.charCodeAt(0)+0x60));

function readAccent(){
  const m=new Map();if(!fs.existsSync(ACCENT))return m;
  for(const ln of fs.readFileSync(ACCENT,'utf8').split('\n')){
    if(!ln.trim()||ln.startsWith('#'))continue;
    const [w,read='',opt='']=ln.split('\t');const o={};
    for(const kv of opt.trim().split(/\s+/).filter(Boolean)){const [k,v]=kv.split('=');o[k]=+v;}
    m.set(w.trim(),{read:read.trim(),opt:o});
  }
  return m;
}

async function query(text,id,acc){
  const base=await (await api('/audio_query?'+q({text:acc&&acc.read&&!acc.read.includes("'")?acc.read:text,speaker:id}),{method:'POST'})).json();
  let kana=null;
  if(acc&&acc.read.includes("'"))kana=acc.read;
  else if([...text].length===1)kana=kata(text)+"'";/* 1もじは カナで よませる(じょしの「へ→え」などに ならない) */
  if(kana){
    try{base.accent_phrases=await (await api('/accent_phrases?'+q({text:kana,speaker:id,is_kana:'true'}),{method:'POST'})).json();}
    catch(e){if(acc)throw new Error(`${text} の よみ「${kana}」が よめません: ${e.message}`);}
  }
  const o=(acc&&acc.opt)||{};
  if(o.speed!=null)base.speedScale=o.speed;if(o.intonation!=null)base.intonationScale=o.intonation;if(o.pitch!=null)base.pitchScale=o.pitch;/* 0 も きく(抑揚0 = たいら) */
  base.prePhonemeLength=.05;base.postPhonemeLength=.12;base.outputStereo=false;
  return base;
}

async function main(){
  const cmd=process.argv[2];
  const speakers=await (await api('/speakers')).json();
  if(cmd==='speakers'){for(const s of speakers)console.log(s.name+': '+s.styles.map(t=>`${t.name}(${t.id})`).join(' '));return;}
  const sp=speakers.find(s=>s.name===SPEAKER),st=sp&&sp.styles.find(t=>t.name===STYLE);
  if(!st)throw new Error(`こえ「${SPEAKER} ${STYLE}」が ありません。node tools/make-voice-voicevox.js speakers で しらべてください`);
  const id=st.id;
  await api('/initialize_speaker?'+q({speaker:id}),{method:'POST'}).catch(()=>{});
  execFileSync('node',[path.join(__dirname,'make-voice.js'),'list'],{stdio:'inherit'});
  const list=fs.readFileSync(LIST,'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
  const accent=readAccent(),items={};
  for(const w of accent.keys())if(!list.includes(w))console.log(`voice-accent.txt の「${w}」は いちらんに ありません`);
  fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
  for(let i=0;i<list.length;i++){
    const t=list[i],no=i+1,file=path.join(OUT,String(no).padStart(4,'0')+'.wav'),man=path.join(MANUAL,t+'.wav'),acc=accent.get(t);
    if(fs.existsSync(man)){fs.copyFileSync(man,file);items[t]={no,src:'manual'};continue;}
    const aq=await query(t,id,acc);
    fs.writeFileSync(file,Buffer.from(await (await api('/synthesis?'+q({speaker:id}),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(aq)})).arrayBuffer()));
    items[t]={no,src:acc?'accent':'auto',kana:phr(aq.accent_phrases)};
    if(acc)items[t].read=acc.read;
    process.stdout.write(`\r${no}/${list.length} ${t}        `);
  }
  console.log();
  const credit='VOICEVOX:'+SPEAKER;
  fs.writeFileSync(META,JSON.stringify({speaker:`${SPEAKER}(${STYLE})`,id,credit,items},null,1)+'\n');
  execFileSync('node',[path.join(__dirname,'make-voice.js'),'embed',OUT,credit],{stdio:'inherit'});
  console.log('できました。dev/voice-check.html で きいて たしかめてください。');
}
/* accent_phrases を AquesTalk ふうの カナに もどす(dev/voice-check.html で みせる ため) */
function phr(ap){
  return ap.map((p,i)=>p.moras.map((m,k)=>m.text+(k+1===p.accent?"'":'')).join('')+(i===ap.length-1?'':p.pause_mora?'、':'/')).join('');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
