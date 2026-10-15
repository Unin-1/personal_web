const names = {
  intro: "欢迎与介绍", featured: "精选文章", posts: "最新文章", projects: "GitHub 项目", gallery: "相册速览", anime: "追番记录", links: "友链入口",
  profile: "个人资料", announcement: "公告", music: "音乐播放器", categories: "文章分类", tags: "文章标签", stats: "站点统计", calendar: "日历", siteInfo: "站点信息", sidebarToc: "文章目录",
};
const status = document.querySelector("#status");
const frame = document.querySelector("#preview");
const saveButton = document.querySelector("#save");
const reloadButton = document.querySelector("#reload");
const token = document.querySelector('meta[name="editor-token"]').content;
let layout;
let revision;
let dirty = false;
let dragging;
let changeVersion = 0;
let previewSize = "desktop";

function report(message, kind = "") { status.textContent = message; status.dataset.kind = kind; }
async function api(method, body) {
  const response = await fetch("/__editor/api/layout", { method, cache: "no-store", headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "请求失败");
  return result;
}
function preview() {
  if (layout) frame.contentWindow?.postMessage({ type: "unin-layout-draft", layout, base: document.body.dataset.previewBase }, location.origin);
}
function changed() {
  dirty = true;
  changeVersion++;
  report("有未保存更改 · 预览已更新");
  saveButton.disabled = false;
  preview();
}
function listFor(name) { return name === "home" ? layout.homeModules : layout.sidebar[name]; }
function move(id, source, destination, index) {
  if ((source === "home") !== (destination === "home")) return;
  const from = listFor(source);
  const sourceIndex = from.findIndex((module) => module.id === id);
  if (sourceIndex < 0) return;
  const [item] = from.splice(sourceIndex, 1);
  const to = listFor(destination);
  const targetIndex = source === destination && sourceIndex < index ? index - 1 : index;
  to.splice(Math.max(0, Math.min(targetIndex, to.length)), 0, item);
  renderLists();
  changed();
}
function button(label, title, action) {
  const element = document.createElement("button");
  element.type = "button"; element.className = "icon-button";
  element.textContent = label; element.title = title; element.setAttribute("aria-label", title);
  element.addEventListener("click", action);
  return element;
}
function renderLists() {
  for (const list of document.querySelectorAll("[data-list]")) {
    list.replaceChildren();
    const name = list.dataset.list;
    const items = listFor(name);
    items.forEach((item, index) => {
      const row = document.createElement("li");
      row.className = `module-row${item.enabled ? "" : " off"}`; row.draggable = true; row.dataset.id = item.id;
      const handle = document.createElement("span"); handle.className = "handle"; handle.textContent = "⠿"; handle.setAttribute("aria-hidden", "true");
      const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.className = "check"; checkbox.checked = item.enabled; checkbox.setAttribute("aria-label", `显示${names[item.id]}`);
      checkbox.addEventListener("change", () => { item.enabled = checkbox.checked; row.classList.toggle("off", !item.enabled); changed(); });
      const label = document.createElement("span"); label.className = "label"; label.textContent = names[item.id];
      row.append(handle, checkbox, label);
      if (name !== "home") {
        const select = document.createElement("select"); select.setAttribute("aria-label", `${names[item.id]}所在侧栏`);
        for (const [value, text] of [["left", "左栏"], ["right", "右栏"]]) {
          const option = document.createElement("option"); option.value = value; option.textContent = text; select.append(option);
        }
        select.value = name;
        select.addEventListener("change", () => move(item.id, name, select.value, listFor(select.value).length));
        row.append(select);
      }
      const up = button("↑", `上移${names[item.id]}`, () => move(item.id, name, name, index - 1));
      const down = button("↓", `下移${names[item.id]}`, () => move(item.id, name, name, index + 2));
      up.disabled = index === 0; down.disabled = index === items.length - 1;
      row.append(up, down);
      row.addEventListener("dragstart", (event) => {
        if (event.target.closest("button,input,select")) { event.preventDefault(); return; }
        dragging = { id: item.id, source: name };
        event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => { dragging = undefined; row.classList.remove("dragging"); document.querySelectorAll(".drop-target").forEach((element) => { element.classList.remove("drop-target"); }); });
      list.append(row);
    });
  }
}
for (const list of document.querySelectorAll("[data-list]")) {
  list.addEventListener("dragover", (event) => {
    if (!dragging || (dragging.source === "home") !== (list.dataset.list === "home")) return;
    event.preventDefault(); event.dataTransfer.dropEffect = "move"; list.classList.add("drop-target");
  });
  list.addEventListener("dragleave", (event) => { if (!list.contains(event.relatedTarget)) list.classList.remove("drop-target"); });
  list.addEventListener("drop", (event) => {
    event.preventDefault(); list.classList.remove("drop-target");
    if (!dragging) return;
    const row = event.target.closest("[data-id]");
    const items = listFor(list.dataset.list);
    let index = row ? items.findIndex((item) => item.id === row.dataset.id) : items.length;
    if (row && event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2) index++;
    move(dragging.id, dragging.source, list.dataset.list, index); dragging = undefined;
  });
}
function updateOutputs() {
  for (const field of ["hue", "dimOpacity", "pageWidth", "cardOpacity", "blur"]) document.querySelector(`#${field}-output`).textContent = layout.visual[field];
}
for (const field of document.querySelectorAll("[data-config]")) {
  field.addEventListener("input", () => {
    if (!layout) return;
    const [group, key] = field.dataset.config.split(".");
    layout[group][key] = field.type === "checkbox" ? field.checked : field.type === "range" ? Number(field.value) : field.value;
    updateOutputs(); changed();
  });
}
async function load() {
  if (dirty && !confirm("重新载入会放弃尚未保存的更改，继续吗？")) return;
  reloadButton.disabled = true;
  try {
    const result = await api("GET"); layout = result.layout; revision = result.revision; dirty = false;
    for (const field of document.querySelectorAll("[data-config]")) {
      const [group, key] = field.dataset.config.split(".");
      if (field.type === "checkbox") field.checked = layout[group][key]; else field.value = layout[group][key];
    }
    renderLists(); updateOutputs(); saveButton.disabled = true;
    report("已载入本地配置"); preview();
  } catch (error) { report(error.message, "error"); }
  finally { reloadButton.disabled = false; }
}
reloadButton.addEventListener("click", load);
saveButton.addEventListener("click", async () => {
  const savingVersion = changeVersion;
  saveButton.disabled = true; reloadButton.disabled = true; report("正在验证并保存…");
  try {
    const result = await api("PUT", { layout, revision }); revision = result.revision; dirty = changeVersion !== savingVersion;
    saveButton.disabled = !dirty;
    report(dirty ? "已保存 · 另有刚修改的内容尚未保存" : "已保存到本地 · Git 推送后上线", dirty ? "" : "success");
    refreshPreview();
  } catch (error) { report(error.message, "error"); saveButton.disabled = false; }
  finally { reloadButton.disabled = false; }
});
function refreshPreview() {
  frame.src = `${document.body.dataset.previewBase}?editor-preview=${Date.now()}`;
}
document.querySelector("#refresh-preview").addEventListener("click", refreshPreview);
function fitPreview() {
  const stage = document.querySelector("#preview-stage");
  const available = Math.max(100, stage.clientWidth - 30);
  const width = previewSize === "mobile" ? 390 : 1280;
  const scale = Math.min(1, available / width);
  frame.style.width = `${width}px`;
  frame.style.height = `${Math.max(100, stage.clientHeight - 30) / scale}px`;
  frame.style.left = `${15 + Math.max(0, (available - width * scale) / 2)}px`;
  frame.style.transform = `scale(${scale})`;
}
new ResizeObserver(fitPreview).observe(document.querySelector("#preview-stage"));
for (const size of ["desktop", "mobile"]) document.querySelector(`#${size}`).addEventListener("click", () => {
  previewSize = size;
  document.querySelector("#preview-stage").classList.toggle("mobile", size === "mobile");
  for (const option of ["desktop", "mobile"]) document.querySelector(`#${option}`).setAttribute("aria-pressed", String(size === option));
  fitPreview(); preview();
});
frame.addEventListener("load", () => { preview(); setTimeout(preview, 500); });
window.addEventListener("message", (event) => { if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === "unin-preview-ready") preview(); });
window.addEventListener("beforeunload", (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
load();
