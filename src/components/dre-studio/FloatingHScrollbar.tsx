import { useEffect, useRef, useState, type RefObject } from "react";

/** Barra de rolagem horizontal flutuante que espelha o scroll de um container.
 *  Fica visível na base do painel enquanto a tabela estiver rolável no eixo X. */
export function FloatingHScrollbar({ targetRef }: { targetRef: RefObject<HTMLDivElement> }) {
  const proxyRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const syncingRef = useRef<"none" | "target" | "proxy">("none");

  const resolveScrollable = () => {
    const root = targetRef.current;
    if (!root) return null;
    if (root.scrollWidth > root.clientWidth + 1) return root;

    const descendants = Array.from(root.querySelectorAll<HTMLElement>("*"));
    return (
      descendants.find((node) => node.scrollWidth > node.clientWidth + 1) ?? root
    );
  };

  useEffect(() => {
    const root = targetRef.current;
    if (!root) return;

    let raf = 0;
    let scrollEl: HTMLElement | null = null;

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nextScrollEl = resolveScrollable();
        scrollEl = nextScrollEl;
        if (!nextScrollEl) {
          setScrollWidth(0);
          setClientWidth(0);
          return;
        }

        setScrollWidth(nextScrollEl.scrollWidth);
        setClientWidth(nextScrollEl.clientWidth);

        const p = proxyRef.current;
        if (p && p.scrollLeft !== nextScrollEl.scrollLeft) {
          p.scrollLeft = nextScrollEl.scrollLeft;
        }
      });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(root);
    // Observa também os filhos: quando a tabela renderiza, scrollWidth muda sem o container mudar.
    Array.from(root.children).forEach((c) => ro.observe(c as Element));

    const mo = new MutationObserver(update);
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });

    // Re-mede quando o alvo se torna visível (drawer abrindo, tab trocando etc.).
    const io = new IntersectionObserver(update);
    io.observe(root);

    const onTargetScroll = () => {
      if (syncingRef.current === "proxy") { syncingRef.current = "none"; return; }
      const p = proxyRef.current;
      const el = scrollEl ?? resolveScrollable();
      if (!p || !el) return;
      syncingRef.current = "target";
      p.scrollLeft = el.scrollLeft;
    };
    root.addEventListener("scroll", onTargetScroll, { passive: true, capture: true });
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      root.removeEventListener("scroll", onTargetScroll, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [targetRef]);

  const onProxyScroll = () => {
    if (syncingRef.current === "target") { syncingRef.current = "none"; return; }
    const el = resolveScrollable();
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
      className="sticky bottom-0 z-30 h-5 w-full overflow-x-auto border-y border-primary/40 bg-background shadow-[0_-3px_10px_-4px_hsl(var(--foreground)/0.45)]"
      aria-label="Barra de rolagem horizontal"
    >
      <div style={{ width: scrollWidth, height: 2 }} />
    </div>
  );
}
