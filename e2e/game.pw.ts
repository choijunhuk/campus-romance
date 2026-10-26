import { test, expect, type Page } from '@playwright/test'

async function setup(page:Page) {
  await page.addInitScript(()=>localStorage.setItem('vn_settings',JSON.stringify({textSpeed:2,skipUnread:true,muted:true})))
  await page.goto('/')
}
async function start(page:Page) {
  await page.getByRole('button',{name:'이야기 시작하기'}).click()
  await page.getByLabel('주인공 이름').fill('테스트준')
  await page.getByRole('button',{name:'407호 문 열기'}).click()
  await expect(page.locator('.game-stage')).toBeVisible()
}
async function nextChoice(page:Page) {
  const skip=page.getByRole('button',{name:'스킵',exact:true})
  if(await skip.getAttribute('aria-pressed')!=='true')await skip.click()
  await expect(page.locator('.choices,.ending-screen').first()).toBeVisible({timeout:15000})
}
async function finish(page:Page,route:0|1,preference=0) {
  let saved=false,captured=false
  for(let i=0;i<50;i++) {
    if(await page.locator('.ending-screen').isVisible())return
    await nextChoice(page)
    if(await page.locator('.ending-screen').isVisible())return
    const buttons=page.locator('.choices button')
    const labels=await buttons.allTextContents()
    if(!saved&&await page.locator('.has-cg').isVisible()) {
      const source=await page.locator('.cg-art').getAttribute('src')
      await page.getByRole('button',{name:'게임 메뉴 열기'}).click()
      await page.getByRole('button',{name:'저장하기 현재 장면을 남겨두기'}).click()
      await page.getByRole('button').filter({hasText:'슬롯 1'}).click()
      await page.getByRole('button',{name:'게임 메뉴 열기'}).click()
      await page.getByRole('button',{name:'불러오기 이전 장면으로 돌아가기'}).click()
      await page.getByRole('button').filter({hasText:'슬롯 1'}).click()
      await expect(page.locator('.cg-art')).toHaveAttribute('src',source!)
      await expect(page.locator('.choices')).toBeVisible()
      saved=true
    }
    const branching=labels.some(l=>l.includes('프로젝트]'))
    const finale=labels.some(l=>l.includes('다음 학기도'))
    await buttons.nth(branching?route:finale?0:preference).click()
    if(saved&&!captured&&await page.locator('.has-cg .dialogue').isVisible()){
      await expect(page.locator('.dialogue-footer')).toContainText('클릭 또는 Space')
      await page.screenshot({path:`test-results/cg-route-${route}-desktop.png`})
      await page.setViewportSize({width:390,height:844})
      await expect.poll(async()=>{
        const art=await page.locator('.cg-art').boundingBox(),dialogue=await page.locator('.dialogue').boundingBox()
        return art!.y+art!.height-dialogue!.y
      }).toBeLessThanOrEqual(0)
      await page.screenshot({path:`test-results/cg-route-${route}-mobile.png`})
      await page.setViewportSize({width:1440,height:900})
      captured=true
    }
  }
  throw new Error('Story did not finish')
}

test('Jian slow romance: actual UI playthrough, mid-CG save/load, ending and gallery',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  const failedImages:string[]=[]
  page.on('response',r=>{if(r.status()>=400&&/\.(png|webp)/.test(r.url()))failedImages.push(r.url())})
  await setup(page);await start(page);await finish(page,0,1)
  await expect(page.locator('.ending-screen h1')).toHaveText('같은 편으로 맞는 여름')
  await page.getByRole('button',{name:'남겨진 장면 보기'}).click()
  await expect(page.locator('.gallery-card:not(:disabled)')).toHaveCount(2)
  await expect(page.locator('.new-mark')).toHaveCount(2)
  await page.locator('.gallery-card:not(:disabled)').first().click()
  await expect(page.locator('.viewer-image')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.new-mark')).toHaveCount(1)
  expect(errors).toEqual([]);expect(failedImages).toEqual([])
})

test('Narae direct romance reaches her ending and unlocks both event illustrations',async({page})=>{
  await setup(page);await start(page);await finish(page,1,0)
  await expect(page.locator('.ending-screen h1')).toHaveText('다음 약속은 우리가')
  await page.getByRole('button',{name:'남겨진 장면 보기'}).click()
  await expect(page.locator('.gallery-card:not(:disabled)')).toHaveCount(2)
  await page.getByRole('button',{name:'유나래',exact:true}).click()
  await expect(page.locator('.gallery-card')).toHaveCount(2)
})

for(const viewport of [{width:360,height:800},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
  test(`title and reading controls fit ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport)
    await setup(page)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.screenshot({path:`test-results/title-${viewport.width}.png`})
    await start(page)
    await page.locator('.dialogue').click()
    await page.locator('.dialogue').click()
    await expect(page.locator('.stage-character')).toBeVisible()
    await expect(page.locator('.dialogue-footer')).toContainText('클릭 또는 Space')
    await page.screenshot({path:`test-results/game-${viewport.width}.png`})
    await page.getByRole('button',{name:'게임 메뉴 열기'}).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button',{name:'읽기 설정 글자·속도·소리'}).click()
    const size=page.getByRole('slider').first()
    await size.fill('26')
    await page.keyboard.press('Escape')
    const box=await page.locator('.dialogue').boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height)
    await page.keyboard.press('h')
    await expect(page.locator('.dialogue')).toHaveCount(0)
    await page.keyboard.press('h')
    await expect(page.locator('.dialogue')).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  })
}
