// Register from the shared layout so the first Swup visit upgrades the new list.
class AnimeFilter extends HTMLElement {
  handleInput = () => {
    const query = (this.querySelector<HTMLInputElement>("[data-anime-search]")?.value ?? "").normalize("NFKC").trim().toLowerCase();
    const cards = this.querySelectorAll<HTMLElement>("[data-anime-title]");
    let count = 0;
    cards.forEach((card) => {
      card.hidden = !(card.dataset.animeTitle ?? "").normalize("NFKC").toLowerCase().includes(query);
      if (!card.hidden) count += 1;
    });
    const empty = this.querySelector<HTMLElement>("[data-anime-empty]");
    if (empty) empty.hidden = count > 0;
    const status = this.querySelector<HTMLElement>("[data-anime-count]");
    if (status) status.textContent = query ? `找到 ${count} 部作品，共 ${cards.length} 部` : `共 ${cards.length} 部作品`;
  };

  handlePosterLoad = (event: Event) => {
    if (event.target instanceof HTMLImageElement) this.updatePoster(event.target);
  };

  updatePoster(image: HTMLImageElement) {
    const frame = image.closest<HTMLElement>("[data-anime-poster]");
    if (!frame) return;
    const loaded = image.complete && image.naturalWidth > 0;
    image.hidden = !loaded;
    const fallback = frame.querySelector<HTMLElement>("[data-anime-poster-fallback]");
    if (fallback) fallback.hidden = loaded;
    const message = frame.querySelector<HTMLElement>("[data-anime-poster-state]");
    if (message && !loaded) message.textContent = "封面暂时无法加载";
  }

  connectedCallback() {
    this.addEventListener("input", this.handleInput);
    this.addEventListener("search", this.handleInput);
    this.handleInput();
    // Cached images may have finished before this custom element was upgraded.
    this.querySelectorAll<HTMLImageElement>("[data-anime-poster] img").forEach((image) => {
      if (image.complete) this.updatePoster(image);
    });
    this.addEventListener("load", this.handlePosterLoad, true);
    this.addEventListener("error", this.handlePosterLoad, true);
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.handleInput);
    this.removeEventListener("search", this.handleInput);
    this.removeEventListener("load", this.handlePosterLoad, true);
    this.removeEventListener("error", this.handlePosterLoad, true);
  }
}

if (!customElements.get("anime-filter")) customElements.define("anime-filter", AnimeFilter);
