import { ICON_SPRITE } from '@/icons/sprite.generated';

/** Mounted once at the root; every <Icon> references a symbol in it. */
export function IconSprite() {
  return <div className="icon-sprite-host" dangerouslySetInnerHTML={{ __html: ICON_SPRITE }} />;
}
