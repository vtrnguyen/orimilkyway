import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

/** Presentation state only: never dispatches scene, selection or clock actions. */
export function useImmersiveMode({
  hasOpenDetails,
  onCloseDetails,
  hasOpenControls = false,
  onCloseControls,
}: {
  hasOpenDetails: boolean;
  onCloseDetails: () => void;
  hasOpenControls?: boolean;
  onCloseControls?: () => void;
}) {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const entryButton = useRef<HTMLButtonElement | null>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const wasImmersive = useRef(false);
  const hadDetails = useRef(false);
  const hadControls = useRef(false);

  const enterImmersiveMode = (event: MouseEvent<HTMLButtonElement>) => {
    onCloseDetails();
    onCloseControls?.();
    entryButton.current = event.currentTarget;
    setIsImmersiveMode(true);
  };
  const exitImmersiveMode = () => setIsImmersiveMode(false);

  useLayoutEffect(() => {
    if (
      isImmersiveMode &&
      (!wasImmersive.current ||
        (hadDetails.current && !hasOpenDetails) ||
        (hadControls.current && !hasOpenControls && !hasOpenDetails))
    )
      exitButtonRef.current?.focus({ preventScroll: true });
    else if (!isImmersiveMode && wasImmersive.current)
      entryButton.current?.focus({ preventScroll: true });
    wasImmersive.current = isImmersiveMode;
    hadDetails.current = hasOpenDetails;
    hadControls.current = hasOpenControls;
  }, [isImmersiveMode, hasOpenDetails, hasOpenControls]);

  useEffect(() => {
    if (!isImmersiveMode) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        if (hasOpenDetails) onCloseDetails();
        else if (hasOpenControls) onCloseControls?.();
        else setIsImmersiveMode(false);
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [isImmersiveMode, hasOpenDetails, onCloseDetails, hasOpenControls, onCloseControls]);

  return { isImmersiveMode, enterImmersiveMode, exitImmersiveMode, exitButtonRef };
}
