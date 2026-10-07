export type Category = string;
export type DesktopPlatform = 'windows' | 'macos' | 'linux';
export type DesktopApp = {
  launchUrl: string;
  installUrl: string;
  platforms: DesktopPlatform[];
  source: string;
  checkedAt: string;
};
export type MobileApp={iosUrl?:string;androidUrl?:string;androidPackage?:string;installUrl:string;checkedAt:string};
export type AiItem = {id: string; name: string; category: Exclude<Category, 'all'>; categories?: Exclude<Category, 'all'>[];categoryLabels?:string[]; url: string; logo: string; desktopApp?: DesktopApp;mobileApp?:MobileApp;coverId?:string;content?:{summary:string;description:string;features:string[];prompt:string}};
export const categories: Category[] = ['all', 'chat', 'search', 'documents', 'image', 'video', 'music'];
export const aiItems: AiItem[] = [
  {id: 'claude', name: 'Claude', category: 'chat', url: 'https://claude.ai', logo: 'claude-color.svg', desktopApp: {
    launchUrl: 'claude://claude.ai/new', installUrl: 'https://claude.com/download',
    platforms: ['windows', 'macos', 'linux'],
    source: 'https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link', checkedAt: '2026-10-07'
  },mobileApp:{iosUrl:'https://claude.ai/new',androidUrl:'https://claude.ai/new',androidPackage:'com.anthropic.claude',installUrl:'https://claude.com/download',checkedAt:'2026-10-08'}},
  {id: 'chatgpt', name: 'ChatGPT', category: 'chat', categories: ['chat', 'image'], url: 'https://chatgpt.com', logo: 'openai.svg',mobileApp:{iosUrl:'https://chatgpt.com/#native',androidUrl:'https://chatgpt.com/',androidPackage:'com.openai.chatgpt',installUrl:'https://chatgpt.com/download',checkedAt:'2026-10-08'}},
  {id: 'gemini', name: 'Gemini', category: 'chat', categories: ['chat', 'image'], url: 'https://gemini.google.com', logo: 'gemini-color.svg',mobileApp:{androidUrl:'https://gemini.google.com/app',androidPackage:'com.google.android.apps.bard',installUrl:'https://gemini.google.com/app/download',checkedAt:'2026-10-08'}},
  {id: 'grok', name: 'Grok', category: 'chat', categories: ['chat', 'image'], url: 'https://grok.com', logo: 'grok.svg',mobileApp:{iosUrl:'https://grok.com/',androidUrl:'https://grok.com/',androidPackage:'ai.x.grok',installUrl:'https://x.ai/grok',checkedAt:'2026-10-08'}},
  {id: 'perplexity', name: 'Perplexity', category: 'search', url: 'https://www.perplexity.ai', logo: 'perplexity.svg',mobileApp:{iosUrl:'https://www.perplexity.ai/search',androidUrl:'https://www.perplexity.ai/search',androidPackage:'ai.perplexity.app.android',installUrl:'https://www.perplexity.ai/',checkedAt:'2026-10-08'}},
  {id: 'genspark', name: 'Genspark', category: 'documents', url: 'https://www.genspark.ai', logo: 'genspark.svg'},
  {id: 'notebooklm', name: 'NotebookLM', category: 'documents', url: 'https://notebooklm.google.com', logo: 'notebooklm.svg',mobileApp:{iosUrl:'https://notebooklm.google.com/',androidUrl:'https://notebooklm.google.com/',androidPackage:'com.google.android.apps.labs.language.tailwind',installUrl:'https://notebooklm.google.com/',checkedAt:'2026-10-08'}},
  {id: 'flow', name: 'Google Flow', category: 'video', url: 'https://labs.google/fx/tools/flow', logo: 'google-color.svg'},
  {id: 'suno', name: 'Suno', category: 'music', url: 'https://suno.com', logo: 'suno.svg',mobileApp:{iosUrl:'https://suno.com/create',androidUrl:'https://suno.com/create',androidPackage:'com.suno.android',installUrl:'https://suno.com/',checkedAt:'2026-10-08'}},
  {id: 'flow-music', name: 'Google Flow Music', category: 'music', url: 'https://flowmusic.google/', logo: 'google-color.svg',mobileApp:{iosUrl:'https://flowmusic.google/',installUrl:'https://flowmusic.google/',checkedAt:'2026-10-08'}}
];
