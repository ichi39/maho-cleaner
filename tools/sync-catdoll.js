#!/usr/bin/env node
// dev/cat-lab.html の「ねこの にんぎょう」の描画コードを、index.html の
// CATDOLL_START 〜 CATDOLL_END(コメントの目印)の間に とりこむ(かきかえる)道具。
//
// つかいかた:  node tools/sync-catdoll.js          ... かきかえる
//              node tools/sync-catdoll.js --check  ... ずれていないか しらべるだけ(ずれていたら 終了コード 1)
//
// ねこの かたち・ふくの 絵は dev/cat-lab.html で なおす。そのあと この道具を 実行する。
// ゲーム本体(index.html)の CATDOLL を 直接 なおさないこと(つぎの 同期で きえる)。
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const labPath=path.join(root,'dev/cat-lab.html'),gamePath=path.join(root,'index.html');
const lab=fs.readFileSync(labPath,'utf8');
const js=lab.split('<script>')[1].split('</script>')[0];
const a=js.indexOf('const N=32, SP=34;'),b=js.indexOf('function makeLayers(');
if(a<0||b<0)throw new Error('dev/cat-lab.html の 取り出す範囲が 見つかりません');
let core=js.slice(a,b);
// ゲームで いらない部分(調整用 ADJ・アイテム一覧・色の上書き)を 取りのぞく
core=core.replace(/const ITEMS=\[[\s\S]*?\n\];\n/,'');
core=core.replace(/\/\/ 色を変えられない.*\n/,'').replace(/const FIXED_COLOR=.*\n/,'');
core=core.replace(/\/\/ 耳を服の上に出す.*\n/,'').replace(/const EAR_THROUGH=.*\n/,'');
core=core.replace(/const ADJ=\{\};.*\n/,'');
for(const bad of ['const ITEMS','FIXED_COLOR','EAR_THROUGH'])if(core.includes(bad))throw new Error('取りのぞけなかった: '+bad);
for(const need of ['const SLOTS=','const WEAR=','function bakeD','function innerEdge','function bodyLayers'])if(!core.includes(need))throw new Error('足りない: '+need);
const block=`/* ========= ねこの にんぎょう(32x32 ドット) =========
   dev/cat-lab.html で つくった ものを、tools/sync-catdoll.js で ここに とりこんでいる。(ここを 直接 なおさない)
   体の寸法(リグ)から 服を 計算して かくので、ふくは どれも ずれない。
   外がわに 1本の ふちどり、ふくの 内がわは その色の 暗い色(innerEdge)。
   ここだけ 32x32(canvas は 34x34)。ほかの ドット絵(22x22)とは 別あつかい。 */
const CATDOLL=(()=>{
${core}
/* ---- ゲームから つかう口 ---- */
const cache=new Map();
function build(worn){
  const R=FORMS.cat,body=bodyLayers(R,{}),front=[],behind=[];
  for(const w of worn){
    const d=new D();WEAR[w.k](d,R,w.o);
    if(w.slot==='body')applyCut(d,R);
    (w.slot==='back'?behind:front).push({d,z:SLOTS[w.slot].z,slot:w.slot});
  }
  const hat=worn.find(w=>w.slot==='head');   /* ぼうし・ヘルメットは、耳が あなから でる */
  front.push({d:body.ears,z:(hat&&hat.k==='hat')?6.5:.5,slot:'ears'});
  behind.sort((a,b)=>a.z-b.z);front.sort((a,b)=>a.z-b.z);
  const all=new D();
  for(const l of behind){innerEdge(all,l.d);blit(all,l.d);}
  blit(all,body.back);blit(all,body.body);blit(all,body.head);
  for(const l of front){innerEdge(all,l.d);blit(all,l.d);}
  return bakeD(all);
}
/* wear: { 部位: もちもののキー }。同じ きがえは キャッシュ から かえす */
function get(wear){
  const worn=[];
  for(const slot of Object.keys(wear||{})){
    const it=IT(wear[slot]);if(!it||!SLOTS[slot])continue;
    const k=wearKind(it),o0=it[2]||{};if(!WEAR[k])continue;
    worn.push({slot,k,o:{c:o0.c,c2:o0.c2,t:o0.t||(o0.tall?'tall':null)}});
  }
  const key=worn.map(w=>[w.slot,w.k,w.o.c,w.o.c2,w.o.t].join(':')).join('|');
  let cv=cache.get(key);if(!cv){cv=build(worn);cache.set(key,cv);}
  return cv;
}
return {get,SIZE:SP};
})();`;
const game=fs.readFileSync(gamePath,'utf8');
const S='/*CATDOLL_START*/\n',E='\n/*CATDOLL_END*/';
const i=game.indexOf(S),j=game.indexOf(E);
if(i<0||j<0)throw new Error('index.html に /*CATDOLL_START*/ 〜 /*CATDOLL_END*/ が ありません');
const next=game.slice(0,i+S.length)+block+game.slice(j);
if(process.argv.includes('--check')){
  if(next!==game){console.error('index.html の CATDOLL が dev/cat-lab.html と ずれています。 node tools/sync-catdoll.js を 実行してください');process.exit(1);}
  console.log('ok: CATDOLL は dev/cat-lab.html と そろっています');
}else{
  if(next===game)console.log('変更なし(すでに そろっています)');
  else{fs.writeFileSync(gamePath,next);console.log('index.html の CATDOLL を かきかえました');}
}
