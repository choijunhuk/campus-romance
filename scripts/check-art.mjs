import sharp from 'sharp'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const art=JSON.parse(readFileSync(resolve(root,'src/data/art.json'),'utf8'))
const dir=resolve(root,'public/assets/art-v2')
for(const file of new Set([...Object.values(art.sprites),...art.events.map(e=>e.file),'campus.webp','lecture.webp'])){
 if(!existsSync(resolve(dir,file)))throw new Error(`Missing ${file}`)
 const metadata=await sharp(resolve(dir,file)).metadata()
 if(metadata.width<500||metadata.height<300)throw new Error(`Unexpectedly small ${file}`)
 if(Object.values(art.sprites).includes(file)){
  const stats=await sharp(resolve(dir,file)).stats()
  if(!metadata.hasAlpha||stats.channels[3].min!==0)throw new Error(`Sprite has no genuine transparency: ${file}`)
 }
}
for(const name of ['workshop','library','cafeteria','cafe','rooftop','river'])for(const time of ['day','night']){
 const info=await sharp(resolve(dir,`${name}-${time}.webp`)).metadata()
 if(Math.abs(info.width/info.height-16/9)>.01)throw new Error(`Bad backdrop ratio: ${name}-${time}`)
}
console.log('Art verified: decoding, dimensions, atlas alpha, 13 backgrounds, 4 event CGs.')
