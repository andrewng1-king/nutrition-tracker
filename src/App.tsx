import { useState, type ComponentType } from 'react'
import { IconLift, IconProfile, IconSettings, IconToday } from './components/icons'
import { dateKey } from './lib/macros'
import { Profile } from './screens/Profile'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { Training } from './screens/Training'

type Tab = 'today' | 'training' | 'profile' | 'settings'

const TABS: [Tab, ComponentType<{ className?: string }>, string][] = [
  ['today', IconToday, 'Hôm nay'],
  ['training', IconLift, 'Bài tập'],
  ['profile', IconProfile, 'Profile'],
  ['settings', IconSettings, 'Cài đặt'],
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(dateKey())

  const openDay = (d: string) => {
    setDate(d)
    setTab('today')
  }

  return (
    <div className="app">
      {tab === 'today' && <Today date={date} setDate={setDate} />}
      {tab === 'training' && <Training onOpenDay={openDay} />}
      {tab === 'profile' && <Profile onOpenDay={openDay} />}
      {tab === 'settings' && <Settings />}

      <nav className="tabbar">
        {TABS.map(([key, Icon, label]) => (
          <button
            key={key}
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => {
              if (key === 'today') setDate(dateKey())
              setTab(key)
            }}
          >
            <Icon className="ico" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
