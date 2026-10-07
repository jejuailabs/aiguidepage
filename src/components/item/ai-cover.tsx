import Image from 'next/image';
import type {AiItem} from '@/data/ai';

export function AiCover({item}: {item: AiItem}) {
  return <div className={`ai-cover cover-${item.id}`}>
    <div className="cover-art" aria-hidden="true"><span className="art-layer one" /><span className="art-layer two" /><span className="art-layer three" /></div>
    <Image className="service-logo" src={`/brands/${item.logo}`} alt="" width={112} height={112} unoptimized draggable={false} />
    <span className="cover-name">{item.name}</span>
    <span className="cover-grain" aria-hidden="true" />
  </div>;
}
