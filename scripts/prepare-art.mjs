// Deterministic game-asset packing only: extract the six authored panels and
// encode browser-sized WebP copies. Original generated PNGs are preserved.
import sharp from 'sharp'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const dir=resolve(root,'public/assets/art-v2')
const sources=resolve(root,'art/source')
for(const [source,time] of [['backgrounds-sheet.png','day'],['backgrounds-night-sheet.png','night']]){
 const image=sharp(resolve(sources,source)), {width,height}=await image.metadata()
 for(const [index,name] of ['workshop','library','cafeteria','cafe','rooftop','river'].entries()){
  const col=index%2,row=Math.floor(index/2),left=Math.round(width*col/2),top=Math.round(height*row/3)
  await image.clone().extract({left,top,width:Math.round(width*(col+1)/2)-left,height:Math.round(height*(row+1)/3)-top}).webp({quality:92}).toFile(resolve(dir,`${name}-${time}.webp`))
 }
}
const artPath=resolve(root,'src/data/art.json')
const art=JSON.parse(readFileSync(artPath,'utf8'))
for(const name of ['jian','narae','friends','jian-coffee','jian-rooftop','narae-rain','narae-river','campus','lecture']){
 const input=resolve(sources,`${name}.png`)
 if(!existsSync(input)) throw new Error(`Missing source art ${name}.png`)
 await sharp(input).webp({quality:92,alphaQuality:100}).toFile(resolve(dir,`${name}.webp`))
}
art.events=art.events.map(e=>({...e,file:e.file.replace(/\.png$/,'.webp')}))
art.sprites=Object.fromEntries(Object.entries(art.sprites).map(([id,file])=>[id,file.replace(/\.png$/,'.webp')]))
art.backgrounds={club_room:'workshop',gwabang:'workshop',library:'library',cafeteria:'cafeteria',cafe_street:'cafe',rooftop:'rooftop',han_river:'river',lecture_hall:'lecture'}
writeFileSync(artPath,JSON.stringify(art,null,2)+'\n')
console.log('Prepared 13 background plates, 3 transparent sprite atlases, 4 event CGs, and title art.')
