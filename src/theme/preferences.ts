export type Preferences = {mode: 'system' | 'light' | 'dark'; palette: 'gallery' | 'ocean' | 'tangerine' | 'forest'; scale: '100' | '115' | '130'};
export const preferenceKey = 'ai-gallery-preferences';
export const defaults: Preferences = {mode: 'system', palette: 'gallery', scale: '100'};
export const defaultSnapshot = JSON.stringify(defaults);
export function parsePreferences(raw: string): Preferences {
  try {
    const value = JSON.parse(raw);
    return {
      mode: ['system', 'light', 'dark'].includes(value.mode) ? value.mode : 'system',
      palette: ['gallery', 'ocean', 'tangerine', 'forest'].includes(value.palette) ? value.palette : 'gallery',
      scale: ['100', '115', '130'].includes(value.scale) ? value.scale : '100'
    };
  } catch {return defaults;}
}
export const themeScript = `(()=>{try{const p=JSON.parse(localStorage.getItem('ai-gallery-preferences')||'{}');const d=document.documentElement;d.dataset.mode=p.mode==='dark'||(p.mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';d.dataset.palette=['gallery','ocean','tangerine','forest'].includes(p.palette)?p.palette:'gallery';d.dataset.scale=['100','115','130'].includes(p.scale)?p.scale:'100';}catch{}})();`;
