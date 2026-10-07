import {aiItems,type AiItem,type Category} from '@/data/ai';
import {localize,type PortalItem} from './schema';
export function toAiItem(item:PortalItem,locale:string,id=item.id):AiItem {
  if(item.type!=='ai')throw new Error('Expected AI item');
  const base=aiItems.find(ai=>ai.id===item.data.aiId);
  const category=(['chat','search','documents','video','music'].includes(item.category)?item.category:'chat') as Exclude<Category,'all'>;
  return {id,name:localize(item.title,locale),category,url:item.data.url,logo:base?.logo||'',coverId:base?.id||'custom',desktopApp:base?.url===item.data.url?base.desktopApp:undefined,content:{summary:localize(item.summary,locale),description:localize(item.data.description,locale),features:locale==='en'&&item.data.features.en.length?item.data.features.en:item.data.features.ko,prompt:localize(item.data.prompt,locale)}};
}
