import { useEffect, useRef, useState, type RefObject } from "react";

/** Barra de rolagem horizontal flutuante que espelha o scroll de um container.
 *  - Em contêineres com altura contida (drawers, painéis com overflow-y), usa `sticky bottom-0`.
 *  - Em página inteira, quando o rodapé natural do container-alvo estiver abaixo do viewport,
 *    passa a `position: fixed` alinhada horizontalmente ao container.
 */
export function FloatingHScrollbar({ targetRef }: { targetRef: RefObject<HTMLDivElement> }) {
  const proxyRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [fixedRect, setFixedRect] = useState<{ left: number; width: number } | null>(null);
  const syncingRef = useRef<"none" | "target" | "proxy">("none");

  const resolveScrollable = () => {
    const root = targetRef.current;
    if (!root) return null;
    if (root.scrollWidth > root.clientWidth + 1) return root;

    const descendants = Array.from(root.querySelectorAll<HTMLElement>("*"));
    return (
      descendants.find((node) => {
        const overflowX = window.getComputedStyle(node).overflowX;
        return (
          node.scrollWidth > node.clientWidth + 1 &&
          (overflowX === "auto" || overflowX === "scroll")
        );
      }) ?? null
    );
  };

  useEffect(() => {
    const root = targetRef.current;
    if (!root) return;

    let raf = 0;
    let scrollEl: HTMLElement | null = null;

    const onTargetScroll = () => {
      if (syncingRef.current === "proxy") { syncingRef.current = "none"; return; }
      const p = proxyRef.current;
      const el = scrollEl ?? resolveScrollable();
      if (!p || !el) return;
      syncingRef.current = "target";
      p.scrollLeft = el.scrollLeft;
    };

    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nextScrollEl = resolveScrollable();
        if (scrollEl && scrollEl !== root && scrollEl !== nextScrollEl) {
          scrollEl.removeEventListener("scroll", onTargetScroll);
        }
        scrollEl = nextScrollEl;
        if (scrollEl && scrollEl !== root) {
          scrollEl.removeEventListener("scroll", onTargetScroll);
          scrollEl.addEventListener("scroll", onTargetScroll, { passive: true });
        }
        if (!nextScrollEl) {
          setScrollWidth(0);
          setClientWidth(0);
          setFixedRect(null);
          return;
        }

        setScrollWidth(nextScrollEl.scrollWidth);
        setClientWidth(nextScrollEl.clientWidth);

        // Decide fixed vs sticky/inline.
        const rect = nextScrollEl.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const bottomOffscreen = rect.bottom > vh + 2;
        const topVisible = rect.top < vh - 40;
        if (bottomOffscreen && topVisible) {
          setFixedRect({ left: rect.left, width: rect.width });
        } else {
          setFixedRect(null);
        }

        const p = proxyRef.current;
        if (p && p.scrollLeft !== nextScrollEl.scrollLeft) {
          p.scrollLeft = nextScrollEl.scrollLeft;
        }
      });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(root);
    Array.from(root.children).forEach((c) => ro.observe(c as Element));

    const mo = new MutationObserver(update);
    mo.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });

    const io = new IntersectionObserver(update);
    io.observe(root);

    root.addEventListener("scroll", onTargetScroll, { passive: true, capture: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      root.removeEventListener("scroll", onTargetScroll, { capture: true });
      if (scrollEl && scrollEl !== root) {
        scrollEl.removeEventListener("scroll", onTargetScroll);
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true } as any);
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

  const isFixed = fixedRect != null;
  const style: React.CSSProperties = isFixed
    ? { position: "fixed", bottom: 0, left: fixedRect!.left, width: fixedRect!.width, zIndex: 40 }
    : {};

  return (
    <div
      ref={proxyRef}
      onScroll={onProxyScroll}
      style={style}
      className={
        (isFixed ? "" : "sticky bottom-0 ") +
        "z-30 h-5 w-full overflow-x-auto border-y border-primary/40 bg-background shadow-[0_-3px_10px_-4px_hsl(var(--foreground)/0.45)]"
      }
      aria-label="Barra de rolagem horizontal"
    >
      <div style={{ width: scrollWidth, height: 2 }} />
    </div>
  );
}
