'use client';
import {useLocale, useTranslations} from 'next-intl';
import {Check, Monitor, Moon, Sun} from 'lucide-react';
import {useRouter, usePathname} from '@/i18n/navigation';
import type {Locale} from '@/i18n/routing';
import type {Preferences} from '@/theme/preferences';

export function Settings({preferences, update}: {preferences: Preferences; update: (patch: Partial<Preferences>) => void}) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return <div className="settings-content">
    <span className="eyebrow">{t('eyebrow')}</span>
    <h2>{t('title')}</h2><p className="settings-description">{t('description')}</p>
    <div className="settings-field"><label htmlFor="language">{t('language')}</label><select id="language" value={locale} onChange={event => router.replace(pathname + window.location.search, {locale: event.target.value as Locale, scroll: false})}><option value="ko">한국어</option><option value="en">English</option></select></div>
    <fieldset className="settings-field"><legend>{t('appearance')}</legend><div className="segmented">{(['light', 'dark', 'system'] as const).map((mode, i) => {const Icon = [Sun, Moon, Monitor][i]; return <button key={mode} aria-pressed={preferences.mode === mode} onClick={() => update({mode})}><Icon size={17} />{t(mode)}</button>;})}</div></fieldset>
    <fieldset className="settings-field"><legend>{t('palette')}</legend><div className="palette-options">{(['gallery', 'ocean', 'tangerine', 'forest'] as const).map(palette => <button key={palette} className={`palette-option palette-${palette}`} aria-pressed={preferences.palette === palette} onClick={() => update({palette})}><span className="palette-dot">{preferences.palette === palette && <Check size={17} />}</span>{t(palette)}</button>)}</div></fieldset>
    <fieldset className="settings-field"><legend>{t('fontSize')}</legend><div className="segmented font-options">{(['100', '115', '130'] as const).map((scale, i) => <button key={scale} aria-pressed={preferences.scale === scale} onClick={() => update({scale})}><span style={{fontSize: `${16 + i * 3}px`}}>Aa</span>{t(['normal', 'large', 'largest'][i])}</button>)}</div></fieldset>
    <p className="settings-note"><Check size={14} />{t('saved')}</p>
  </div>;
}
