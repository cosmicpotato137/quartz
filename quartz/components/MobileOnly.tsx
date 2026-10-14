import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default ((component: QuartzComponent) => {
  const Component = component
  const MobileOnly: QuartzComponent = (props: QuartzComponentProps) => {
    return (
      <div class="mobile-only">
        <Component {...props} />
      </div>
    )
  }

  MobileOnly.displayName = component.displayName
  MobileOnly.afterDOMLoaded = component?.afterDOMLoaded
  MobileOnly.beforeDOMLoaded = component?.beforeDOMLoaded
  MobileOnly.css = component?.css
  // not part of the desktop left sidebar, so it shouldn't be folded into the mobile menu either
  MobileOnly.pinnedOnMobile = true
  return MobileOnly
}) satisfies QuartzComponentConstructor<QuartzComponent>
