import test, { describe } from "node:test"
import assert from "node:assert"
import { resolveFrame, frameRegistry } from "./index"
import { DefaultFrame } from "./DefaultFrame"
import { FullWidthFrame } from "./FullWidthFrame"
import type { PageFrame } from "./types"
import type { QuartzComponent } from "../types"
import { h } from "preact"
import { render } from "preact-render-to-string"

const customFrame: PageFrame = {
  name: "custom-test-frame",
  render: () => null as any,
}

describe("resolveFrame", () => {
  test("returns DefaultFrame for undefined", () => {
    assert.strictEqual(resolveFrame(undefined), DefaultFrame)
  })

  test("returns DefaultFrame for 'default'", () => {
    assert.strictEqual(resolveFrame("default"), DefaultFrame)
  })

  test("returns named built-in frame", () => {
    assert.strictEqual(resolveFrame("full-width"), FullWidthFrame)
  })

  test("returns DefaultFrame for unknown frame name", () => {
    assert.strictEqual(resolveFrame("nonexistent"), DefaultFrame)
  })

  test("plugin-registered frame takes priority", () => {
    frameRegistry.register("custom-test-frame", customFrame, "test-plugin")
    const result = resolveFrame("custom-test-frame")
    assert.strictEqual(result, customFrame)
  })

  test("returns DefaultFrame for unknown name even with plugin frames registered", () => {
    frameRegistry.register("custom-test-frame", customFrame, "test-plugin")
    const result = resolveFrame("totally-unknown")
    assert.strictEqual(result, DefaultFrame)
  })
})

describe("DefaultFrame mobile menu", () => {
  const component = (className: string, pinnedOnMobile?: boolean): QuartzComponent => {
    const c: QuartzComponent = () => h("div", { class: className })
    c.pinnedOnMobile = pinnedOnMobile
    return c
  }

  const renderLeftSidebar = (left: QuartzComponent[]) => {
    const html = render(
      DefaultFrame.render({
        componentData: { cfg: { locale: "en-US" }, children: [] } as any,
        head: () => null,
        header: [],
        beforeBody: [],
        pageBody: () => null,
        afterBody: [],
        left,
        right: [],
        footer: [],
      }),
    )
    return html.slice(0, html.indexOf('<div class="center">'))
  }

  test("moves unpinned left components into the menu and keeps pinned ones in the bar", () => {
    const html = renderLeftSidebar([
      component("title", true),
      component("toolbar"),
      component("spacer", true),
      component("explorer"),
    ])

    assert.match(html, /<button[^>]*class="mobile-menu-toggle"[^>]*aria-expanded="false"/)
    assert.match(html, /aria-label="Menu"/)
    assert.match(
      html,
      /<div class="title"><\/div><div id="mobile-menu" class="mobile-menu"><div class="toolbar"><\/div><div class="explorer"><\/div><\/div><div class="spacer"><\/div><\/div>$/,
    )
  })

  test("omits the toggle and menu when every left component is pinned", () => {
    const html = renderLeftSidebar([component("title", true)])
    assert.doesNotMatch(html, /mobile-menu/)
    assert.match(html, /<div class="title"><\/div>/)
  })

  test("omits the toggle and menu when the left sidebar is empty", () => {
    assert.doesNotMatch(renderLeftSidebar([]), /mobile-menu/)
  })
})
