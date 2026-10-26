import { useState } from 'react'
import { useGame, SAVE_SLOTS, STORY_VERSION } from '../store'
import { scenes } from '../engine/load'
import { backgroundAsset } from '../art'
import { assetUrl, SmartImage } from './ui'
import { Modal } from './Modal'

export function SaveLoadMenu({mode,onClose}:{mode:'save'|'load';onClose:()=>void}) {
  const { listSaves, save, load } = useGame()
  const [overwrite, setOverwrite] = useState<string | null>(null)
  const [error, setError] = useState('')
  const saves = listSaves()
  return <Modal title={mode==='save'?'이 장면 남겨두기':'저장한 이야기'} onClose={onClose}>
    {overwrite ? <><p>이 슬롯의 저장을 현재 장면으로 바꿀까요?</p><div className="action-row"><button className="primary-button" onClick={()=>{save(overwrite);onClose()}}>덮어쓰기</button><button className="quiet-button" onClick={()=>setOverwrite(null)}>취소</button></div></> : <div className="save-slots">{SAVE_SLOTS.map(({id,label})=>{
      const data=saves[id], old=!!data&&data.storyVersion!==STORY_VERSION
      const disabled=mode==='load'&&(!data||old)
      return <button key={id} disabled={disabled} onClick={()=>{
        if(mode==='save'){if(data)setOverwrite(id);else{save(id);onClose()}}
        else if(load(id))onClose();else setError('이 저장을 불러올 수 없습니다. 다른 슬롯을 선택해주세요.')
      }}><div className="save-thumb">{data?.bg&&<SmartImage src={assetUrl(backgroundAsset(data.bg, scenes.get(data.sceneId)?.bgm_mood))} alt="저장한 장소" className="h-full w-full object-cover" />}</div><span><strong>{label}</strong><span>{data?.sceneTitle??'아직 남겨두지 않은 장면'}</span><small>{old?'이전 이야기 버전 · 원본 보관 중':data?`${data.playerName} · ${new Date(data.ts).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}`:'비어 있음'}</small></span></button>
    })}</div>}
    {Object.values(saves).some(s=>s&&s.storyVersion!==STORY_VERSION)&&<p className="menu-caption">이야기 구성이 달라져 이전 버전 저장은 불러올 수 없어요. 수동 슬롯은 덮어쓰지 않는 한 보관됩니다.</p>}
    {error&&<p role="alert">{error}</p>}
  </Modal>
}
