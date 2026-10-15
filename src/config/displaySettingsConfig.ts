import type { DisplaySettingsConfig } from "../types/displaySettingsConfig";
import { resolveDisplaySettingsConfig } from "../utils/display-settings-utils";

// Visitors change only their own theme color and reading layout.
// Author layout editing is available separately through npm run edit.
export const displaySettingsConfig: DisplaySettingsConfig = resolveDisplaySettingsConfig({
  enable: true,
  themeColorSwitchable: true,
  layoutSwitchable: true,
  cardBorderSwitchable: false,
  cardFollowThemeSwitchable: false,
  wallpaperModeSwitchable: false,
  fullscreenLayoutSwitchable: false,
  wavesSwitchable: false,
  gradientSwitchable: false,
  bannerTitleSwitchable: false,
  bannerCarouselSwitchable: false,
  overlaySwitchable: false,
  sakuraSwitchable: false,
});
