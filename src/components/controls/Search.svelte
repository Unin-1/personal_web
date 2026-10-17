<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { navigateToPage } from "@utils/navigation-utils";
import { onMount, tick } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { FLOATING_PANEL_CLOSE_EVENT } from "@/utils/floating-panel-utils";
import { searchSite } from "@/utils/search-utils";
import { getSearchUrl } from "@/utils/url-utils";

let keyword = "";
let result: SearchResult[] = [];
let isSearching = false;
let searchError = false;
let debounceTimer: ReturnType<typeof setTimeout>;
let searchRequestId = 0;

const setPanelVisibility = (show: boolean): void => {
  document.getElementById("search-panel")?.classList.toggle("float-panel-closed", !show);
};

const cancelPendingSearch = (): void => {
  clearTimeout(debounceTimer);
  searchRequestId += 1;
  isSearching = false;
};

const closeSearchPanel = (): void => {
  cancelPendingSearch();
  setPanelVisibility(false);
  keyword = "";
  result = [];
  searchError = false;
};

const search = (isDesktop: boolean): void => {
  cancelPendingSearch();
  const query = keyword.trim();
  searchError = false;
  result = [];
  if (!query) {
    if (isDesktop) setPanelVisibility(false);
    return;
  }

  const requestId = searchRequestId;
  isSearching = true;
  setPanelVisibility(true);
  debounceTimer = setTimeout(async () => {
    try {
      const matches = await searchSite(query);
      if (requestId !== searchRequestId) return;
      result = matches;
    } catch {
      if (requestId !== searchRequestId) return;
      searchError = true;
    } finally {
      if (requestId === searchRequestId) isSearching = false;
    }
  }, 250);
};

const togglePanel = async (): Promise<void> => {
  const panel = document.getElementById("search-panel");
  if (!panel) return;
  const opening = panel.classList.contains("float-panel-closed");
  setPanelVisibility(opening);
  if (opening) {
    await tick();
    document.getElementById("search-input-mobile")?.focus();
    if (keyword.trim()) search(false);
  }
};

const handleDesktopFocus = (event: FocusEvent): void => {
  const input = event.currentTarget;
  if (input instanceof HTMLElement && input.hasAttribute("data-floating-panel-focus-return")) return;
  search(true);
};

const handleResultClick = (event: MouseEvent, targetUrl: string): void => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  closeSearchPanel();
  navigateToPage(targetUrl);
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== "Enter" || event.isComposing || !keyword.trim()) return;
  event.preventDefault();
  const targetUrl = getSearchUrl(keyword);
  closeSearchPanel();
  navigateToPage(targetUrl);
};

onMount(() => {
  const panel = document.getElementById("search-panel");
  panel?.addEventListener(FLOATING_PANEL_CLOSE_EVENT, cancelPendingSearch);
  return () => {
    panel?.removeEventListener(FLOATING_PANEL_CLOSE_EVENT, cancelPendingSearch);
    cancelPendingSearch();
  };
});
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search"
          class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input id="search-input-desktop" type="search" aria-label={i18n(I18nKey.search)} placeholder="{i18n(I18nKey.search)}" value={keyword}
           aria-controls="search-panel" data-floating-panel-no-expanded
           on:focus={handleDesktopFocus}
           on:input={(event) => { keyword = event.currentTarget.value; search(true); }} on:keydown={handleKeydown}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label={i18n(I18nKey.search)} aria-controls="search-panel" aria-expanded="false" id="search-switch"
		class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-120
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2"
     data-floating-panel data-floating-panel-trigger="search-switch search-input-desktop" inert aria-hidden="true">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/4 hover:bg-black/6 focus-within:bg-black/6
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search"
              class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input id="search-input-mobile" type="search" aria-label={i18n(I18nKey.search)} placeholder={i18n(I18nKey.search)} value={keyword}
               on:input={(event) => { keyword = event.currentTarget.value; search(false); }} on:keydown={handleKeydown}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    <!-- search results -->
    {#if isSearching}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchLoading)}
        </div>
    {:else if searchError}
        <div class="rounded-xl px-3 py-2 text-sm text-75" role="status">
            搜索暂时不可用，请检查网络后重试。
            <button type="button" class="text-(--primary) underline" on:click={() => search(false)}>重试</button>
        </div>
    {:else if result.length > 0}
        {#each result.slice(0, 5) as item}
            <a href={item.url}
               on:click={(e) => handleResultClick(e, item.url)}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
           rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)">
                <div class="transition text-90 inline-flex font-bold group-hover:text-(--primary)">
                    {item.meta.title}
                    <Icon icon="fa7-solid:chevron-right"
                          class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary)"></Icon>
                </div>
                {#if item.excerpt}
                    <div class="transition text-sm text-50" style="display: flex; align-items: flex-start; margin-top: 0.1rem">
                        <div>
                            {@html item.excerpt}
                        </div>
                    </div>
                {/if}

                {#if item.content && item.content.includes('<mark>')}
                    <div class="transition text-sm text-30" style="display: flex; align-items: flex-start; margin-top: 0.1rem">
                        <span style="display: inline-block; background-color: var(--btn-plain-bg-active); color: var(--primary); padding: 0.1em 0.4em; border-radius: 5px; font-size: 0.75em; font-weight: 600; margin-right: 0.5em; shrink: 0;">
                            {i18n(I18nKey.searchContent)}
                        </span>
                        <div>
                            {@html item.content}
                        </div>
                    </div>
                {/if}
            </a>
        {/each}
        {#if result.length > 5}
            <a href={getSearchUrl(keyword)}
               on:click={(e) => handleResultClick(e, getSearchUrl(keyword))}
               class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active) text-(--primary) font-bold text-center">
                <span class="inline-flex items-center">
                    {i18n(I18nKey.searchViewMore).replace('{count}', (result.length - 5).toString())}
                    <Icon icon="fa7-solid:arrow-right" class="transition text-[0.75rem] ml-1"></Icon>
                </span>
            </a>
        {/if}
    {:else if keyword.trim()}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchNoResults)}
        </div>
    {:else}
        <div class="transition first-of-type:mt-2 lg:first-of-type:mt-0 block rounded-xl text-lg px-3 py-2 text-50">
            {i18n(I18nKey.searchTypeSomething)}
        </div>
    {/if}
</div>

<style>
    input:focus {
        outline: 0;
    }

    .search-panel {
        max-height: calc(100vh - 100px);
        overflow-y: auto;
    }
</style>
