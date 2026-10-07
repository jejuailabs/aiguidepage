import {aiItems,type AiItem,type Category} from '@/data/ai';
import {localize,type PortalItem} from './schema';
import {aiCategoryIds,defaultAiCategories,type AiCategory} from './ai-categories';
export function toAiItem(item:PortalItem,locale:string,id=item.id,options:AiCategory[]=defaultAiCategories):AiItem {
  if(item.type!=='ai')throw new Error('Expected AI item');
  const base=aiItems.find(ai=>ai.id===item.data.aiId);
  const category=item.category as Exclude<Category,'all'>;
  return {id,name:localize(item.title,locale),category,categories:aiCategoryIds(item),categoryLabels:aiCategoryIds(item).map(id=>{const option=options.find(option=>option.id===id);return option?localize(option.title,locale):id;}),url:item.data.url,logo:base?.logo||'',coverId:base?.id||'custom',desktopApp:base?.url===item.data.url?base.desktopApp:undefined,mobileApp:base?.url===item.data.url?base.mobileApp:undefined,content:{summary:localize(item.summary,locale),description:localize(item.data.description,locale),features:locale==='en'&&item.data.features.en.length?item.data.features.en:item.data.features.ko,prompt:localize(item.data.prompt,locale)}};
}
