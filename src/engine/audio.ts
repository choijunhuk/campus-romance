// Original, deliberately sparse ambient accompaniment. No remote audio requests
// or missing media files: sound is synthesized after the first user gesture.
let context: AudioContext | null = null
function audioContext() {
  if (typeof AudioContext === 'undefined') return null
  context ??= new AudioContext()
  void context.resume().catch(() => {})
  return context
}
const chords: Record<string, number[][]> = {
  day: [[48,55,59,64],[45,52,55,60],[41,48,52,57],[43,50,55,59]],
  evening: [[45,52,55,60],[41,48,52,57],[48,55,59,64],[43,50,57,59]],
  night: [[45,52,59,60],[41,48,55,57],[48,55,59,62],[43,50,55,59]],
  tense: [[45,52,59,62],[41,48,55,59],[43,50,57,60],[45,52,55,59]],
}
function note(ctx: AudioContext, out: AudioNode, midi: number, start: number, duration: number, level: number) {
  const oscillator=ctx.createOscillator(), envelope=ctx.createGain()
  oscillator.type='sine'
  oscillator.frequency.value=440 * 2 ** ((midi-69)/12)
  envelope.gain.setValueAtTime(0,start)
  envelope.gain.linearRampToValueAtTime(level,start+Math.min(.35,duration*.15))
  envelope.gain.exponentialRampToValueAtTime(.0001,start+duration)
  oscillator.connect(envelope); envelope.connect(out)
  oscillator.start(start); oscillator.stop(start+duration+.03)
  oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect()}
}
export function ambient(track: string) {
  const ctx=audioContext()
  if(!ctx)return null
  const master=ctx.createGain()
  master.gain.value=0
  master.connect(ctx.destination)
  let step=0,next=ctx.currentTime+.05
  const progression=chords[track]??chords.day
  const schedule=()=>{
    if(next>ctx.currentTime+2)return
    const chord=progression[step++%progression.length]
    chord.forEach((pitch,i)=>note(ctx,master,pitch,next+i*.12,6.5,.16))
    // One quiet upper note makes room for the text instead of a busy melody.
    note(ctx,master,chord[(step+1)%chord.length]+12,next+2.5,2.8,.035)
    next+=8
  }
  schedule()
  const timer=setInterval(schedule,750)
  return {
    volume(value:number){master.gain.setTargetAtTime(Math.max(0,value)*.15,ctx.currentTime,.25)},
    stop(){clearInterval(timer);master.gain.setTargetAtTime(0,ctx.currentTime,.2);setTimeout(()=>master.disconnect(),7000)},
  }
}
export function selectionSound(volume:number) {
  if(volume<=0)return
  const ctx=audioContext()
  if(!ctx)return
  const out=ctx.createGain();out.gain.value=volume*.08;out.connect(ctx.destination)
  note(ctx,out,79,ctx.currentTime,.18,.45)
  setTimeout(()=>out.disconnect(),500)
}
