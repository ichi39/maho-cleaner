// まほうの おそうじやさん: BGM を まえもって つくり、index.html に うめこむ どうぐ
// つかいかた: node tools/make-bgm.js   (index.html の BGM_DATA を かきかえる)
// きょくを かえたい ときは、この ファイルの BGM_SONGS を なおして もういちど うごかす。
const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'..','index.html');
const SR=16000;
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function synth(data,sr,notes,wrap){
  const len=data.length;
  for(const [f,t0,dur,type,vol] of notes){
    const s0=Math.floor(t0*sr),n=Math.floor(dur*sr),w=6.2832*f/sr,att=Math.max(1,Math.floor(sr*(type==='box'?.004:.02)));
    const k=Math.log(.001)/Math.max(1,n-att);
    for(let i=0;i<n;i++){
      let j=s0+i;if(j>=len){if(!wrap)break;j%=len;}
      const p=w*i;let v;
      if(type==='box')v=Math.sin(p)+.28*Math.sin(2*p)+.08*Math.sin(3*p)*Math.exp(-i/(sr*.08));
      else if(type==='sine')v=Math.sin(p);
      else if(type==='sawtooth'){const ph=(f*i/sr)%1;v=2*ph-1;}
      else if(type==='square'){v=Math.sin(p)+.33*Math.sin(3*p)+.2*Math.sin(5*p);}
      else{const ph=(f*i/sr)%1;v=1-4*Math.abs(ph-.5);}
      const env=i<att?i/att:Math.exp(k*(i-att));
      data[j]+=v*vol*env*1.6;
    }
  }
}

