#!/usr/bin/env node
// ゲーム本体(index.html)の script を、にせの画面環境で じっさいに うごかす「けむりテスト」。
// 目的: 「ていぎが ない(ReferenceError)」のような、ゲームが うごかなくなる こわれを みつける。
// 注意: ブラウザの代わりでは ない。見た目や音、iPhone での うごきは じっけんで たしかめること。
//
// つかいかた:  node tools/smoke-test.js [index.html のパス]   (終了コード 0 = エラーなし)
// マージの前に 必ず 実行する(お店の さいへんで ていぎを 消して ゲームが うごかなくなった ことが ある)。
const fs=require('fs'),path=require('path');
const file=process.argv[2]||path.join(__dirname,'..','index.html');
const html=fs.readFileSync(file,'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].pop()[1];
const errs=[];
/* 何でも うけつける にせの 要素(DOM)/ canvas。プロパティを ひくと また にせの 要素を かえす */
function mk(){
  const store={};
  return new Proxy(function(){},{
    get(t,k){
      if(k in store)return store[k];
      if(k===Symbol.toPrimitive)return()=>0;
      if(k===Symbol.iterator)return function*(){};
      if(k==='then'||k==='toJSON')return undefined;
      if(k==='length')return 0;
      if(['width','height','clientWidth','clientHeight','offsetWidth','offsetHeight'].includes(k))return 240;
      if(k==='getContext')return()=>ctx;
      if(k==='getBoundingClientRect')return()=>({left:0,top:0,width:240,height:150,right:240,bottom:150});
      if(k==='classList')return{add(){},remove(){},toggle(){},contains(){return false;}};
      if(k==='dataset')return store.dataset||(store.dataset={});
      if(k==='measureText')return()=>({width:10});
      if(k==='getImageData'||k==='createImageData')return()=>({data:new Uint8ClampedArray(4*34*34)});
      if(k==='toString')return()=>'';
      return mk();
    },
    set(t,k,v){store[k]=v;return true;},
    apply(){return mk();},
    construct(){return mk();}
  });
}
const ctx=mk();
let rafCb=[];
const g={
  document:mk(),window:mk(),
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  navigator:{userAgent:'node',audioSession:{},maxTouchPoints:0,vibrate(){}},
  requestAnimationFrame:cb=>{rafCb.push(cb);return rafCb.length;},cancelAnimationFrame(){},
  AudioContext:function(){return mk();},webkitAudioContext:function(){return mk();},Audio:function(){return mk();},
  speechSynthesis:mk(),SpeechSynthesisUtterance:function(){return mk();},
  Image:function(){return mk();},performance:{now:()=>Date.now()},
  location:{reload(){},href:''},history:mk(),prompt:()=>null,alert(){},
  setInterval:()=>0,clearInterval(){},innerWidth:390,innerHeight:844,devicePixelRatio:2,
};
const names=Object.keys(g);
let api;
try{api=new Function(...names,code+'\n;return {ev:s=>eval(s)};')(...names.map(n=>g[n]));}
catch(e){errs.push(['読みこみ',e.name,e.message.split('\n')[0]]);}
const run=(label,src)=>{try{api.ev(src);}catch(e){errs.push([label,e.name,e.message.split('\n')[0]]);}};
if(api){
  for(let i=0;i<3;i++){const cbs=rafCb;rafCb=[];for(const cb of cbs){try{cb(1000*(i+1));}catch(e){errs.push(['毎コマ'+i,e.name,e.message.split('\n')[0]]);}}}
  run('ぶぶんの ていぎ','ITEMS.forEach(it=>{isWear(it);slotOf(it[0]);hasColor(it);})');
  run('お客さんの 見た目','CLIENTS.forEach(c=>spr("person",look(c)))');
  run('依頼づくり','for(let i=0;i<30;i++){const r=makeRequest();r.items.forEach(it=>spr(it[1],it[2]));}');
  run('ものえらび','Object.keys(CATS).forEach(c=>{for(let i=0;i<10;i++)pickItems(c,3);})');
  run('品ぞろえ','Object.keys(CATS).forEach(c=>stockOf(c))');
  run('ぜんぶの絵','ITEMS.forEach(it=>spr(it[1],it[2]));Object.values(CATS).forEach(c=>spr(...c.icon))');
  run('おへや(持ち物の段)','save.owned=ITEMS.map(i=>i[0]);renderMine()');
  run('ねこの にんぎょう','for(const it of ITEMS.filter(isWear)){const ks=hasColor(it)?[...Array(10).keys()].map(ci=>it[0]+"#"+ci):[it[0]];for(const k of ks){save.doll.wear={[slotOf(k)]:k};drawDoll(mc,120,90,0,0);}}');
  run('ねこ(ぜんぶのせ)','save.doll.wear={head:"かんむり",face:"めがね",neck:"マフラー",body:"エプロン",bottom:"スカート",feet:"ブーツ",hand:"てぶくろ",bag:"かばん",back:"ようせいのはね",wand:"まほうのつえ"};drawDoll(mc,120,90,1,.5)');
  run('部屋の背景','for(let i=0;i<THEMES.length;i++)makeBg(i);makeBg("home");makeBg("mine")');
  run('お店と部屋の色','Object.keys(CATS).forEach(c=>{if(THEMES[CAT_THEME[c]]===undefined)throw new Error("CAT_THEME が ない: "+c);})');
}
console.log(path.basename(file),'→ エラー',errs.length);
for(const e of errs.slice(0,15))console.log('  ',e.join(' | '));
process.exit(errs.length?1:0);
