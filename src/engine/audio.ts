import soundtrack from '../data/soundtrack.json'

let context: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
function audioContext() {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  return context
}
function resumeAudio() { void audioContext()?.resume().catch(() => {}) }
if (typeof document !== 'undefined') {
  // The first Start click is a real autoplay gesture. Retry a denied resume on
  // the next gesture, rather than leaving the player permanently silent.
  document.addEventListener('pointerdown', resumeAudio)
  document.addEventListener('keydown', resumeAudio)
}

/** Browsers strip MP3 encoder padding when decoding. The source loops at sample
 * boundaries; the cache retains only two decoded scores, not the whole OST. */
export function ambient(track: string) {
  const ctx=audioContext(), entry=soundtrack.find(t=>t.id===track)
  if(!ctx || !entry)return null
  const gain=ctx.createGain(), abort=new AbortController()
  gain.gain.value=0;gain.connect(ctx.destination)
  let source:AudioBufferSourceNode|null=null, stopped=false, level=0
  const start=(buffer:AudioBuffer)=>{
    if(stopped)return
    source=ctx.createBufferSource();source.buffer=buffer;source.loop=true
    gain.gain.setValueAtTime(0,ctx.currentTime)
    source.connect(gain);source.start()
    gain.gain.setTargetAtTime(level,ctx.currentTime,.35)
  }
  const cached=buffers.get(track)
  if(cached)start(cached)
  else void (async()=>{
    const response=await fetch(`${import.meta.env.BASE_URL}assets/bgm-v3/${entry.file}`,{signal:abort.signal})
    if(!response.ok)throw new Error(`Music ${response.status}`)
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer())
    if(stopped)return
    buffers.set(track,buffer)
    while(buffers.size>2)buffers.delete(buffers.keys().next().value!)
    start(buffer)
  })().catch(()=>{/* A failed request never blocks reading or retries every line. */})
  return {
    volume(value:number){level=Math.max(0,Math.min(1,value));if(source)gain.gain.setTargetAtTime(level,ctx.currentTime,.12)},
    stop(){
      if(stopped)return
      stopped=true;abort.abort()
      gain.gain.setTargetAtTime(0,ctx.currentTime,.25)
      const oldSource=source
      if(oldSource)oldSource.stop(ctx.currentTime+1.1)
      setTimeout(()=>{oldSource?.disconnect();gain.disconnect()},1200)
    },
  }
}

/** Small UI feedback is independent from the sampled soundtrack. */
export function selectionSound(volume:number) {
  if(volume<=0)return
  const ctx=audioContext()
  if(!ctx)return
  const oscillator=ctx.createOscillator(),out=ctx.createGain(),now=ctx.currentTime
  oscillator.type='sine';oscillator.frequency.value=1175
  out.gain.setValueAtTime(volume*.06,now);out.gain.exponentialRampToValueAtTime(.0001,now+.12)
  oscillator.connect(out);out.connect(ctx.destination);oscillator.start();oscillator.stop(now+.13)
  oscillator.onended=()=>{oscillator.disconnect();out.disconnect()}
}
