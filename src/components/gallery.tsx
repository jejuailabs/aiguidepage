'use client';
import {useRouter} from 'next/navigation';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useTranslations,useLocale} from 'next-intl';
import {LayoutGroup, MotionConfig} from 'motion/react';
import {ArrowRight, ArrowUpRight, Search, Sparkles, X} from 'lucide-react';
import {aiItems, type AiItem, type Category} from '@/data/ai';
import {defaultAiCategories,type AiCategory} from '@/lib/ai-categories';
import {toAiItem} from '@/lib/ai-item';
import {localize,type PortalItem} from '@/lib/schema';
import type {HallId} from '@/data/halls';
import {usePreferences} from '@/theme/use-preferences';
import {Header} from './shell/header';
import {Settings} from './shell/settings';
import {Modal} from './shell/modal';
import {ShelfLayout} from './layouts/shelf';
import {AiStage} from './item/ai-stage';
import {ShortcutActions} from './shortcuts/shortcut-actions';

const subscribeToLocation = (callback: () => void) => {
  window.addEventListener('popstate', callback); window.addEventListener('gallery-location', callback);
  return () => {window.removeEventListener('popstate', callback); window.removeEventListener('gallery-location', callback);};
};
const selectedItem = () => new URLSearchParams(window.location.search).get('item') || '';
export function Gallery() {
  const router=useRouter(),t = useTranslations();
  const locale=useLocale();
  const [catalog,setCatalog]=useState(aiItems);
  const [categoryOptions,setCategoryOptions]=useState(defaultAiCategories);
  useEffect(()=>{const controller=new AbortController();void fetch('/api/catalog',{signal:controller.signal}).then(async response=>{if(response.ok){const data=await response.json() as {items:PortalItem[];categories?:AiCategory[]};const options=data.categories||defaultAiCategories;setCategoryOptions(options);setCatalog(data.items.map(item=>toAiItem(item,locale,item.id,options)));}}).catch(()=>{});return()=>controller.abort();},[locale]);
  const {preferences, update} = usePreferences();
  const selectedId = useSyncExternalStore(subscribeToLocation, selectedItem, () => '');
  const activeItem = catalog.find(item => item.id === selectedId);
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [panel, setPanel] = useState<'settings' | 'login' | HallId | null>(null);
  const focusReturn = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const pushedItem = useRef(false);
  const activeCategory=category==='all'||categoryOptions.some(option=>option.id===category&&option.enabled)?category:'all';
  const visibleItems = catalog.filter(item => [item.name, item.content?.summary||t(`ai.${item.id}.summary`),...(item.categories||[item.category]).map(id=>{const option=categoryOptions.find(option=>option.id===id);return option?localize(option.title,locale):id;})].join(' ').toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {if (searchOpen) searchInput.current?.focus();}, [searchOpen]);
  const rememberFocus = () => {focusReturn.current = document.activeElement as HTMLElement;};
  const openItem = (item: AiItem, element: HTMLElement) => {
    focusReturn.current = element;
    const url = new URL(window.location.href); url.searchParams.set('item', item.id);
    window.history.pushState({...window.history.state}, '', url);
    pushedItem.current = true;
    window.dispatchEvent(new Event('gallery-location'));
  };
  const closeItem = () => {
    if (pushedItem.current) {pushedItem.current = false; window.history.back();}
    else {const url = new URL(window.location.href); url.searchParams.delete('item'); window.history.replaceState(window.history.state, '', url); window.dispatchEvent(new Event('gallery-location'));}
  };
  const openPanel = (next: typeof panel) => {rememberFocus(); setPanel(next);};
  return <MotionConfig reducedMotion="user"><LayoutGroup>
    <Header mode={preferences.mode} onSettings={() => openPanel('settings')} onLogin={() => router.push(`/${locale}/login`)} onSearch={() => setSearchOpen(value => !value)}
      onTheme={() => update({mode: document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark'})}
      onHall={id => {if (id === 'tools') router.push(`/${locale}/tools`); else if (id !== 'ai') router.push(`/${locale}/orgs`); else {setCategory('all'); setQuery(''); window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});}}} />
    <main id="gallery" className="gallery-main">
      <section className="gallery-intro">
        <div><p className="eyebrow">{t('home.eyebrow')}</p><h1>{t('home.title').split('\n').map((part, i) => <span key={part}>{i > 0 && ' '}{part}</span>)}</h1><p className="intro-description">{t('home.subtitle')}</p></div>
        <span className="intro-hint"><span className="hint-dot" />{t('home.hint')}</span>
      </section>
      <ShortcutActions/>
      {searchOpen && <div className="search-field"><Search size={20} /><label className="sr-only" htmlFor="gallery-search">{t('shell.search')}</label><input ref={searchInput} id="gallery-search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('home.searchPlaceholder')} /><button className="icon-button" aria-label={query ? t('home.clearSearch') : t('shell.close')} onClick={() => {if (query) setQuery(''); else setSearchOpen(false);}}><X size={20} /></button></div>}
      <div className="gallery-collection">
        <div className="category-section"><div className="category-bar" role="group" aria-label={t('home.filterLabel')}><button aria-pressed={activeCategory==='all'} className={activeCategory==='all'?'selected':''} onClick={()=>setCategory('all')}>{t('categories.all')}</button>{categoryOptions.filter(option=>option.enabled).map(option=><button key={option.id} aria-pressed={activeCategory===option.id} className={activeCategory===option.id?'selected':''} onClick={()=>setCategory(option.id)}>{localize(option.title,locale)}</button>)}</div></div>
        <div className="collection-caption"><span>{t('home.collection')}</span><span>{query ? t('home.results', {count: visibleItems.length}) : t('home.count', {count: catalog.length})}</span></div>
        {visibleItems.length > 0 ? <ShelfLayout items={visibleItems} category={activeCategory} onOpen={openItem} /> : <div className="empty-state"><Search size={32} /><h2>{t('home.noResults')}</h2><p>{t('home.noResultsHint')}</p><button className="pill-button" onClick={() => {setQuery(''); setCategory('all');}}>{t('home.reset')}<ArrowRight size={17} /></button></div>}
      </div>
      <footer className="gallery-footer"><span>{t('home.footer')}</span><div className="gallery-footer-links"><a href={`/${locale}/admin`}>{t('portal.aiAdmin')}</a><button onClick={() => router.push(`/${locale}/join`)}>{t('home.invitation')}<ArrowUpRight size={14} /></button></div></footer>
    </main>
    <Modal open={!!activeItem} onClose={closeItem} title={activeItem?.name || ''} description={activeItem ? activeItem.content?.summary||t(`ai.${activeItem.id}.summary`) : ''} className="stage-panel" returnFocus={focusReturn}>
      {activeItem && <AiStage key={activeItem.id} item={activeItem} />}
    </Modal>
    <Modal open={panel !== null} onClose={() => setPanel(null)} title={panel === 'settings' ? t('settings.title') : t(panel === 'login' ? 'upcoming.loginTitle' : 'upcoming.title')} description={panel === 'settings' ? t('settings.description') : t(panel === 'login' ? 'upcoming.loginDescription' : 'upcoming.description')} className={panel === 'settings' ? 'settings-panel' : 'upcoming-panel'} returnFocus={focusReturn}>
      {panel === 'settings' ? <Settings preferences={preferences} update={update} /> : <div className="upcoming-content"><span className="upcoming-icon"><Sparkles size={32} strokeWidth={1.2} /></span><h2>{t(panel === 'login' ? 'upcoming.loginTitle' : 'upcoming.title')}</h2><p>{t(panel === 'login' ? 'upcoming.loginDescription' : 'upcoming.description')}</p><button className="pill-button" onClick={() => setPanel(null)}>{t('upcoming.continue')}<ArrowRight size={17} /></button></div>}
    </Modal>
  </LayoutGroup></MotionConfig>;
}
