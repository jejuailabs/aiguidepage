export type Category = string;
export type DesktopPlatform = 'windows' | 'macos' | 'linux';
export type DesktopApp = {
  launchUrl: string;
  installUrl: string;
  platforms: DesktopPlatform[];
  source: string;
  checkedAt: string;
};
export type MobileApp={iosUrl?:string;iosStoreUrl?:string;androidUrl?:string;androidPackage?:string;installUrl:string;checkedAt:string};
export type AiItem = {id: string; name: string; category: Exclude<Category, 'all'>; categories?: Exclude<Category, 'all'>[];categoryLabels?:string[]; url: string; logo: string; desktopApp?: DesktopApp;mobileApp?:MobileApp;coverId?:string;content?:{summary:string;description:string;features:string[];prompt:string}};
export const categories: Category[] = ['all', 'chat', 'search', 'documents', 'image', 'video', 'music'];
export const aiItems: AiItem[] = [
  {id: 'claude', name: 'Claude', category: 'chat', url: 'https://claude.ai', logo: 'claude-color.svg', desktopApp: {
    launchUrl: 'claude://claude.ai/new', installUrl: 'https://claude.com/download',
    platforms: ['windows', 'macos', 'linux'],
    source: 'https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link', checkedAt: '2026-10-07'
  },mobileApp:{iosUrl:'https://claude.ai/new',iosStoreUrl:'https://apps.apple.com/app/id6473753684',androidUrl:'https://claude.ai/new',androidPackage:'com.anthropic.claude',installUrl:'https://claude.com/download',checkedAt:'2026-10-19'}},
  {id: 'chatgpt', name: 'ChatGPT', category: 'chat', categories: ['chat', 'image'], url: 'https://chatgpt.com', logo: 'openai.svg',mobileApp:{iosUrl:'https://chatgpt.com/#native',iosStoreUrl:'https://apps.apple.com/app/id6448311069',androidUrl:'https://chatgpt.com/',androidPackage:'com.openai.chatgpt',installUrl:'https://chatgpt.com/download',checkedAt:'2026-10-19'}},
  {id: 'gemini', name: 'Gemini', category: 'chat', categories: ['chat', 'image'], url: 'https://gemini.google.com', logo: 'gemini-color.svg',mobileApp:{iosStoreUrl:'https://apps.apple.com/app/id6477489729',androidUrl:'https://gemini.google.com/app',androidPackage:'com.google.android.apps.bard',installUrl:'https://gemini.google.com/app/download',checkedAt:'2026-10-19'}},
  {id: 'grok', name: 'Grok', category: 'chat', categories: ['chat', 'image'], url: 'https://grok.com', logo: 'grok.svg',mobileApp:{iosUrl:'https://grok.com/',iosStoreUrl:'https://apps.apple.com/app/id6670324846',androidUrl:'https://grok.com/',androidPackage:'ai.x.grok',installUrl:'https://x.ai/grok',checkedAt:'2026-10-19'}},
  {id: 'perplexity', name: 'Perplexity', category: 'search', url: 'https://www.perplexity.ai', logo: 'perplexity.svg',mobileApp:{iosUrl:'https://www.perplexity.ai/search',iosStoreUrl:'https://apps.apple.com/app/id1668000334',androidUrl:'https://www.perplexity.ai/search',androidPackage:'ai.perplexity.app.android',installUrl:'https://www.perplexity.ai/',checkedAt:'2026-10-19'}},
  {id: 'genspark', name: 'Genspark', category: 'documents', url: 'https://www.genspark.ai', logo: 'genspark.svg'},
  {id: 'notebooklm', name: 'NotebookLM', category: 'documents', url: 'https://notebooklm.google.com', logo: 'notebooklm.svg',mobileApp:{iosUrl:'https://notebooklm.google.com/',iosStoreUrl:'https://apps.apple.com/app/id6737527615',androidUrl:'https://notebooklm.google.com/',androidPackage:'com.google.android.apps.labs.language.tailwind',installUrl:'https://notebooklm.google.com/',checkedAt:'2026-10-19'}},
  {id: 'flow', name: 'Google Flow', category: 'video', url: 'https://labs.google/fx/tools/flow', logo: 'google-color.svg'},
  {id: 'suno', name: 'Suno', category: 'music', url: 'https://suno.com', logo: 'suno.svg',mobileApp:{iosUrl:'https://suno.com/create',iosStoreUrl:'https://apps.apple.com/app/id6480136315',androidUrl:'https://suno.com/create',androidPackage:'com.suno.android',installUrl:'https://suno.com/',checkedAt:'2026-10-19'}},
  {id: 'flow-music', name: 'Google Flow Music', category: 'music', url: 'https://flowmusic.google/', logo: 'google-color.svg',mobileApp:{iosUrl:'https://flowmusic.google/',installUrl:'https://flowmusic.google/',checkedAt:'2026-10-08'}}
];
