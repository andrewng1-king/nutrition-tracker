import { useState } from 'react'
import { SubTabs } from '../components/SubTabs'
import { Body } from './Body'
import { Foods } from './Foods'
import { History } from './History'
import { Wallet } from './Wallet'
import { Settings } from './Settings'
import { Page } from '../components/Page'
import { IconChevron } from '../components/icons'

type Sub = 'body' | 'history'

const SUBS: [Sub, string][] = [
  ['body', 'Cơ thể'],
  ['history', 'Lịch sử ăn uống'],
]

export function Progress({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [sub, setSub] = useState<Sub>('body')

  return (
    <>
      <div className="screen" style={{ paddingBottom: 0 }}>
        <h1 className="h1">Tiến bộ</h1>
        <SubTabs tabs={SUBS} active={sub} onSelect={setSub} label="Tiến bộ cá nhân" />
      </div>
      {sub === 'body' && <Body />}
      {sub === 'history' && <History onOpenDay={onOpenDay} />}
    </>
  )
}

export function More({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [section, setSection] = useState<'wallet' | 'foods' | 'settings' | null>(null)
  const items = [
    ['wallet', 'Ví ăn uống', 'Chi tiêu theo ngày và món'],
    ['foods', 'Món ăn', 'Thư viện và món tự thêm'],
    ['settings', 'Cài đặt', 'Mục tiêu, đồng bộ và backup'],
  ] as const
  return <div className="screen">
    <h1 className="h1">Thêm</h1>
    <div className="card list">
      {items.map(([key, title, description]) => <button key={key} className="list-item" onClick={() => setSection(key)}>
        <span className="grow"><span className="lift-name">{title}</span><span className="dim" style={{display:'block'}}>{description}</span></span>
        <IconChevron className="ico" />
      </button>)}
    </div>
    {section && <Page title={items.find(([key]) => key === section)![1]} onBack={() => setSection(null)}>
      {section === 'wallet' && <Wallet onOpenDay={onOpenDay} />}
      {section === 'foods' && <Foods />}
      {section === 'settings' && <Settings />}
    </Page>}
  </div>
}
