export function getScrollBehavior(): ScrollBehavior {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  return prefersReducedMotion ? "auto" : "smooth";
}

export function scrollToSection(
  targetId: string,
  options?: { updateHash?: boolean }
) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const headerHeight =
    document.querySelector("header")?.getBoundingClientRect().height ?? 80;
  const top =
    target.getBoundingClientRect().top + window.scrollY - headerHeight;

  window.scrollTo({ top, behavior: getScrollBehavior() });

  if (options?.updateHash !== false) {
    history.pushState(null, "", `#${targetId}`);
  }
}
