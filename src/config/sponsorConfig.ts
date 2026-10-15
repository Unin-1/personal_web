import type { SponsorConfig } from "../types/sponsorConfig";

// Optional inherited feature; no payment links or third-party recipient data are configured.
export const sponsorConfig: SponsorConfig = {
  title: "", description: "", usage: "", showSponsorsList: false,
  showComment: false, showButtonInPost: false, methods: [], sponsors: [],
};
