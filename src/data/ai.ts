export type Category = 'all' | 'chat' | 'search' | 'documents' | 'image' | 'video' | 'music';
export type DesktopPlatform = 'windows' | 'macos' | 'linux';
export type DesktopApp = {
  launchUrl: string;
  installUrl: string;
  platforms: DesktopPlatform[];
  source: string;
  checkedAt: string;
};
export type AiItem = {id: string; name: string; category: Exclude<Category, 'all'>; categories?: Exclude<Category, 'all'>[]; url: string; logo: string; desktopApp?: DesktopApp;coverId?:string;content?:{summary:string;description:string;features:string[];prompt:string}};
export const categories: Category[] = ['all', 'chat', 'search', 'documents', 'image', 'video', 'music'];
export const aiItems: AiItem[] = [
  {id: 'claude', name: 'Claude', category: 'chat', url: 'https://claude.ai', logo: 'claude-color.svg', desktopApp: {
    launchUrl: 'claude://claude.ai/new', installUrl: 'https://claude.com/download',
    platforms: ['windows', 'macos', 'linux'],
    source: 'https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link', checkedAt: '2026-10-07'
  }},
  {id: 'chatgpt', name: 'ChatGPT', category: 'chat', categories: ['chat', 'image'], url: 'https://chatgpt.com', logo: 'openai.svg'},
  {id: 'gemini', name: 'Gemini', category: 'chat', categories: ['chat', 'image'], url: 'https://gemini.google.com', logo: 'gemini-color.svg'},
  {id: 'grok', name: 'Grok', category: 'chat', categories: ['chat', 'image'], url: 'https://grok.com', logo: 'grok.svg'},
  {id: 'perplexity', name: 'Perplexity', category: 'search', url: 'https://www.perplexity.ai', logo: 'perplexity.svg'},
  {id: 'genspark', name: 'Genspark', category: 'documents', url: 'https://www.genspark.ai', logo: 'genspark.svg'},
  {id: 'notebooklm', name: 'NotebookLM', category: 'documents', url: 'https://notebooklm.google.com', logo: 'notebooklm.svg'},
  {id: 'flow', name: 'Google Flow', category: 'video', url: 'https://labs.google/fx/tools/flow', logo: 'google-color.svg'},
  {id: 'suno', name: 'Suno', category: 'music', url: 'https://suno.com', logo: 'suno.svg'}
];
