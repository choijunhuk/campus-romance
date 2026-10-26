import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'

describe('sampled soundtrack lifecycle',()=>{
 const gains:any[]=[],sources:any[]=[]
 let decode:ReturnType<typeof vi.fn>
 beforeEach(()=>{
  vi.resetModules();vi.useFakeTimers();gains.length=0;sources.length=0
  decode=vi.fn().mockResolvedValue({duration:90})
  vi.stubGlobal('AudioContext',class{
   currentTime=12;destination={};resume=vi.fn().mockResolvedValue(undefined);decodeAudioData=decode
   createGain(){const g={gain:{value:0,setValueAtTime:vi.fn(),setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};gains.push(g);return g}
   createBufferSource(){const s={buffer:null,loop:false,connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};sources.push(s);return s}
  })
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}))
 })
 afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
 it('starts a loop with the current volume only after decoding and caches it',async()=>{
  const {ambient}=await import('./audio');const player=ambient('jian')!;player.volume(.4)
  expect(sources).toHaveLength(0)
  await vi.waitFor(()=>expect(sources).toHaveLength(1))
  expect(sources[0].loop).toBe(true);expect(sources[0].start).toHaveBeenCalledOnce()
  expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(.4,12,.35)
  player.volume(0);expect(gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0,12,.12)
  player.stop();ambient('jian')
  expect(fetch).toHaveBeenCalledOnce()
  expect(sources).toHaveLength(2)
  expect(sources[0].stop).toHaveBeenCalledWith(13.1)
  vi.advanceTimersByTime(1200);expect(gains[0].disconnect).toHaveBeenCalledOnce()
 })
 it('never starts a stale cue if the scene changes while decoding',async()=>{
  let finish!:(v:unknown)=>void
  decode.mockImplementation(()=>new Promise(r=>{finish=r}))
  const {ambient}=await import('./audio');const player=ambient('seoha')!
  await vi.waitFor(()=>expect(decode).toHaveBeenCalledOnce())
  player.stop();finish({duration:85});await Promise.resolve()
  expect(sources).toHaveLength(0)
 })
 it('a failed asset request and unsupported audio do not interrupt reading',async()=>{
  vi.mocked(fetch).mockResolvedValue({ok:false,status:404} as Response)
  const {ambient}=await import('./audio')
  expect(()=>ambient('day')).not.toThrow();await vi.runAllTimersAsync()
  expect(sources).toHaveLength(0)
  expect(ambient('unknown')).toBeNull()
  vi.stubGlobal('AudioContext',undefined);expect(ambient('night')).toBeNull()
 })
})
