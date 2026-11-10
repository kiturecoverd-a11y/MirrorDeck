import { useEffect } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { Toasts } from '../ui/Toasts'
import { useNav, useDevices, useSessions, useSettings } from '../../lib/store'
import { HomePage } from '../../pages/Home'
import { DevicesPage } from '../../pages/Devices'
import { ScreenMirrorPage } from '../../pages/ScreenMirror'
import { WirelessConnectPage } from '../../pages/WirelessConnect'
import { FileManagerPage } from '../../pages/FileManager'
import { ApplicationsPage } from '../../pages/Applications'
import { RecordingStudioPage } from '../../pages/RecordingStudio'
import { AutomationPage } from '../../pages/Automation'
import { PerformancePage } from '../../pages/Performance'
import { HistoryPage } from '../../pages/History'
import { SettingsPage } from '../../pages/Settings'
import { AboutPage } from '../../pages/About'

export function AppShell() {
  const active = useNav((s) => s.active)
  const setActive = useNav((s) => s.setActive)
  const refreshDevices = useDevices((s) => s.refresh)
  const refreshSessions = useSessions((s) => s.refresh)
  const adbAvailable = useDevices((s) => s.adbAvailable)

  useEffect(() => {
    refreshDevices()
    refreshSessions()
    useSettings.getState().load()
  }, [refreshDevices, refreshSessions])

  const render = () => {
    switch (active) {
      case 'devices':
        return <DevicesPage />
      case 'mirror':
        return <ScreenMirrorPage />
      case 'wireless':
        return <WirelessConnectPage />
      case 'files':
        return <FileManagerPage />
      case 'apps':
        return <ApplicationsPage />
      case 'recording':
        return <RecordingStudioPage />
      case 'automation':
        return <AutomationPage />
      case 'performance':
        return <PerformancePage />
      case 'history':
        return <HistoryPage />
      case 'settings':
        return <SettingsPage />
      case 'about':
        return <AboutPage />
      case 'home':
      default:
        return <HomePage />
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1 flex-row">
        <Sidebar active={active} onSelect={setActive} adbAvailable={adbAvailable} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{render()}</main>
      </div>
      <Toasts />
    </div>
  )
}
