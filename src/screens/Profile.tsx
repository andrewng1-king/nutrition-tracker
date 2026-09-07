import { useState } from 'react'
import { SubTabs } from '../components/SubTabs'
import { Body } from './Body'
import { Foods } from './Foods'
import { History } from './History'
import { Wallet } from './Wallet'

type Sub = 'wallet' | 'foods' | 'body' | 'history'

const SUBS: [Sub, string][] = [
  ['wallet', 'Ví tiền'],
  ['foods', 'Món ăn'],
  ['body', 'Cơ thể'],
  ['history', 'Lịch sử'],
]

export function Profile({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const [sub, setSub] = useState<Sub>('wallet')

  return (
    <>
      <div className="screen" style={{ paddingBottom: 0 }}>
        <SubTabs tabs={SUBS} active={sub} onSelect={setSub} label="Mục trong Profile" />
      </div>
      {sub === 'wallet' && <Wallet onOpenDay={onOpenDay} />}
      {sub === 'foods' && <Foods />}
      {sub === 'body' && <Body />}
      {sub === 'history' && <History onOpenDay={onOpenDay} />}
    </>
  )
}
