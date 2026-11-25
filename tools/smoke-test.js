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
  VOICE_DATA:{},VOICE_CREDIT:'',   /* 本物は べつの script に ある(声のデータ)。ここでは からにして、声が なくても うごく ことを たしかめる */
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
  run('いちにち と とけい','onShow.home();for(let i=0;i<60;i++)drawHome(i/10,.1);dayHandled({gain:1},true);save.day.min=save.day.end;for(let i=0;i<60;i++)drawHome(10+i/10,.1);showDayEnd();goMorning();for(let i=0;i<60;i++)drawHome(20+i/10,.1)');
  run('とけいの すう字','if(fmtT(540)!=="09:00"||fmtT(1140)!=="19:00")throw new Error("fmtT");const D=newDay(1);if(D.end!==900||D.cap!==4)throw new Error("newDay");ensureClock({n:2,done:2});');
  run('まほうの みち と ほしぞら','POOL.hira.forEach(c=>save.seen[norm(c)]=2);if(Math.floor(stageP())!==4)throw new Error("stageP "+stageP());checkConste();renderPath(0,4.5);renderSky();gaugeHTML();');
  run('たべさせる','const miss=ITEMS.filter(it=>(it[3]==="fruit"||it[3]==="sweets")&&!isFood(it)).map(i=>i[0]);if(miss.join()!=="コーヒー,ワイン")throw new Error("FOOD もれ: "+miss);for(const w of Object.keys(FOOD)){if(!REACT[FOOD[w][0]])throw new Error("REACT なし: "+w);}for(const w of Object.keys(FOOD)){for(let n=0;n<3;n++){M.eat=null;save.owned.push(w);startEat(w);for(let i=0;i<75;i++)drawMine(i/10,.05);}}');
  run('ぼんやり(空想)','POOL.hira.forEach(c=>save.seen[norm(c)]=2);save.got["りんご"]=1;save.got["ケーキ"]=1;save.made=10;save.owned=[];save.deliv=[];onShow.mine();if(!dreamStart())throw new Error("dreamStart");for(let i=0;i<100;i++)drawMine(i/10,.05);save.dream={w:"メロン",n:save.day.n,lb:-99};for(let i=0;i<20;i++){save.reqs=[];makeRequest();}save.stock=null;stockOf("fruit");save.owned.push("ピーマン");save.dream={w:"ピーマン",n:save.day.n,lb:-99};M.eat=null;startEat("ピーマン");if(!M.eat.wish)throw new Error("wish");for(let i=0;i<150;i++)drawMine(i/10,.05);');
  run('商店街の ふっこう','save.got={"りんご":1};save.rest={};save.jar=100;for(let i=0;i<9;i++)restApply("fruit");if(restL("fruit")!==2||tierOf("fruit")!==3)throw new Error("rest "+restL("fruit"));if(restApply("fruit")!==null)throw new Error("max");save.jar=0;if(restApply("sweets")!==null)throw new Error("empty");save.jar=30;save.day.coins=70;save.day.closed=true;delete save.day.jarB;showDayEnd();if(!(save.day.jarB>0))throw new Error("jarB");jarHTML();onShow.shelf();');
  run('おしろの としょしつ','POOL.hira.forEach(c=>save.seen[norm(c)]=2);show("library");for(let i=0;i<5;i++)drawLibrary(i/10,.05);if(LB.phase!=="clean")throw new Error("phase "+LB.phase);lbFinishClean();for(let i=0;i<40;i++)drawLibrary(i/10,.05);lbRead();lbHint();for(const pat of ["rain","fountain","tornado","parade","pops","flutter"])for(const rare of [null,"gold","smoke","double"]){LB.pat=pat;LB.forceRare=rare;lbStart(lbPickWord());lbFinishClean();for(let i=0;i<30;i++)drawLibrary(i/10,.05);const wr=LB.L.find(l=>!l.ok&&l.st==="free"),sl=LB.slots.find(s=>s.hide);if(wr&&sl){wr.st="drag";LB.drag={L:wr,dx:0,dy:0};wr.tx=sl.x;wr.ty=sl.y;for(let i=0;i<10;i++)drawLibrary(i/10,.05);lbRelease();for(let i=0;i<30;i++)drawLibrary(i/10,.05);}for(const s of LB.slots.filter(s=>s.hide)){const L=LB.L.find(l=>l.ok&&l.ch===s.ch&&l.st==="free");if(L){LB.drag={L,dx:0,dy:0};L.st="drag";L.tx=s.x;L.ty=s.y;for(let i=0;i<10;i++)drawLibrary(i/10,.05);lbRelease();for(let i=0;i<20;i++)drawLibrary(i/10,.05);}}let n=0;while(LB.phase!=="rest"&&n<900){drawLibrary(n/10,.05);n++;}if(LB.phase!=="rest")throw new Error("stuck "+pat+" "+rare+" "+LB.phase);}lbSetWeather("snow");if(lbWeatherNow()!=="snow")throw new Error("weather");lbNext();for(const w of ITEMS.filter(i=>notSp(i)&&[...i[0]].length>=2&&[...i[0]].length<=5).map(i=>i[0]))lbStart(w);show("castle");onShow.castle();');
  run('商店街とゴール','POOL.hira.forEach(c=>save.seen[norm(c)]=2);save.got["りんご"]=1;show("shelf");for(const c of Object.keys(CATS))tierOf(c);for(const p of [0,.5,3.4,6.9,7]){drawGoal(document.createElement("canvas"),1,p);}renderFlags();save.cleared=true;save.festSeen=false;onShow.shelf();lanternURL();goalTap(document.createElement("div"));');
  run('おしろ','show("castle");onShow.castle();for(let i=0;i<30;i++)drawCastle(i/10,.05);');
}
console.log(path.basename(file),'→ エラー',errs.length);
for(const e of errs.slice(0,15))console.log('  ',e.join(' | '));
process.exit(errs.length?1:0);
