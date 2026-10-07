'use client';
import {useTranslations} from 'next-intl';
import {ArrowUpRight} from 'lucide-react';
import {motion} from 'motion/react';
import type {AiItem} from '@/data/ai';
import {AiCover} from './ai-cover';

export function AiCard({item, dimmed, onOpen}: {item: AiItem; dimmed: boolean; onOpen: (item: AiItem, element: HTMLElement) => void}) {
  const t = useTranslations();
  return <article className={`ai-card${dimmed ? ' is-dimmed' : ''}`} data-item={item.id}>
    <motion.div layoutId={`cover-${item.id}`} className="card-object">
      <button className="card-trigger" onClick={event => onOpen(item, event.currentTarget)} aria-label={`${item.name} — ${t('item.explain')}`}>
        <AiCover item={item} />
      </button>
      <div className="card-actions">
        <a className="cover-action primary" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.name} — ${t('item.openSite')} (${t('shell.newWindow')})`}>{t('item.open')}<ArrowUpRight size={15} /></a>
        <button className="cover-action secondary" onClick={event => onOpen(item, event.currentTarget)} aria-label={`${item.name} — ${t('item.more')}`}>{t('item.explain')}</button>
      </div>
    </motion.div>
  </article>;
}
