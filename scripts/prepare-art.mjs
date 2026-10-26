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
art.backgrounds={...art.backgrounds,radio_room:'radio',track:'track'}
// Atlas extraction and transparent gutters only; illustration originals remain intact.
for(const name of ['jian','narae','seoha','iseo']){
 const input=sharp(resolve(sources,`${name}-v3.png`)),{width,height}=await input.metadata(),cells=[]
 for(let i=0;i<6;i++){
  const col=i%2,row=Math.floor(i/2),left=Math.round(width*col/2),top=Math.round(height*row/3)
  const buffer=await input.clone().extract({left,top,width:Math.round(width*(col+1)/2)-left,height:Math.round(height*(row+1)/3)-top}).resize({width:496,height:667,fit:'contain',background:'#00000000'}).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).png().toBuffer()
  cells.push({input:buffer,left:col*512,top:row*683})
 }
 await sharp({create:{width:1024,height:2049,channels:4,background:'#00000000'}}).composite(cells).webp({quality:92,alphaQuality:100}).toFile(resolve(dir,`${name}-v3.webp`))
 // Two wide 16:9 CG panels per original sheet.
 const cg=sharp(resolve(sources,`${name}-cg-v3.png`)),meta=await cg.metadata()
 for(const [row,event]of art.events.filter(e=>e.character===({jian:'char_01',narae:'char_03',seoha:'char_05',iseo:'char_06'})[name]).entries()){
  const top=Math.round(meta.height*row/2)
  await cg.clone().extract({left:0,top,width:meta.width,height:Math.round(meta.height*(row+1)/2)-top}).resize(1280,720,{fit:'cover'}).webp({quality:93}).toFile(resolve(dir,event.file))
 }
}
const bg=sharp(resolve(sources,'new-locations-v3.png')),meta=await bg.metadata()
for(let i=0;i<4;i++){
 const col=i%2,row=Math.floor(i/2),left=Math.round(meta.width*col/2),top=Math.round(meta.height*row/2)
 await bg.clone().extract({left,top,width:Math.round(meta.width*(col+1)/2)-left,height:Math.round(meta.height*(row+1)/2)-top}).resize(1280,720,{fit:'cover'}).webp({quality:92}).toFile(resolve(dir,`${col?'track':'radio'}-${row?'night':'day'}.webp`))
}
writeFileSync(artPath,JSON.stringify(art,null,2)+'\n')
console.log('Prepared 17 background plates, 5 transparent atlases (24 heroine expressions), 8 event CGs and title art.')
