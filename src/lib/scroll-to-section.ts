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

  window.scrollTo({ top, behavior: "smooth" });

  if (options?.updateHash !== false) {
    history.pushState(null, "", `#${targetId}`);
  }
}
