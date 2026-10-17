import type { SidebarLayoutConfig, WidgetComponentConfig } from "../types/sidebarConfig";
import { layoutConfig } from "../utils/layout-config";

// Author layout is shared with the local editor; visitor preferences never write it.
function widgets(side: "left" | "right"): WidgetComponentConfig[] {
  return layoutConfig.sidebar[side].map((item): WidgetComponentConfig => ({
    type: item.id,
    enable: item.enabled,
    position: item.sticky ? "sticky" : "top",
    showOnPostPage: true,
    ...(item.id === "sidebarToc" ? { hideOnNonPostPage: true } : {}),
    ...(item.id === "calendar" ? { showTitle: false, specificConfig: { calendar: { showHeatmap: true } } } : {}),
    ...(["categories", "tags"].includes(item.id) ? { specificConfig: { collapseThreshold: item.id === "tags" ? 10 : 5 } } : {}),
  }));
}

export const sidebarLayoutConfig: SidebarLayoutConfig = {
  enable: layoutConfig.sidebar.enabled,
  position: layoutConfig.sidebar.position,
  tabletSidebar: layoutConfig.sidebar.position === "right" ? "right" : "left",
  hideSidebarOnPostPage: false,
  noSidebarContentWidth: 1,
  leftComponents: widgets("left"),
  rightComponents: widgets("right"),
  mobileBottomComponents: [...widgets("left"), ...widgets("right")].map(({ position: _position, ...widget }) => widget),
};
