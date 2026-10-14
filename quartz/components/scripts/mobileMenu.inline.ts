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
  }
})
