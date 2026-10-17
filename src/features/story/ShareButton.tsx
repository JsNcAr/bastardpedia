import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/ui/Icon';

/**
 * Share a story's clean address (no filters). Phones with a share sheet get
 * "Share"; elsewhere "Copy link" writes it to the clipboard. If the clipboard is
 * blocked, the address appears selected in a field to copy by hand.
 */
export function ShareButton({ storyId, title }: { storyId: string; title: string }) {
  const [status, setStatus] = useState('');
  const [manual, setManual] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const url = new URL(`/stories/${storyId}`, window.location.origin).href;
  const canShare = typeof navigator.share === 'function';

  useEffect(() => {
    if (manual) field.current?.select();
  }, [manual]);

  async function share() {
    setStatus('');
    if (canShare) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The visitor closed the share sheet: nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied');
    } catch {
      setManual(true);
      setStatus('Copy the link below');
    }
  }

  return (
    <div className="share">
      <button type="button" className="button button-compact" onClick={() => void share()}>
        <Icon name={canShare ? 'share-2' : 'link'} size="sm" />
        {canShare ? 'Share' : 'Copy link'}
      </button>
      <span role="status" className="share-status">
        {status}
      </span>
      {manual ? (
        <input
          ref={field}
          className="share-url"
          readOnly
          value={url}
          aria-label="Link to this story"
        />
      ) : null}
    </div>
  );
}
