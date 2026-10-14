import { PageFrame, PageFrameProps } from "./types"
import HeaderConstructor from "../Header"
import { i18n } from "../../i18n"

const Header = HeaderConstructor()

/**
 * The default page frame — three-column layout with left sidebar, center
 * content (header + body + afterBody), and right sidebar, followed by a footer.
 *
 * This is the original Quartz layout, extracted from renderPage.tsx.
 *
 * On mobile, the left sidebar becomes a header bar: components marked
 * `pinnedOnMobile` (e.g. the page title) stay in the bar, and everything else
 * moves into a menu opened by a hamburger button. On larger screens the menu
 * wrapper is `display: contents`, so the sidebar renders as usual.
 */
export const DefaultFrame: PageFrame = {
  name: "default",
  render({
    componentData,
    header,
    beforeBody,
    pageBody: Content,
    afterBody,
    left,
    right,
    footer,
  }: PageFrameProps) {
    const menu = left.filter((c) => !c.pinnedOnMobile)
    const menuStart = left.findIndex((c) => !c.pinnedOnMobile)

    return (
      <>
        <div class="left sidebar">
          {menu.length > 0 && (
            <button
              type="button"
              class="mobile-menu-toggle"
              aria-controls="mobile-menu"
              aria-expanded="false"
              aria-label={i18n(componentData.cfg.locale).components.mobileMenu.title}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="menu-icon"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="close-icon"
              >
                <line x1="18" x2="6" y1="6" y2="18" />
                <line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>
          )}
          {left.map((BodyComponent, i) => {
            if (BodyComponent.pinnedOnMobile) {
              return <BodyComponent {...componentData} />
            }
            if (i !== menuStart) {
              return null
            }
            return (
              <div id="mobile-menu" class="mobile-menu">
                {menu.map((MenuComponent) => (
                  <MenuComponent {...componentData} />
                ))}
              </div>
            )
          })}
        </div>
        <div class="center">
          <div class="page-header">
            <Header {...componentData}>
              {header.map((HeaderComponent) => (
                <HeaderComponent {...componentData} />
              ))}
            </Header>
            <div class="popover-hint">
              {beforeBody.map((BodyComponent) => (
                <BodyComponent {...componentData} />
              ))}
            </div>
          </div>
          <Content {...componentData} />
          <hr />
          <div class="page-footer">
            {afterBody.map((BodyComponent) => (
              <BodyComponent {...componentData} />
            ))}
          </div>
        </div>
        <div class="right sidebar">
          {right.map((BodyComponent) => (
            <BodyComponent {...componentData} />
          ))}
        </div>
        {footer.map((FooterComponent) => (
          <FooterComponent {...componentData} />
        ))}
      </>
    )
  },
}
