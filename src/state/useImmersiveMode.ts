import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';

/** Presentation state only: never dispatches scene, selection or clock actions. */
export function useImmersiveMode({
  hasOpenDetails,
  onCloseDetails,
}: {
  hasOpenDetails: boolean;
  onCloseDetails: () => void;
}) {
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const entryButton = useRef<HTMLButtonElement | null>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const wasImmersive = useRef(false);
  const hadDetails = useRef(false);

  const enterImmersiveMode = (event: MouseEvent<HTMLButtonElement>) => {
    onCloseDetails();
    entryButton.current = event.currentTarget;
    setIsImmersiveMode(true);
  };
  const exitImmersiveMode = () => setIsImmersiveMode(false);

  useLayoutEffect(() => {
    if (isImmersiveMode && (!wasImmersive.current || (hadDetails.current && !hasOpenDetails)))
      exitButtonRef.current?.focus({ preventScroll: true });
    else if (!isImmersiveMode && wasImmersive.current)
      entryButton.current?.focus({ preventScroll: true });
    wasImmersive.current = isImmersiveMode;
    hadDetails.current = hasOpenDetails;
  }, [isImmersiveMode, hasOpenDetails]);

  useEffect(() => {
    if (!isImmersiveMode) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat) return;
        if (hasOpenDetails) onCloseDetails();
        else setIsImmersiveMode(false);
      }
    };
    window.addEventListener('keydown', keydown, true);
    return () => window.removeEventListener('keydown', keydown, true);
  }, [isImmersiveMode, hasOpenDetails, onCloseDetails]);

  return { isImmersiveMode, enterImmersiveMode, exitImmersiveMode, exitButtonRef };
}
