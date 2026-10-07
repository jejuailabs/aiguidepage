'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Check, ChevronDown, Copy, Plus} from 'lucide-react';
import {motion} from 'motion/react';
import type {AiItem} from '@/data/ai';
import {AiCover} from './ai-cover';
import {LaunchButtons} from './launch-buttons';

export function AiStage({item}: {item: AiItem}) {
  const t = useTranslations();
  const [details, setDetails] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyPrompt = async () => {
    try {await navigator.clipboard.writeText(t(`ai.${item.id}.prompt`)); setCopyState('copied');}
    catch {setCopyState('failed');}
  };
  return <div className="stage">
    <motion.div layoutId={`cover-${item.id}`} className="stage-cover"><AiCover item={item} /></motion.div>
    <div className="stage-content">
      <span className="eyebrow">{t('item.explore')}</span>
      <h2>{item.name}</h2>
      <p className="stage-summary">{t(`ai.${item.id}.summary`)}</p>
      <div className="stage-tags"><span>{t(`categories.${item.category}`)}</span><span>{t('item.language')}</span></div>
      <p className="stage-description">{t(`ai.${item.id}.description`)}</p>
      <LaunchButtons item={item} />
      <button className="details-toggle" onClick={() => setDetails(!details)} aria-expanded={details} aria-controls="ai-details">{t(details ? 'item.less' : 'item.more')}<ChevronDown size={17} className={details ? 'rotated' : ''} /></button>
    </div>
    {details && <section id="ai-details" className="stage-details">
      <div><h3>{t('item.canDo')}</h3><ul>{[1,2,3].map(n => <li key={n}><Plus size={15} />{t(`ai.${item.id}.feature${n}`)}</li>)}</ul></div>
      <div className="prompt-example"><h3>{t('item.try')}</h3><p>{t(`ai.${item.id}.prompt`)}</p><button className="text-button" onClick={copyPrompt}>{copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}{t(copyState === 'copied' ? 'item.copied' : 'item.copy')}</button><span role="status" className={copyState === 'failed' ? 'copy-error' : 'sr-only'}>{copyState === 'copied' ? t('item.copied') : copyState === 'failed' ? t('item.copyFailed') : ''}</span></div>
      <p className="stage-notice">{t('item.provider')}<br />{t('item.privacy')}</p>
    </section>}
  </div>;
}