const MF=m=>440*Math.pow(2,(m-69)/12);
const BGM_SONGS={
  day:{bpm:100,bars:8,
    mel:[[76,1],[79,1],[84,1],[79,1],[81,1.5],[79,.5],[76,2],[77,1],[81,1],[84,1],[81,1],[79,1.5],[77,.5],[74,2],
         [76,1],[79,1],[84,1],[88,1],[86,1],[84,1],[81,2],[77,1],[81,1],[79,1],[83,1],[84,3],[0,1]],
    ch:[[48,52,55],[45,48,52],[41,45,48],[43,47,50],[48,52,55],[45,48,52],[41,45,48],[43,47,50]],arp:.5},
  night:{bpm:70,bars:8,
    mel:[[0,2],[81,1],[79,1],[76,4],[0,2],[79,1],[77,1],[74,4],[0,2],[77,1],[76,1],[72,2],[74,2],[76,6],[0,2]],
    ch:[[41,45,48,52],[40,43,47,50],[38,41,45,48],[36,40,43,47],[41,45,48,52],[40,43,47,50],[38,41,45,48],[36,40,43,47]],arp:1}
};
function songNotes(S){
  if(S.gen)return genNotes(S);
  const bt=60/S.bpm,out=[];let t=0;
  for(const [m,b] of S.mel){if(m)out.push([MF(m),t*bt,Math.min(2.4,b*bt+1),'box',.1]);t+=b;}
  S.ch.forEach((c,bar)=>{
    const t0=bar*4*bt;out.push([MF(c[0]-12),t0,4*bt,'triangle',.05]);out.push([MF(c[0]-12),t0+2*bt,2*bt,'triangle',.035]);
    const pat=S.arp===.5?[0,1,2,1,0,2,1,2]:[0,2,1,3];
    pat.forEach((q,i)=>{const m=c[q%c.length]+12;out.push([MF(m),t0+i*S.arp*bt,1.1,'box',.032]);});
  });
  return{notes:out,len:S.bars*4*bt};
}
/* ---- おみせごとの BGM を つくる(コードに あわせて メロディを くみたてる) ---- */
const SCALES={maj:[0,2,4,5,7,9,11],min:[0,2,3,5,7,8,10]};
function genNotes(S){
  const rnd=mulberry(S.seed),sc=SCALES[S.sc||'maj'],bt=60/S.bpm,B=S.beats||4,bars=S.prog.length;
  const deg=d=>S.key+12*Math.floor(d/7)+sc[((d%7)+7)%7];
  const chordOf=r=>[r,r+2,r+4];
  const out=[],mv=S.mv||.1,mw=S.mw||'box';
  /* メロディ: まえはん 4こまを つくって、うしろは くりかえし+おわりかた を かえる */
  let pos=7;const phrase=[],PL=bars>=16?8:4;
  const strong=b=>Math.abs(b-Math.round(b))<.01&&(B===3?Math.round(b)===0:Math.round(b)%2===0);
  for(let bar=0;bar<PL;bar++){
    const rh=S.rh[bar%S.rh.length],ch=chordOf(S.prog[bar]);let b=0;const seq=[];
    for(const len of rh){
      const rest=len<0,L=Math.abs(len);
      if(!rest){
        if(strong(b)){let best=pos,bd=99;for(const c of ch)for(const o of [0,7,-7]){const p=c+o;const d=Math.abs(p-pos)+rnd()*1.2;if(p>=4&&p<=13&&d<bd){bd=d;best=p;}}pos=best;}
        else{pos+=[-2,-1,-1,1,1,2][rnd()*6|0];pos=Math.max(4,Math.min(13,pos));}
        seq.push([pos,b,L]);
      }
      b+=L;
    }
    phrase.push(seq);
  }
  const cad=[{d:9,b:0,l:1},{d:8,b:1,l:1},{d:7,b:2,l:B-2}];
  for(let bar=0;bar<bars;bar++){
    const t0=bar*B*bt;
    let seq=phrase[bar%PL];
    if(bar===bars-1)seq=cad.filter(c=>c.b<B).map(c=>[c.d,c.b,c.l]);
    for(const [p,b,L] of seq)out.push([MF(deg(p)+(S.mo||0)),t0+b*bt,Math.min(2.6,L*bt*(S.stac?.5:1)+(mw==='box'?.9:.15)),mw,mv]);
    /* ばんそう */
    const r=S.prog[bar],ch=chordOf(r).map(d=>deg(d));
    const bass=MF(deg(r)-12-(S.lo||0));
    if(S.bass==='oom'){out.push([bass,t0,bt*.9,'triangle',.07]);}
    else if(S.bass==='walk'){for(let i=0;i<B;i+=2)out.push([i%4===0?bass:MF(deg(r+4)-12-(S.lo||0)),t0+i*bt,bt*1.6,'triangle',.06]);}
    else out.push([bass,t0,B*bt,'triangle',.05]);
    if(S.acc==='pah'){for(let i=1;i<B;i++)ch.forEach(m=>out.push([MF(m),t0+i*bt,bt*.45,'sine',.022]));}
    else if(S.acc==='arp'){const pat=S.arpPat||[0,1,2,1];const step=S.arpStep||.5;for(let i=0;i*step<B;i++){const m=ch[pat[i%pat.length]]+12;out.push([MF(m),t0+i*step*bt,.9,'box',.028]);}}
    else if(S.acc==='blip'){for(let i=0;i<B*2;i++){if(i%2===1){out.push([MF(ch[(i>>1)%3]+12),t0+i*.5*bt,bt*.22,'square',.018]);}}}
    else if(S.acc==='pad'){ch.forEach(m=>out.push([MF(m),t0,B*bt*1.05,'sine',.016]));}
    if(S.birds&&rnd()<.6){const tb=t0+(rnd()*B)*bt,f=2200+rnd()*900;out.push([f,tb,.07,'sine',.02]);out.push([f*1.18,tb+.09,.08,'sine',.018]);}
  }
  return{notes:out,len:bars*B*bt};
}
Object.assign(BGM_SONGS,{
  clothes:{gen:1,seed:11,key:65,sc:'maj',bpm:150,beats:3,prog:[0,5,1,4,0,3,4,0,3,0,1,4,0,5,4,0],rh:[[1,1,1],[2,1],[1,1,1],[3]],bass:'oom',acc:'pah',mw:'box'},
  toy:{gen:1,seed:22,key:60,sc:'maj',bpm:128,beats:4,prog:[0,3,4,0,0,3,4,0],rh:[[1,1,1,1],[.5,.5,1,2],[1,.5,.5,1,1],[2,-1,1]],bass:'walk',acc:'blip',mw:'triangle',stac:1,mv:.075},
  fruit:{gen:1,seed:33,key:67,sc:'maj',bpm:112,beats:4,prog:[0,4,5,3,0,4,3,0],rh:[[1.5,.5,1,1],[1,1,2],[1.5,.5,1.5,.5],[1,1,1,1]],bass:'walk',acc:'arp',arpPat:[0,2,1,2],mw:'box'},
  sweets:{gen:1,seed:44,key:63,sc:'maj',bpm:84,beats:4,prog:[0,5,3,4,0,5,3,4],rh:[[2,1,1],[1,1,2],[3,1],[4]],bass:'hold',acc:'arp',arpPat:[0,1,2,1],arpStep:.5,mw:'box',mo:12,mv:.085},
  books:{gen:1,seed:55,key:57,sc:'min',bpm:66,beats:4,prog:[0,5,2,6,0,3,4,0],rh:[[2,2],[3,1],[2,-1,1],[4]],bass:'hold',acc:'pad',mw:'sine',mv:.07},
  music:{gen:1,seed:66,key:62,sc:'maj',bpm:120,beats:4,prog:[0,4,5,3,0,4,3,4],rh:[[.5,.5,.5,.5,1,1],[1,1,1,1],[.5,.5,1,.5,.5,1],[2,2]],bass:'walk',acc:'arp',arpPat:[0,1,2,1,2,1],arpStep:.5,mw:'box'},
  denki:{gen:1,seed:77,key:60,sc:'maj',bpm:112,beats:4,prog:[0,0,3,4,0,5,3,4],rh:[[.5,.5,.5,-.5,1,1],[1,-1,1,1],[.5,.5,.5,.5,2],[1,1,1,1]],bass:'walk',acc:'blip',mw:'square',stac:1,mv:.05},
  nature:{gen:1,seed:88,key:67,sc:'maj',bpm:96,beats:3,prog:[0,3,0,4,0,3,4,0,3,0,1,4,0,3,4,0],rh:[[2,1],[1,1,1],[3],[1.5,.5,1]],bass:'oom',acc:'pad',mw:'sine',mv:.075,birds:1},
  home:{gen:1,seed:99,key:65,sc:'maj',bpm:80,beats:4,prog:[0,2,3,4,0,2,3,0],rh:[[1,1,2],[2,1,1],[1.5,.5,2],[4]],bass:'hold',acc:'arp',arpPat:[0,2,1,2],arpStep:1,mw:'triangle',mv:.08},
  mine:{gen:1,seed:123,key:64,sc:'maj',bpm:92,beats:3,prog:[0,5,3,4,0,5,4,0,3,0,5,4,0,3,4,0],rh:[[1,1,1],[2,1],[1,1,1],[3]],bass:'oom',acc:'pah',mw:'box',mo:12,mv:.08}
});
/* すこしずつ つくって がめんを とめない */
/* おとの データは かずの はいれつで もっておき、AudioContext を つくりなおしても すぐ もどせる ように する */

