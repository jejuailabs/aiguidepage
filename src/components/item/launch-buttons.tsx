'use client';
import {useState, useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import {ArrowUpRight, Download, Monitor} from 'lucide-react';
import type {AiItem} from '@/data/ai';
import {desktopPlatform} from '@/lib/desktop-platform';

const subscribe = () => () => {};
const readPlatform = () => desktopPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

export function LaunchButtons({item}: {item: AiItem}) {
  const t = useTranslations();
  const platform = useSyncExternalStore(subscribe, readPlatform, () => null);
  const [requested, setRequested] = useState(false);
  const desktopApp = platform && item.desktopApp?.platforms.includes(platform) ? item.desktopApp : undefined;

  return <div className="launch-section">
    <div className="launch-buttons">
      <a className="pill-button stage-launch" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} — ${t('item.openSite')} (${t('shell.newWindow')})`}>{t('item.openSite')}<ArrowUpRight size={20} /></a>
      {desktopApp && <a className="app-launch-button desktop-app-control" href={desktopApp.launchUrl} onClick={() => setRequested(true)} data-desktop-launch aria-label={`${item.name} — ${t('launch.openApp')}`}><Monitor size={18} />{t('launch.openApp')}</a>}
    </div>
    {desktopApp && <div className="app-launch-help desktop-app-control">
      {requested ? <div className="app-launch-status" role="status"><strong>{t('launch.requested')}</strong><p>{t('launch.confirmHint')}</p><p>{t('launch.fallback')}</p></div> : <p>{t('launch.installedHint')}</p>}
      <a className="app-install-link" href={desktopApp.installUrl} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} — ${t('launch.install')} (${t('shell.newWindow')})`}><Download size={14} />{t('launch.install')}<ArrowUpRight size={13} /></a>
    </div>}
  </div>;
}
