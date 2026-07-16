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

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setScrollWidth(el.scrollWidth);
        setClientWidth(el.clientWidth);
      });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Observa também os filhos: quando a tabela renderiza, scrollWidth muda sem o container mudar.
    Array.from(el.children).forEach((c) => ro.observe(c as Element));

    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });

    // Re-mede quando o alvo se torna visível (drawer abrindo, tab trocando etc.).
    const io = new IntersectionObserver(update);
    io.observe(el);

    const onTargetScroll = () => {
      if (syncingRef.current === "proxy") { syncingRef.current = "none"; return; }
      const p = proxyRef.current;
      if (!p) return;
      syncingRef.current = "target";
      p.scrollLeft = el.scrollLeft;
    };
    el.addEventListener("scroll", onTargetScroll, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      el.removeEventListener("scroll", onTargetScroll);
      window.removeEventListener("resize", update);
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
      className="overflow-x-auto h-4 bg-muted border-t-2 border-primary/30 shadow-[0_-2px_6px_-2px_rgba(0,0,0,0.15)]"
      aria-label="Barra de rolagem horizontal"
    >
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}
