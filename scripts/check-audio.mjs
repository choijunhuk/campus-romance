import {readFileSync,statSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
const root=resolve(import.meta.dirname,'..'),tracks=JSON.parse(readFileSync(resolve(root,'src/data/soundtrack.json'),'utf8'))
const hashes=new Set(),ffmpeg=process.env.FFMPEG||(process.platform==='win32'?'C:/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe':'ffmpeg')
if(tracks.length!==9||new Set(tracks.map(t=>t.id)).size!==9)throw new Error('Expected nine distinct cues')
for(const t of tracks){
 const path=resolve(root,'public/assets/bgm-v3',t.file)
 if(statSync(path).size<300000)throw new Error(`Missing/truncated ${t.id}`)
 if(readFileSync(resolve(root,`audio/source/${t.id}.mid`)).subarray(0,4).toString()!=='MThd')throw new Error(`Missing MIDI ${t.id}`)
 const result=spawnSync(ffmpeg,['-v','error','-i',path,'-f','f32le','-ar','44100','-ac','2','pipe:1'],{maxBuffer:64*1024*1024,windowsHide:true})
 if(result.status!==0)throw new Error(result.stderr.toString())
 const pcm=result.stdout,seconds=pcm.length/4/2/44100
 if(Math.abs(seconds-t.duration)>.08)throw new Error(`Unexpected duration ${t.id}: ${seconds}`)
 let peak=0,square=0
 for(let i=0;i<pcm.length;i+=4){const sample=pcm.readFloatLE(i);peak=Math.max(peak,Math.abs(sample));square+=sample*sample}
 const rms=Math.sqrt(square/(pcm.length/4)),peakDb=20*Math.log10(peak)
 if(peakDb>-.5||rms<.015||rms>.25)throw new Error(`Unexpected levels ${t.id}: peak ${peakDb}, RMS ${rms}`)
 const hash=createHash('sha256').update(pcm).digest('hex');if(hashes.has(hash))throw new Error(`Duplicated score ${t.id}`);hashes.add(hash)
 // The authored 8 ms fades suppress a discontinuity when the source wraps.
 if(Math.max(Math.abs(pcm.readFloatLE(0)),Math.abs(pcm.readFloatLE(pcm.length-4)))>.015)throw new Error(`Loop seam ${t.id}`)
 console.log(`${t.id}: ${seconds.toFixed(2)}s / ${t.bpm} BPM / peak ${peakDb.toFixed(1)} dBFS / RMS ${rms.toFixed(3)}`)
}
console.log('Nine playable, distinct, non-clipping scores; MIDI sources and loop edges verified.')
