// The open state lives in the toggle's aria-expanded attribute, which the
// stylesheet uses to slide the menu in and lock page scrolling.
function toggleMobileMenu(this: HTMLButtonElement) {
  const expanded = this.getAttribute("aria-expanded") === "true"
  this.setAttribute("aria-expanded", expanded ? "false" : "true")
}

document.addEventListener("nav", () => {
  for (const toggle of document.querySelectorAll<HTMLButtonElement>(".mobile-menu-toggle")) {
    // always start a page with the menu closed, e.g. after following a link inside it
    toggle.setAttribute("aria-expanded", "false")
    toggle.addEventListener("click", toggleMobileMenu)
    window.addCleanup(() => toggle.removeEventListener("click", toggleMobileMenu))

    const menu = document.getElementById(toggle.getAttribute("aria-controls") ?? "")
    if (!menu) continue

    // Close as soon as a link in the menu is followed. Same-page links (e.g. the
    // table of contents) only scroll the page and never fire "nav", so without
    // this the menu would stay open on top of the content it just scrolled to.
    // This runs before the SPA router's window-level click handler, so the
    // scroll lock is already released when it scrolls.
    const closeOnLinkClick = (e: MouseEvent) => {
      // leave the menu open for links opened elsewhere (new tab/window)
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      const link = (e.target as Element | null)?.closest("a[href]")
      if (!link || link.getAttribute("target") === "_blank") return
      toggle.setAttribute("aria-expanded", "false")
    }
    menu.addEventListener("click", closeOnLinkClick)
    window.addCleanup(() => menu.removeEventListener("click", closeOnLinkClick))
  }
})
