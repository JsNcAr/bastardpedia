import type { ReactNode } from 'react';
import type { IconName } from '@/icons/sprite.generated';
import { Icon } from './Icon';

/** Empty, error and loading states: a cause and, where there is one, the next action. */
export function StateMessage({
  icon,
  title,
  children,
  action,
  busy = false,
  role,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  busy?: boolean;
  role?: 'status' | 'alert';
}) {
  return (
    <div className="state" role={role} aria-busy={busy || undefined}>
      <span className="state-icon">
        <Icon name={icon} />
      </span>
      <h2 className="state-title">{title}</h2>
      {children ? <div className="state-body">{children}</div> : null}
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}
