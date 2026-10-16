import type { IconName } from '@/icons/sprite.generated';

/** A lucide icon from the sprite. Decorative unless given a label. */
export function Icon({
  name,
  label,
  size = 'md',
}: {
  name: IconName;
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <svg
      className={`icon icon-${size}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}
