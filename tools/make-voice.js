// まほうの おそうじやさん: よみあげの こえを まえもって つくり、index.html に うめこむ どうぐ
//
//  1) node tools/make-voice.js list          … よみあげる もじと ことばの いちらんを tools/voice-list.txt に かく
//  2) (Mac) bash tools/make-voice-mac.sh     … Mac の こえ(Kyoko)で wav を つくり、3) まで まとめて やる
//  3) node tools/make-voice.js embed <dir>   … <dir>/0001.wav … を ちいさく して index.html に うめこむ
//
//  wav は 16bit PCM(モノラル/ステレオ、サンプリングレートは なんでも よい)。
//  じぶんの こえで ろくおんした wav でも、なまえ(ばんごう)が いちらんの じゅんばん なら つかえる。
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),FILE=path.join(ROOT,'index.html'),LIST=path.join(__dirname,'voice-list.txt');
const SR=16000;
const NOLEARN='ーッっァィゥェォゃゅょャュョぁぃぅぇぉ';

function voiceList(){
  const html=fs.readFileSync(FILE,'utf8');
  const a=html.indexOf('const ITEMS=[];'),b=html.indexOf('const SLOT_OF_=',a);
  if(a<0||b<0)throw new Error('ITEMS が みつかりません');
  const seg=html.slice(a,b),words=[];
  for(const m of seg.matchAll(/\[\s*'([^'#]+)'\s*,/g))if(/^[\u3040-\u30ff]+$/.test(m[1])&&!words.includes(m[1]))words.push(m[1]);
  const chars=[];
  for(const w of words)for(const c of w)if(!NOLEARN.includes(c)&&!chars.includes(c))chars.push(c);
  const extra=['おとが でるよ','こえが でるよ'];
  return [...chars,...words,...extra];
}

function readWav(file){
  const b=fs.readFileSync(file);
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw new Error(file+' は wav では ありません');
  let p=12,fmt=null,data=null;
  while(p+8<=b.length){const id=b.toString('ascii',p,p+4),len=b.readUInt32LE(p+4);
    if(id==='fmt ')fmt={ch:b.readUInt16LE(p+10),sr:b.readUInt32LE(p+12),bits:b.readUInt16LE(p+22)};
    if(id==='data')data=b.subarray(p+8,p+8+len);
    p+=8+len+(len&1);}
  if(!fmt||!data||fmt.bits!==16)throw new Error(file+' は 16bit PCM の wav に してください');
  const n=Math.floor(data.length/2/fmt.ch),out=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let c=0;c<fmt.ch;c++)s+=data.readInt16LE((i*fmt.ch+c)*2);out[i]=s/fmt.ch/32768;}
  return{d:out,sr:fmt.sr};
}
function resample(d,from,to){
  if(from===to)return d;const n=Math.floor(d.length*to/from),o=new Float32Array(n);
  for(let i=0;i<n;i++){const x=i*from/to,j=Math.floor(x),f=x-j;o[i]=(d[j]||0)*(1-f)+(d[j+1]||0)*f;}
  return o;
}
/* まえと うしろの しずかな ところを けずる(ならす までの まちじかんを なくす) */
function trim(d){
  let pk=0;for(const v of d)pk=Math.max(pk,Math.abs(v));const th=Math.max(.01,pk*.04);
  let a=0,b=d.length-1;while(a<b&&Math.abs(d[a])<th)a++;while(b>a&&Math.abs(d[b])<th)b--;
  a=Math.max(0,a-Math.floor(SR*.01));b=Math.min(d.length-1,b+Math.floor(SR*.06));
  const o=d.slice(a,b+1),fade=Math.min(80,o.length>>2);
  for(let i=0;i<fade;i++){o[i]*=i/fade;o[o.length-1-i]*=i/fade;}
  for(let i=0;i<o.length;i++)o[i]=o[i]/pk*.9;
  return o;
}
const STEP=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const IDX=[-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
function encode(f){
  const out=Buffer.alloc(Math.ceil(f.length/2));let pred=0,idx=0;
  for(let i=0;i<f.length;i++){
    const s=Math.round(Math.max(-1,Math.min(1,f[i]))*32767),step=STEP[idx];let diff=s-pred,code=0;if(diff<0){code=8;diff=-diff;}
    let d=step>>3;if(diff>=step){code|=4;diff-=step;d+=step;}if(diff>=step>>1){code|=2;diff-=step>>1;d+=step>>1;}if(diff>=step>>2){code|=1;d+=step>>2;}
    pred+=(code&8)?-d:d;pred=Math.max(-32768,Math.min(32767,pred));idx=Math.max(0,Math.min(88,idx+IDX[code]));
    if(i&1)out[i>>1]|=code<<4;else out[i>>1]=code;
  }
  return out;
}
function embed(dir){
  const list=fs.readFileSync(LIST,'utf8').split('\n').map(s=>s.trim()).filter(Boolean),res={};let total=0,miss=[];
  list.forEach((t,i)=>{
    const f=path.join(dir,String(i+1).padStart(4,'0')+'.wav');
    if(!fs.existsSync(f)){miss.push(t);return;}
    const w=readWav(f),d=trim(resample(w.d,w.sr,SR)),a=encode(d).toString('base64');
    res[t]={sr:SR,n:d.length,a};total+=a.length;
  });
  let html=fs.readFileSync(FILE,'utf8');
  const A='/*VOICE_DATA_START*/',B='/*VOICE_DATA_END*/',i=html.indexOf(A),j=html.indexOf(B);
  if(i<0||j<0)throw new Error('VOICE_DATA の しるしが ありません');
  html=html.slice(0,i+A.length)+'const VOICE_DATA='+JSON.stringify(res)+';'+html.slice(j);
  fs.writeFileSync(FILE,html);
  console.log(`こえ ${Object.keys(res).length} こ / ${(total/1024/1024).toFixed(2)} MB`);
  if(miss.length)console.log('wav が ない もの(ゲームでは いままでどおり よみあげる):',miss.join(' '));
}
const [cmd,arg]=process.argv.slice(2);
if(cmd==='list'){const l=voiceList();fs.writeFileSync(LIST,l.join('\n')+'\n');console.log(`${l.length} こ を ${path.relative(ROOT,LIST)} に かきました`);}
else if(cmd==='embed'){embed(arg||path.join(__dirname,'voice-wav'));}
else console.log('つかいかた: node tools/make-voice.js list | embed <wavの フォルダ>');
