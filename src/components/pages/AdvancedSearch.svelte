<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { searchSite } from "@/utils/search-utils";

export let title = i18n(I18nKey.search);
export let description = "";

let keyword = "";
let results: SearchResult[] = [];
let isSearching = false;
let searchError = false;
let debounceTimer: ReturnType<typeof setTimeout>;
let searchRequestId = 0;

const cancelPendingSearch = (): void => {
  clearTimeout(debounceTimer);
  searchRequestId += 1;
  isSearching = false;
};

const search = async (): Promise<void> => {
  cancelPendingSearch();
  const query = keyword.trim();
  const requestId = searchRequestId;
  results = [];
  searchError = false;
  if (!query) return;
  isSearching = true;
  try {
    const matches = await searchSite(query);
    if (requestId === searchRequestId) results = matches;
  } catch {
    if (requestId === searchRequestId) searchError = true;
  } finally {
    if (requestId === searchRequestId) isSearching = false;
  }
};

const handleInput = (): void => {
  cancelPendingSearch();
  results = [];
  searchError = false;
  if (!keyword.trim()) return;
  isSearching = true;
  debounceTimer = setTimeout(search, 250);
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  void search();
};

onMount(() => {
  keyword = new URLSearchParams(window.location.search).get("q") || "";
  void search();
  return cancelPendingSearch;
});
</script>

<div class="card-base px-6 py-6 md:px-9 md:py-6 mb-4 rounded-(--radius-large)">
    <!-- Title Section -->
    <div class="mb-4">
        <div class="flex items-center gap-3 mb-3">
            <div class="h-8 w-8 rounded-lg bg-(--primary) flex items-center justify-center text-white dark:text-black/70">
                <Icon icon="material-symbols:search" class="text-[1.5rem]"></Icon>
            </div>
            <div class="text-3xl font-bold text-90">
                {title}
            </div>
        </div>
        {#if description}
            <p class="text-base text-50 leading-relaxed">
                {description}
            </p>
        {/if}
    </div>

    <!-- Search Bar -->
    <div class="relative flex">
        <div class="relative flex-1">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Icon icon="material-symbols:search" class="text-2xl text-50" />
            </div>
            <input
                id="search-input-page" type="search" aria-label={i18n(I18nKey.search)}
                class="block w-full p-4 pl-10 text-sm bg-transparent border border-black/10 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-(--primary) focus:border-(--primary) hover:border-black/20 dark:hover:border-white/20 text-75 placeholder:opacity-50 transition-colors outline-hidden"
                placeholder={i18n(I18nKey.search)}
                value={keyword}
                on:input={(event) => { keyword = event.currentTarget.value; handleInput(); }}
                on:keydown={handleKeydown}
            >
        </div>
    </div>
</div>

<div class="grid grid-cols-1 gap-4">
    <!-- Results Area -->
    <div>
        {#if isSearching}
            <div class="flex justify-center py-10">
                <Icon icon="svg-spinners:ring-resize" class="text-4xl text-(--primary)" />
            </div>
        {:else if searchError}
            <div class="card-base p-10 text-center text-75 rounded-(--radius-large)" role="status">
                搜索暂时不可用，请检查网络后重试。
                <button type="button" class="text-(--primary) underline" on:click={() => search()}>重试</button>
            </div>
        {:else if results.length > 0}
            <div class="space-y-4">
                {#each results as result}
                    <div class="card-base p-6 block rounded-(--radius-large)">
                        <a href={result.url} class="block group">
                            <h5 class="mb-2 text-2xl font-bold tracking-tight text-90 group-hover:text-(--primary) transition-colors">
                                {result.meta.title}
                            </h5>
                            <p class="font-normal text-75">
                                {@html result.excerpt}
                            </p>
                        </a>
                    </div>
                {/each}
            </div>
        {:else if keyword.trim()}
            <div class="card-base p-10 text-center text-50 rounded-(--radius-large)">
                {i18n(I18nKey.searchNoResults)}
            </div>
        {:else}
             <div class="card-base p-10 text-center text-50 rounded-(--radius-large)">
                {i18n(I18nKey.searchTypeSomething)}
            </div>
        {/if}
    </div>
</div>

<style>
    /* 关键字高亮效果 - 主题色 */
    :global(mark) {
        background: transparent;
        color: var(--primary);
        font-weight: 600;
        padding: 0 0.1em;
    }
</style>
