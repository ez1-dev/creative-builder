import { useEffect, useRef, useState, type RefObject } from "react";

/** Barra de rolagem horizontal flutuante que espelha o scroll de um container.
 *  Fica visível na base do painel enquanto a tabela estiver rolável no eixo X. */
export function FloatingHScrollbar({ targetRef }: { targetRef: RefObject<HTMLDivElement> }) {
  const proxyRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const syncingRef = useRef<"none" | "target" | "proxy">("none");

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const update = () => {
      setScrollWidth(el.scrollWidth);
      setClientWidth(el.clientWidth);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    const onTargetScroll = () => {
      if (syncingRef.current === "proxy") { syncingRef.current = "none"; return; }
      const p = proxyRef.current;
      if (!p) return;
      syncingRef.current = "target";
      p.scrollLeft = el.scrollLeft;
    };
    el.addEventListener("scroll", onTargetScroll, { passive: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", onTargetScroll);
    };
  }, [targetRef]);

  const onProxyScroll = () => {
    if (syncingRef.current === "target") { syncingRef.current = "none"; return; }
    const el = targetRef.current;
    const p = proxyRef.current;
    if (!el || !p) return;
    syncingRef.current = "proxy";
    el.scrollLeft = p.scrollLeft;
  };

  const precisa = scrollWidth > clientWidth + 1;
  if (!precisa) return null;

  return (
    <div
      ref={proxyRef}
      onScroll={onProxyScroll}
      className="overflow-x-auto h-3.5 bg-background/90 backdrop-blur border-t border-border shadow-[0_-2px_6px_-2px_rgba(0,0,0,0.15)]"
    >
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}