const STEP=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const IDX=[-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
function encode(pcm){
  const out=Buffer.alloc(Math.ceil(pcm.length/2));let pred=0,idx=0;
  for(let i=0;i<pcm.length;i++){
    const step=STEP[idx];let diff=pcm[i]-pred,code=0;if(diff<0){code=8;diff=-diff;}
    let d=step>>3;if(diff>=step){code|=4;diff-=step;d+=step;}if(diff>=step>>1){code|=2;diff-=step>>1;d+=step>>1;}if(diff>=step>>2){code|=1;d+=step>>2;}
    pred+=(code&8)?-d:d;pred=Math.max(-32768,Math.min(32767,pred));idx=Math.max(0,Math.min(88,idx+IDX[code]));
    if(i&1)out[i>>1]|=code<<4;else out[i>>1]=code;
  }
  return out;
}
const res={};let total=0;const report=[];
for(const key of Object.keys(BGM_SONGS)){
  const {notes,len}=songNotes(BGM_SONGS[key]);
  const d=new Float32Array(Math.floor(len*SR));synth(d,SR,notes,true);
  let pk=0;for(const v of d)pk=Math.max(pk,Math.abs(v));
  const pcm=new Int16Array(d.length);for(let i=0;i<d.length;i++)pcm[i]=Math.round(d[i]/pk*0.95*32767);
  const b64=encode(pcm).toString('base64');
  res[key]={sr:SR,n:pcm.length,a:b64};total+=b64.length;report.push(key+':'+len.toFixed(1)+'s');
}
let html=fs.readFileSync(FILE,'utf8');
const A='/*BGM_DATA_START*/',B='/*BGM_DATA_END*/';
const i=html.indexOf(A),j=html.indexOf(B);if(i<0||j<0)throw new Error('BGM_DATA の しるしが ありません');
html=html.slice(0,i+A.length)+'const BGM_DATA='+JSON.stringify(res)+';'+html.slice(j);
fs.writeFileSync(FILE,html);
console.log(report.join(' '));console.log('BGM_DATA',(total/1024/1024).toFixed(2),'MB');
