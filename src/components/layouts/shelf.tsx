'use client';
import {useSyncExternalStore} from 'react';
import {useTranslations} from 'next-intl';
import type {AiItem, Category} from '@/data/ai';
import {AiCard} from '@/components/item/ai-card';

const subscribe = (listener: () => void) => {window.addEventListener('resize', listener); return () => window.removeEventListener('resize', listener);};
const getPerShelf = () => window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 5;
export function ShelfLayout({items, category, onOpen}: {items: AiItem[]; category: Category; onOpen: (item: AiItem, element: HTMLElement) => void}) {
  const t = useTranslations('home');
  const perShelf = useSyncExternalStore(subscribe, getPerShelf, () => 5);
  const rows = Array.from({length: Math.ceil(items.length / perShelf)}, (_, i) => items.slice(i * perShelf, (i + 1) * perShelf));
  return <div className="shelves">
    {rows.map((row, index) => <section className="shelf-row" key={index} aria-label={t('shelfLabel', {number: index + 1})}>
      <div className="shelf-items">{row.map(item => <AiCard key={item.id} item={item} dimmed={category !== 'all' && item.category !== category && !item.categories?.includes(category)} onOpen={onOpen} />)}</div>
      <div className="physical-shelf" aria-hidden="true"><div className="shelf-top" /><div className="shelf-front" /></div>
    </section>)}
  </div>;
}
