// Original score: authored motifs, harmonic changes and instrument arrangements.
// MIDI sources are portable. Rendering uses FluidSynth + GeneralUser GS; see docs/SOUNDTRACK.md.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const root = resolve(import.meta.dirname, '..')
const tracks = [
 {id:'day',title:'407호의 좋은 예감',bpm:98,key:60,programs:[4,33,11],groove:'lofi',motif:[0,2,4,7,4,2,1,2],chords:[0,5,3,4,0,5,1,4]},
 {id:'evening',title:'데이트는 스윙으로',bpm:114,key:65,programs:[0,32,11],groove:'jazz',motif:[4,7,6,4,2,3,2,0],chords:[0,5,1,4,2,5,1,4]},
 {id:'night',title:'막차 하나 전까지',bpm:94,key:57,programs:[26,33,4],groove:'soul',motif:[7,4,2,0,2,4,3,2],chords:[5,3,0,4,5,1,3,4]},
 {id:'confession',title:'대답을 기다리는 박자',bpm:88,key:62,programs:[0,42,24],groove:'piano',motif:[0,4,2,1,0,7,6,4],chords:[0,4,5,3,0,2,1,4]},
 {id:'tense',title:'마감 10분 전',bpm:120,key:57,programs:[45,34,0],groove:'pulse',motif:[0,1,0,4,3,2,1,-1],chords:[5,3,1,4,5,1,3,4]},
 {id:'jian',title:'선배의 반칙',bpm:106,key:63,programs:[4,33,11],groove:'funk',motif:[4,2,1,2,7,6,4,3],chords:[0,2,5,1,3,2,1,4]},
 {id:'narae',title:'별표 친 오후',bpm:118,key:67,programs:[24,32,71],groove:'bossa',motif:[0,2,4,5,4,7,6,4],chords:[0,1,2,5,3,2,1,4]},
 {id:'seoha',title:'ON AIR, 너에게만',bpm:112,key:64,programs:[7,34,65],groove:'city',motif:[7,6,4,2,3,4,2,1],chords:[3,4,2,5,3,4,0,0]},
 {id:'iseo',title:'한 바퀴 더, 너와',bpm:126,key:62,programs:[27,34,29],groove:'rock',motif:[0,0,4,7,6,4,2,4],chords:[0,4,5,3,0,2,3,4]},
]
const PPQ=480, bars=40, scale=[0,2,4,5,7,9,11]
const pitch = degree => scale[((degree%7)+7)%7]+12*Math.floor(degree/7)
const vlq=n=>{const b=[n&127];while((n>>=7)>0)b.unshift((n&127)|128);return b}
const int=(n,bytes)=>Array.from({length:bytes},(_,i)=>(n>>((bytes-i-1)*8))&255)
function compose(t){
 const events=[], add=(beat,bytes)=>events.push({tick:Math.round(beat*PPQ),bytes})
 add(0,[255,81,3,...int(Math.round(60000000/t.bpm),3)])
 const text=Buffer.from(t.title,'utf8');add(0,[255,3,...vlq(text.length),...text])
 t.programs.forEach((p,ch)=>{add(0,[192+ch,p]);add(0,[176+ch,7,[82,78,66][ch]]);add(0,[176+ch,10,[49,64,78][ch]]);add(0,[176+ch,91,24])})
 add(0,[185,7,65])
 const note=(ch,n,at,len,vel=75)=>{add(at,[144+ch,Math.max(0,Math.min(127,n)),vel]);add(at+len,[128+ch,Math.max(0,Math.min(127,n)),0])}
 const drum=(n,at,v)=>note(9,n,at,.08,v)
 // Two full cycles allow the renderer to retain natural instrument tails at the seam.
 for(let bar=0;bar<bars*2+1;bar++){
  const b=bar%bars, at=bar*4, section=b<4?'intro':b<20?'a':b<28?'b':b<36?'return':'turn'
  const chord=t.chords[b%8]
  const triad=[0,2,4,6].map(d=>t.key+pitch(chord+d))
  // Comping patterns are different in each genre; shorter notes leave air around the dialogue.
  const comp=t.groove==='bossa'?[0,.75,1.5,2.5,3.25]:t.groove==='jazz'?[.66,1.66,3]:t.groove==='piano'?[0,2]:t.groove==='pulse'?[0,.5,1,1.5,2,2.5,3,3.5]:[0,1.5,2.75]
  for(const [ci,beat]of comp.entries()){
   const voicing=triad.map((n,i)=>n+(i<ci%3?12:0))
   voicing.forEach((n,i)=>note(0,n,at+beat+i*.018,t.groove==='piano'?1.5:t.groove==='pulse'?.23:.52,52+(b+i)%9))
  }
  // Upright walking bass, bossa root/fifth, rock eighths, or syncopated electric bass.
  const bassBeats=t.groove==='jazz'?[0,1,2,3]:t.groove==='rock'?[0,.5,1,1.5,2,2.5,3,3.5]:[0,1.75,2.5,3.5]
  bassBeats.forEach((beat,i)=>{
   const degree=t.groove==='jazz'?[chord,chord+2,chord+4,t.chords[(b+1)%8]-1][i]:[chord,chord+4,chord,chord+6][i%4]
   note(1,t.key-24+pitch(degree),at+beat,t.groove==='piano'?.95:.38,68+(i%3)*4)
  })
  // A composed eight-note motif, answered a third up in B and varied every four bars.
  if(section!=='intro'||b>=2){
   const offsets=t.groove==='jazz'?[0,.66,1.5,2.66]:t.groove==='bossa'?[.5,1.25,2,3.25]:[.25,1,2,2.75]
   offsets.forEach((beat,i)=>{
    if((b%8===7&&i>1)||(section==='turn'&&i===3))return
    const d=t.motif[(b*2+i)%8]+(section==='b'?2:0)
    const n=t.key+12+pitch(d)+(b%8===6?-12:0)
    note(2,n,at+beat,.36+(i===3?.5:0),62+(b+i)%13)
   })
   if(b%4===3)note(2,t.key+12+pitch(t.motif[(b*2+4)%8]),at+3.5,.32,59)
  }
  // Sparse piano still has a pulse; the other cues use recognizable genre rhythms.
  const quiet=t.groove==='piano', hats=t.groove==='bossa'?69:t.groove==='jazz'?51:42
  for(let i=0;i<8;i++){
   if(quiet&&i%2)continue
   const swing=['jazz','lofi','funk'].includes(t.groove)&&i%2?.09:0
   drum(hats,at+i*.5+swing,(quiet?22:38)+(i%2?0:9)+(b+i)%7)
  }
  if(!quiet||b>=4){
   for(const beat of t.groove==='rock'?[0,1.5,2,2.5]:t.groove==='bossa'?[0,1.5,2,3.5]:[0,2.5])drum(36,at+beat,quiet?35:69)
   for(const beat of [1,3])drum(t.groove==='bossa'||quiet?37:38,at+beat,quiet?27:60)
  }
  if(b%8===7&&!quiet){drum(45,at+3,46);drum(47,at+3.5,51);drum(50,at+3.75,48)}
  if(b%8===0&&b>0&&!quiet)drum(49,at,39)
 }
 events.sort((a,b)=>a.tick-b.tick||a.bytes[0]-b.bytes[0])
 let prev=0;const data=[]
 for(const e of events){data.push(...vlq(e.tick-prev),...e.bytes);prev=e.tick}
 data.push(0,255,47,0)
 return Buffer.from([...Buffer.from('MThd'),0,0,0,6,0,0,0,1,...int(PPQ,2),...Buffer.from('MTrk'),...int(data.length,4),...data])
}
for(const dir of ['audio/source','.audio-work','public/assets/bgm-v3'])mkdirSync(resolve(root,dir),{recursive:true})
const manifest=tracks.map(({id,title,bpm,groove})=>({id,title,bpm,style:groove,file:`${id}.mp3`,duration:bars*4*60/bpm}))
writeFileSync(resolve(root,'src/data/soundtrack.json'),JSON.stringify(manifest,null,2)+'\n')
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr||r.stdout||`Failed: ${cmd}`)}
for(const t of tracks){
 const midi=resolve(root,`audio/source/${t.id}.mid`);writeFileSync(midi,compose(t))
 if(!process.argv.includes('--render'))continue
 const fluid=process.env.FLUIDSYNTH||resolve(root,'.tools/soundtrack/fluidsynth/fluidsynth-v2.6.1-win10-x64-cpp11/bin/fluidsynth.exe')
 const soundfont=process.env.SOUNDFONT||resolve(root,'.tools/soundtrack/GeneralUser-GS.sf2')
 if(!existsSync(soundfont))throw new Error('Set SOUNDFONT to GeneralUser-GS.sf2; see docs/SOUNDTRACK.md')
 const wav=resolve(root,`.audio-work/${t.id}.wav`),seconds=bars*4*60/t.bpm
 run(fluid,['-ni','-F',wav,'-r','44100','-g','.7','-o','synth.reverb.active=1',soundfont,midi])
 run(process.env.FFMPEG||'C:/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe',['-hide_banner','-loglevel','error','-y','-i',wav,'-af',`atrim=start=${seconds}:end=${seconds*2},asetpts=PTS-STARTPTS,afade=t=in:d=0.008,afade=t=out:st=${seconds-.008}:d=0.008,loudnorm=I=-20:TP=-2:LRA=11`,'-ar','44100','-codec:a','libmp3lame','-b:a','112k',resolve(root,`public/assets/bgm-v3/${t.id}.mp3`)])
 console.log(`Rendered ${t.id}: ${seconds.toFixed(2)}s, ${t.bpm} BPM`)
}
console.log(`Authored ${tracks.length} MIDI scores.`)
