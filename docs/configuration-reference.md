# 完整配置参数字典

本字典针对本仓库当前实现，不是上游主题的通用说明。先看[操作手册](content-guide.md)掌握修改、预览与发布步骤。评论、统计、字体、特效、看板娘和可选页面的完整参数另列在[高级配置](advanced-configuration.md)。表中的“默认”是代码回退或出厂行为，不代表你当前个性化文件的实际值。

## 修改与生效规则

- `layout.json`：工作台修改后点“保存到本地”，或直接改 JSON。开发环境自动更新；生产站需重新构建、提交并部署。
- Markdown 与一般 `.ts` 配置：保存后开发环境通常自动更新；没变化时重新启动。涉及 Astro 构建插件的配置必须重启，本文会特别标出。
- `npm run preview`：始终是上次 `build`，不会读取实时源码。外部数据 `sync` 也不会直接发布。
- 浏览器保存的访客偏好只作用于该访客；验证新的默认值用无痕窗口。
- 表中以 `x.y` 表示对象内字段；例如 `navbar.title` 是 `navbar: { title: "…" }`。不要把带点字段名直接写成 JSON 键。

## 配置入口与覆盖关系

| 文件 | 负责内容 | 要特别注意 |
| --- | --- | --- |
| `src/config/layout.json` | 首页模块、侧栏、视觉、壁纸和轮换 | 可由作者工作台保存；拒绝未知字段 |
| `src/config/siteConfig.ts` | SEO、导航外形、页面开关、文章样式等静态默认 | 色相、宽度、桌面列表默认被 layout 覆盖 |
| `src/config/siteRuntimeConfig.ts` | 把静态配置与 layout 合并 | 是适配代码，日常不改它 |
| `src/config/sidebarConfig.ts` | 把 layout 变成桌面和手机侧栏 | 不再在这里另维护一套排序 |
| `src/config/backgroundWallpaper.ts` | layout 壁纸映射＋高级大图效果 | 映射字段改 layout，其他高级参数在此改 |
| `config/external-sources.json` | GitHub/B站源及手写观看记录 | 优先于遗留 siteConfig.bilibili.uid |
| `src/config/index.ts` | 配置导出入口 | 不需要在这里填自己的资料 |

各配置均有固定导入入口，另复制一个不同名字的文件不会自动替换生效配置。`src/types/*Config.ts` 是类型声明，用来查合法字段；改类型文件本身不会修改页面设置。

## layout.json：工作台共用布局

### 根结构与首页模块

| 字段 | 类型／可选值 | 作用与修改示例 |
| --- | --- | --- |
| `version` | 固定数字 `1` | 配置格式版本，保持1，不用于设置网站版本 |
| `homeModules` | 对象数组 | 数组顺序即首页顺序；七个ID各出现一次 |
| `homeModules[].id` | `intro`、`featured`、`posts`、`projects`、`gallery`、`anime`、`links` | 分别是欢迎、精选、文章、项目、相册、追番、友链；不自行发明ID |
| `homeModules[].enabled` | boolean | true显示，false隐藏；隐藏仍保留条目 |

每个模块的内容来源、显示数量与直接改文案的位置见[首页模块操作](content-guide.md#31-首页模块)。调整这里不会修改文章、项目或相册本身。

### 侧栏

| 字段 | 类型／可选值 | 作用与修改示例 |
| --- | --- | --- |
| `sidebar.enabled` | boolean | 全局侧栏总开关 |
| `sidebar.position` | `left`／`right`／`both` | 桌面显示左／右／双侧；单侧不自动搬另一栏组件 |
| `sidebar.left`、`sidebar.right` | 组件对象数组 | 数组顺序即组件顺序；所有支持的组件在两栏合计恰好一次 |
| `sidebar.*[].id` | `profile`／`announcement`／`music`／`categories`／`tags`／`stats`／`calendar`／`siteInfo`／`sidebarToc` | 不自行增加未注册组件 |
| `sidebar.*[].enabled` | boolean | 是否启用；false仍保留在数组里 |
| `sidebar.*[].sticky` | boolean | true放入滚动吸附组件组；false放在普通顶部组 |

例如把公告从右移左：将完整的 `{ "id": "announcement", "enabled": true, "sticky": false }` 对象从 right 数组剪切到 left 的目标位置，不能复制成两份。手机底部由左右列表生成；目录在非文章页隐藏。

### 视觉、壁纸与轮换

| 字段 | 类型／范围／回退 | 用途及具体修改方法 |
| --- | --- | --- |
| `visual.wallpaperMode` | `banner`／`fullscreen`／`overlay`／`none` | 横幅／全屏首屏／整页覆盖背景／纯色；四种差异见操作手册 |
| `visual.desktopImage` | 非空图片地址 | 桌面单图兜底；如 `/assets/backgrounds/my-desktop.webp` |
| `visual.mobileImage` | 非空图片地址 | 手机单图兜底；建议竖图 |
| `visual.desktopImages` | 可选字符串数组，最多20张，默认 `[]` | 非空优先 desktopImage；顺序即轮换顺序；不允许重复地址 |
| `visual.mobileImages` | 可选字符串数组，最多20张，默认 `[]` | 手机独立列表；空时用 mobileImage，不是自动复制桌面列表；不允许重复地址 |
| `visual.carouselEnabled` | boolean，旧配置缺省false | 启用自动轮换；至少两张不同图片才明显；关时显示首图 |
| `visual.carouselInterval` | 3000–600000整数，毫秒；旧配置缺省5000 | 例如8000为8秒；工作台以秒显示 |
| `visual.carouselEffect` | `fade`／`slide`／`kenburns`，缺省fade | 淡入淡出／滑动／缓慢推拉；不是图片切换顺序 |
| `visual.title` | 1–100字单行字符串 | 首页大图主标题；与SEO title不同 |
| `visual.subtitle` | 1–250字单行字符串 | 首页大图副标题；工作台字段不支持副标题数组 |
| `visual.dimOpacity` | 0–1数字 | 大图遮罩暗度，0不压暗、1最暗 |
| `visual.hue` | 0–360数字 | 主题色相；覆盖 siteConfig.themeColor.hue |
| `visual.pageWidth` | 60–120数字，rem | 页面最大宽度；覆盖 siteConfig.pageWidth |
| `visual.cardOpacity` | 0.30–1数字 | 正文卡片不透明度，1实色；不覆盖侧栏实色 |
| `visual.sidebarCardColorLight` | `#RRGGBB`，缺省 `#ffffff` | 浅色主题侧栏背景，不能带alpha |
| `visual.sidebarCardColorDark` | `#RRGGBB`，缺省 `#1d2523` | 深色主题侧栏背景，左右与手机页底共用 |
| `visual.blur` | 0–30数字，px | 覆盖背景／全屏下滑的最大背景模糊 |
| `visual.postListMode` | `list`／`grid` | 桌面文章默认布局，覆盖 siteConfig.postListLayout.defaultMode；访客选择可能优先 |

新站布局默认配置夏日／春日两组图片、自动轮换、8秒间隔；兼容旧布局时缺省开关为false、间隔5秒。`none` 不显示图片且不播放轮换；隐藏标签页时暂停；系统“减少动态效果”开启时保持静态首图。因此等待两次间隔仍未切换时也要检查系统设置。

图片地址支持 `/assets/...`、`/images/...` 公共路径，`assets/...`、`images/...` 的 src 相对路径，以及 HTTPS 图片地址。公共路径对应 `public/`；相对路径由源码图片加载器处理，不加 `src/` 前缀。支持 avif／webp／png／jpg／jpeg／gif／svg；不接受磁盘路径、`..` 路径穿越或URL内嵌账号。建议工作台优先使用 `public/assets/`，路径最容易核对。

## siteConfig.ts：身份、外观和文章行为

### 基础信息与页面开关

| 字段 | 类型／值 | 作用与示例 |
| --- | --- | --- |
| `title` | 字符串 | 默认网页标题，如“我的小站” |
| `subtitle` | 字符串 | 站点副标题，不是大图副标题 |
| `site_url` | HTTPS origin | 如 `https://example-user.github.io`；仓库路径由Astro base提供，不重复写仓库名 |
| `description` | 字符串 | 默认SEO描述，应概括网站主题 |
| `keywords` | 字符串数组 | meta keywords，如 `["博客", "摄影"]` |
| 文件顶部 `SITE_LANG` | en／zh_CN／zh_TW／ja／ru／ko | 改 resolveSiteLang 的参数；环境变量可覆盖；不会自动翻译自写文章与固定文案 |
| `siteStartDate` | `YYYY-MM-DD`字符串 | 站点运行天数基准，例如 `"2026-10-16"` |
| `timezone` | IANA字符串 | 如 `"Asia/Shanghai"`／`"UTC"`；空值按构建服务器时区 |
| `pages.<键>` | boolean | 开页true，关页false；关闭页不进入站点地图，相关pageKey导航隐藏 |

pages 位于文件顶部，所有合法键：friends友链、guestbook留言板、dynamic动态、projects项目、gallery相册、booknav书签、bilibili追番、bangumi番组计划、vndb视觉小说、mal MyAnimeList、sponsor打赏。当前常用核心页启用；可选页默认多为关闭，开关并不自动配置外部账号、评论服务或素材，也不会自动把入口加进自定义导航／首页。

### 主题、卡片与导航外形

| 字段 | 类型／值 | 用途与修改方法 |
| --- | --- | --- |
| `themeColor.hue` | 0–360 | 静态默认；本项目页面取layout.hue，请在工作台修改 |
| `themeColor.defaultMode` | light／dark／system | 新访客默认浅色／深色／跟随系统；已有选择可能优先 |
| `pageWidth` | rem数字 | 静态默认；页面取layout.pageWidth |
| `card.border` | boolean | 内容卡片边框和阴影 |
| `card.followTheme` | boolean | 内容卡片底色是否跟随主题色；侧栏仍使用自定义实色 |
| `favicon` | 对象数组 | 可为不同尺寸／主题提供站点图标 |
| `favicon[].src` | 图片路径 | 如 `/favicon/my-icon.svg`；生成OG图片需提供合适的PNG资源 |
| `favicon[].theme` | 可省略／light／dark | 限定浅／深主题图标；省略共用 |
| `favicon[].sizes` | 可省略字符串 | 如 `"32x32"`／`"any"` |
| `navbar.logo.type` | icon／image／url | 图标名／本地图片／远程图片 |
| `navbar.logo.value` | 字符串 | icon例 `material-symbols:home-rounded`；public图用 `/assets/logo.webp`；src图用 `assets/logo.webp`；远程用HTTPS |
| `navbar.logo.valueDark` | 可选图片地址 | image／url模式下深色替代图，省略共用 |
| `navbar.logo.alt` | 字符串 | Logo图片替代文字 |
| `navbar.title` | 字符串 | 导航显示标题；省略使用全站title |
| `navbar.widthFull` | boolean | true导航全屏宽，false与内容区域协调 |
| `navbar.menuAlign` | left／center | 桌面菜单左对齐／居中 |
| `navbar.followTheme` | boolean | 图标和标题是否使用主题色 |
| `navbar.navbarMode` | static／fixed／dynamic | 随滚动消失／固定常显／下滑隐藏上滑出现 |
| `navbar.stickyNavbar` | 旧boolean | 兼容字段；没有navbarMode时true→fixed、false→static；新配置用navbarMode |
| `categoryBar` | boolean | 首页／归档顶部分类快捷导航 |
| `categoryStyle` | pill／rectangle | 分类按钮圆胶囊／小圆角矩形 |
| `tagStyle` | pill／pill-gray／rectangle | 标签主题色胶囊／中性灰胶囊／主题色矩形 |
| `foldArticle` | boolean | 归档是否折叠非最新年份 |

### 文章列表 postListLayout 与分页

| 字段（省略前缀 postListLayout） | 类型／值 | 作用 |
| --- | --- | --- |
| `defaultMode` | list／grid | 本项目由layout.visual.postListMode覆盖 |
| `mobileDefaultMode` | 可省略／list／grid | 视口小于780px默认模式；省略跟随桌面默认 |
| `coverPosition` | left／right | 列表封面位置，网格固定顶部 |
| `descriptionLines` | 非负数字 | 摘要截断行数，0不截断 |
| `showStatsIcons` | boolean | 底部统计／日期前的图标 |
| `tagsPosition` | meta／bottom | 标签放标题下元信息／卡片底部；bottom会替代底部统计 |
| `tagsBottomStyle` | chip／text | bottom时的标签按钮／纯文字 |
| `meta.showPublished` | boolean | 标题下发布日期 |
| `meta.showCategory` | boolean | 标题下分类 |
| `meta.showTags` | boolean | 标题下标签（结合tagsPosition） |
| `meta.tagCount` | 非负数字 | 标签数量，0不限 |
| `meta.showWords` | boolean | 元信息中的字数 |
| `meta.showReadingTime` | boolean | 元信息中的预计阅读时间 |
| `stats.showPublished` | boolean | 底部日期，tagsPosition为bottom时不展示统计区 |
| `stats.showWords` | boolean | 底部字数 |
| `stats.showReadingTime` | boolean | 底部阅读时间 |
| `grid.masonry` | boolean | 网格使用瀑布流；适合有封面／无封面混合 |
| `grid.columnWidth` | px数字，建议320 | 网格最小列宽，浏览器按可用宽度决定列数 |
| `grid.coverFullWidth` | boolean | 网格封面贴卡片边缘／保留内边距 |
| `pagination.postsPerPage`（不在postListLayout内） | 正整数 | 每页文章数；例10；改变后分页路径数可能变化 |

### 文章内容页 post

| 字段（省略前缀 post） | 类型／值 | 用途 |
| --- | --- | --- |
| `rehypeCallouts.theme` | github／obsidian／vitepress／docusaurus | 提醒框主题与对应语法；改后重启dev |
| `rehypeCallouts.enablePythonMarkdownAdmonitions` | boolean | 兼容!!!／???风格，主要与obsidian配合，改后重启 |
| `showLastModified` | boolean | 文章过期提醒／上次编辑卡片开关 |
| `outdatedThreshold` | 天数，默认30 | 距最后更新时间超过多少天展示提醒 |
| `share` | boolean | 分享按钮 |
| `postNavigation` | boolean | 上一篇／下一篇 |
| `relatedPosts` | boolean | 相关文章推荐 |
| `randomPosts` | boolean | 随机推荐 |
| `generateOgImages` | boolean | 构建文章分享图；增加构建耗时，默认false |
| `immersiveReading.enable` | boolean | 桌面文章页沉浸阅读入口 |
| `immersiveReading.defaultOn` | boolean | 进入文章是否默认开启 |
| `immersiveReading.tocEnabled` | boolean | 沉浸模式是否留目录 |
| `immersiveReading.tocPosition` | left／right | 沉浸目录位置 |

### 图片与订阅

| 字段 | 类型／值 | 用途 |
| --- | --- | --- |
| `imageOptimization.formats` | avif／webp／both | Astro处理的src图输出格式；不会把public全部重压缩 |
| `imageOptimization.quality` | 1–100数字 | 压缩质量，70–85常用；越大体积越大 |
| `imageOptimization.noReferrerDomains` | 域名数组 | 匹配图片添加no-referrer；`*.hdslb.com`这类通配符可用于防盗链兼容，不绕过图片权限 |
| `feed.contentMode` | full／summary | RSS／Atom包含全文／仅摘要；密码正文不会作为明文全文发布 |

RSS／Atom、站点地图、robots由构建生成，不在dist手改。主题公开账号的可选参数 bangumi／vndb／mal 见高级配置；`siteConfig.bilibili.uid` 在本项目不作为追番数据源。

## profileConfig.ts：头像与联系方式

| 字段 | 类型 | 作用与例子 |
| --- | --- | --- |
| `avatar` | 可选图片路径 | `/assets/images/avatar.webp`，src相对路径或HTTPS |
| `name` | 字符串 | 侧栏姓名与默认作者 |
| `bio` | 可选字符串 | 简介，普通文字 |
| `links` | 对象数组 | 数组顺序即图标顺序 |
| `links[].name` | 字符串 | 可见文字／读屏名称，例如“邮箱” |
| `links[].url` | URL／站内路径 | `mailto:hello@example.com`、`https://example.com`、`/about/` |
| `links[].icon` | Iconify名称 | 如 `fa7-brands:github`／`material-symbols:mail-outline` |
| `links[].showName` | boolean | true显示文字；false只图标仍保留可访问名称 |

已安装图标集：material-symbols、fa7-brands、fa7-regular、fa7-solid、simple-icons、mdi、mingcute。换其他图标集需要安装对应依赖并在Astro图标配置中接入，不能只填一个未安装名称。

## navBarConfig.ts：菜单与搜索

| 字段 | 类型 | 修改方式 |
| --- | --- | --- |
| `navBarConfig.links` | 菜单数组 | 调整顺序、删入口、插入新对象 |
| `links[].name` | 字符串 | 菜单文字 |
| `links[].url` | 字符串 | 站内 `/about/`，外站HTTPS，带children分组可用 `#` |
| `links[].icon` | 可选图标名 | 同上已安装集合 |
| `links[].external` | boolean | true新窗口，false站内同页导航 |
| `links[].children` | 同结构数组 | 二级菜单，移动端也会显示；建议不写过深嵌套 |
| `links[].pageKey` | 可选页面键 | 如 `gallery`；让菜单跟随pages开关隐藏 |
| `LinkPresets` | 预设对象表 | 只是复用菜单对象；定义了Tags预设不代表已放进links |
| `navBarSearchConfig.method` | `NavBarSearchMethod.PageFind` | 当前仅此一种搜索实现，不填外部搜索引擎名称 |

示例：在links数组增加 `{ name: "联系", url: "/about/", icon: "material-symbols:mail-outline" }`。Pagefind在build后生成索引，生产preview比单纯dev更适合验收搜索。

## announcementConfig.ts 与 FooterConfig.html

| 公告字段 | 类型 | 作用 |
| --- | --- | --- |
| `title` | 字符串／空 | 标题，空用当前语言默认 |
| `content` | 字符串 | 公告正文，当前作为普通文字显示，不当HTML执行 |
| `closable` | boolean | 是否有关闭按钮；当前页关闭不是删除配置 |
| `link.enable` | boolean | 公告按钮开关 |
| `link.text` | 字符串 | 按钮文字 |
| `link.url` | 路径／HTTPS | 例如 `/about/` |
| `link.external` | boolean | true新窗口 |
| `icon`、`type` | 类型中保留 | 当前公告组件未消费这两个字段，添加后不会改变图标／警告色；需要改组件才能接入 |

公告显隐从工作台控制，不存在生效的announcement.enable。`FooterConfig.html` 是页脚插入HTML，例如 `<p>我的记录角落 · <a href="https://example.com">说明</a></p>`。只写自己信任的HTML，避免把陌生脚本粘进页脚。

## backgroundWallpaper.ts：高级大图参数

mode、src、common.dimOpacity、common.homeText.title／subtitle、common.carousel、overlay.blur／cardOpacity 等由 layout 驱动，**不要另改一份常量与工作台互相覆盖**。以下参数在适配器中可直接设置；改后保存源码，开发预览，发布前build。

| 字段 | 类型／值 | 用途与示例 |
| --- | --- | --- |
| `playerEnable` | boolean | 视频背景开关，默认false；还需src.playerUrl视频资源 |
| `src.playerUrl` | 字符串／数组 | 直连视频或公共视频路径；保留图片的desktop／mobile配置，在src对象中额外添加playerUrl。该播放器不会自动补Pages前缀，本站本地资源应写`/personal_web/assets/videos/my-video.mp4`或完整HTTPS地址；图片轮换列表与视频列表不同 |
| `common.playerMode` | order／random | 多视频顺序／随机播放；先提供合法视频 |
| `common.homeText.enable` | boolean | 首页大图文字总开关 |
| `common.homeText.titleSize` | CSS长度 | 如 `"3.8rem"`，检查手机是否溢出 |
| `common.homeText.subtitleSize` | CSS长度 | 如 `"1.15rem"` |
| `common.homeText.typewriter.enable` | boolean | 副标题打字效果，默认false |
| `common.homeText.typewriter.speed` | 毫秒／字 | 输入速度，如100 |
| `common.homeText.typewriter.deleteSpeed` | 毫秒／字 | 删除速度，如50 |
| `common.homeText.typewriter.pauseTime` | 毫秒 | 每句完整后停留，如2000 |
| `common.homeText.linksEnable` | boolean | 标题下社交链接开关 |
| `common.homeText.links[].name` | 字符串 | 链接名称及aria-label |
| `common.homeText.links[].url` | 路径／HTTPS | 与profile links独立维护 |
| `common.homeText.links[].icon` | 图标名 | 已安装集合的名称 |
| `common.homeText.links[].showName` | boolean | 是否显示名称文字 |
| `common.waves.enable` | boolean或 `{ desktop, mobile }` | 水波纹，消耗性能；按设备单独控制 |
| `common.gradient.enable` | boolean或 `{ desktop, mobile }` | 图底到主题背景色的渐变；与水波纹配合，不改变原图 |
| `common.gradient.height` | CSS长度 | 如 `"20%"`／`"30vh"`，过渡区域高度 |
| `banner.position` | CSS object-position | 如 `"center"`／`"50% 30%"`，横幅裁切对齐 |
| `banner.postInfo.mode` | description／meta | 横幅文章页显示摘要／日期字数阅读时间 |
| `banner.navbar.transparentMode` | semi／semifull／none | 半透明／动态透明／不透明 |
| `banner.navbar.blur` | px数字 | 导航毛玻璃，0关闭 |
| `overlay.zIndex` | 整数 | 背景层级，通常保持-1，随意提高可能遮住页面 |
| `overlay.opacity` | 0–1 | 覆盖背景图片的不透明度；不同于dimOpacity遮罩和cardOpacity卡片 |
| `fullscreen.layout` | classic／hero | 经典文档流／固定全屏首屏；本项目hero |
| `fullscreen.position` | CSS object-position | 全屏裁切位置 |
| `fullscreen.navbar.transparentMode` | semi／semifull | 全屏模式导航半透明／首页顶部透明 |
| `fullscreen.navbar.blur` | px数字 | 导航模糊 |
| `fullscreen.blurRamp.enable` | boolean或设备对象 | 全屏下滑时从清晰渐变到visual.blur |

类型允许src直接为单图／数组或桌面手机对象，但本项目已经用layout适配，不建议改掉适配结构。类型还允许副标题数组；工作台当前保存的是一个字符串，若要自行扩展多句应同步修改映射与校验，不能直接往layout.subtitle填数组。

这些高级参数仍有组件和样式读取，但视频、打字机、水波纹与classic布局并非本轮默认配置的浏览器验收范围，启用后需自行验证所选组合。具体生效条件如下：

- 视频需同时设置`playerEnable: true`和非空`src.playerUrl`，然后使用导航栏视频播放按钮启动；纯色模式隐藏背景并停止视频。浏览器可能限制声音播放，无法把“开启视频开关”当作自动播放保证。视频资源由自己提供，网站不附带示例视频。
- 首页文字、链接、字体和打字机需要`common.homeText.enable: true`，且使用横幅或全屏模式；覆盖和纯色模式本来就隐藏标题。打字机的速度、删除速度和停顿参数由TypewriterText读取。作者工作台主要预览layout中的单行标题／副标题，编辑预览会临时替换副标题文字，因此启用打字机等源码高级效果后，应以单独打开博客、保存后重新载入的页面为准。
- 水波纹和底部渐变主要用于横幅。在全屏hero和透明覆盖模式下，两者会被对应CSS隐藏；纯色模式隐藏整个背景。因此在全屏模式打开waves不会看到横幅下沿波浪。波浪还遵守系统减少动态设置。
- `fullscreen.layout: "classic"`改变正式页面和保存后的完整预览；工作台没有classic／hero控件，会沿用源码配置。`fullscreen.position`仍传入图片，但现有全屏CSS固定居中裁切，会覆盖该值；要让非居中位置生效，需同时调整`src/styles/layout-styles.css`中的全屏`object-position: center !important`规则。`banner.position`在横幅模式下生效。
- `banner.postInfo.mode`用于非首页的文章横幅；全屏hero的非首页按正文背景处理，不显示该横幅元信息。导航透明度分别读取当前模式的navbar配置；改源码后刷新完整页面检查，不只看已有工作台草稿。

## sidebarConfig.ts：进阶适配

日常排序、左右移动、显隐、吸附使用工作台。其他字段目前是适配器里的固定值，要调整需改适配器生成规则：

| 字段 | 类型／当前规则 | 作用 |
| --- | --- | --- |
| `tabletSidebar` | left／right，单右布局用right，否则left | 769–1279px双侧布局优先哪一栏 |
| `hideSidebarOnPostPage` | boolean，当前false | 文章详情页是否整体隐藏侧栏 |
| `noSidebarContentWidth` | 0–1，当前1 | 没有侧栏列时正文占包裹层宽度比例 |
| `leftComponents`／`rightComponents` | 从layout左右数组生成 | 适配后的桌面组件列表，不另维护一份排序 |
| 组件 `showTitle` | boolean | 组件标题，日历当前false |
| `showOnPostPage` | boolean，当前true | 文章页显示 |
| `hideOnNonPostPage` | boolean | 目录组件当前true |
| `specificConfig.collapseThreshold` | 数字 | 分类5、标签10；更多项目折叠 |
| `specificConfig.calendar.showHeatmap` | boolean，当前true | 年度文章热力图 |
| `specificConfig.siteInfo.unknownBuildPlatform` | 字符串 | 无法识别构建平台时的显示名称 |
| `mobileBottomComponents` | 自动合并左右组件 | 不单独手写第三套排序 |

类型中还保留 advertisement、dynamic、customProps 等上游扩展；作者工作台注册表没有这些模块，不能把未知ID塞进layout。需要接入时应同时实现组件、注册、校验与预览；广告专属字段的现有结构列在高级配置。

## 文章头部（frontmatter）

位置：`src/content/posts/**/*.{md,mdx}`，开头一对 `---` 内的YAML。required字段为title、published；其他可省略。

| 字段 | 类型／默认 | 作用与填写示例 |
| --- | --- | --- |
| `title` | 必填字符串 | 文章标题 |
| `published` | 必填日期 | `published: 2026-10-16`，不要加引号 |
| `updated` | 可选日期 | 内容更新日，格式同published |
| `draft` | boolean，false | true不进入生产文章列表；开发模式可预览草稿 |
| `description` | 字符串，空 | 摘要／SEO／列表文字，建议具体概括 |
| `image` | 字符串，空 | `./photo.webp`、`/assets/photo.webp`、HTTPS；`"api"`须启用随机封面 |
| `tags` | 字符串数组，[] | `tags: [技术, Astro]`，自动生成标签筛选 |
| `category` | 字符串／null，空 | 单分类 `category: 技术` |
| `lang` | 字符串，空 | 文章语言，如zh_CN／en，不会翻译正文 |
| `pinned` | boolean，false | 置顶并参与首页精选 |
| `author` | 字符串，空 | 单篇作者，空走站点资料 |
| `sourceLink` | 字符串，空 | 转载来源HTTPS URL |
| `licenseName` | 字符串，空 | 覆盖全站许可名称 |
| `licenseUrl` | 字符串，空 | 单篇许可说明链接，和licenseName配套 |
| `comment` | boolean，true | 单篇评论开关；全站type为none时仍无评论 |
| `password` | 字符串，空 | 非空加密正文；源码公开时不是隐私存储 |
| `passwordHint` | 字符串，空 | 密码提示，不能把密码直接写进提示 |
| `series` | 字符串，空 | 同名文章组成系列 |
| `seriesOrder` | 可选数字 | 系列升序，0也是有效顺序；未填排后，次按日期降序 |
| `prevTitle`、`prevSlug`、`nextTitle`、`nextSlug` | 内部生成 | 不手动填写，程序据排序计算 |

完整示例与Markdown／公式操作见操作手册。spec集合的about／friends正文无强制头部字段，直接编辑Markdown即可。

## 项目头部

位置：`src/content/projects/**/*.{md,mdx}`。published必填；其他字段均有默认／可选。

| 字段 | 类型／默认 | 作用 |
| --- | --- | --- |
| `title` | 字符串，空 | 非空手写优先；否则仓库name，再否则repo字符串 |
| `repo` | owner/repo字符串，空 | 如example-user/my-project；仅公开仓库 |
| `published` | 日期 | 不加引号的YYYY-MM-DD |
| `draft` | boolean，false | 隐藏草稿项目 |
| `order` | 可选数字 | 项目列表中有值的在未填前，大的靠前，次按日期／标题；首页按值或0降序取前三 |
| `description` | 字符串，空 | 非空手写优先于GitHub简介 |
| `language` | 字符串，空 | 非空手写优先于GitHub主语言 |
| `stars` | 可选非负整数 | 明确填写（包括0）优先于同步；删除恢复同步 |
| `image` | 字符串，空 | 封面，可用相对图、公共根路径或HTTPS |
| `tags` | 字符串数组，[] | 项目技术／主题标签 |
| `status` | 空／in-progress／completed／interrupted | 隐藏／进行中／已完成／中断，始终手写 |
| `lang` | 字符串，空 | 内容语言 |
| `link` | 对象数组，[] | 非空时整组覆盖自动GitHub链接 |
| `link[].label` | 必填字符串 | 链接名称，如“在线演示” |
| `link[].value` | 必填URL | 点击地址 |
| `link[].icon` | 可选字符串，空 | 图标名、public图片、远程图片；空则用label首字母 |

纯手工项目省略repo并提供description、link即可。同步源列表与项目文件是两件事：只填源列表不会自动创建正文／卡片。

## 相册 galleryConfig.ts

| 字段 | 类型／默认 | 用途与修改 |
| --- | --- | --- |
| `albums` | 相册对象数组 | 顺序即相册顺序，首页前两项 |
| `columnWidth` | px数字，回退240 | 瀑布流最小列宽，当前可设260等 |
| `albums[].id` | 必填唯一字符串 | URL slug和public/gallery目录名，例my-trip |
| `name` | 必填字符串 | 相册标题 |
| `description` | 可选字符串 | 相册说明 |
| `date` | 可选字符串 | 显示日期，如"2026-10-16"，与文章日期类型不同 |
| `location` | 可选字符串 | 拍摄／创作地点 |
| `tags` | 可选字符串数组 | 列表筛选标签 |
| `cover` | 可选图片路径 | 显式封面优先；否则cover.*，否则首图 |
| `photoDescriptions` | 文件名／完整URL到字符串的对象 | 图片说明、替代文字、放大标题；例 `{ "01.webp": "海边日落" }` |
| `password` | 可选字符串 | 非空启用相册内容静态加密；public原图仍可直达 |
| `passwordHint` | 可选字符串 | 解锁提示 |

图片扫描目录仅当前层，支持jpg／jpeg／png／webp／avif／gif；本地文件名排序、cover优先，远程urls.txt内容排后。urls.txt一行一个URL，#注释。增加／删除资源后重新构建才能发布新列表。

## 友链 friendsConfig.ts

| 字段 | 类型／含义 | 怎么改 |
| --- | --- | --- |
| `friendsPageConfig.title` | 可选字符串 | 页标题，空回退i18n |
| `.description` | 可选字符串 | 页描述，空回退i18n |
| `.showCustomContent` | boolean | 显示spec/friends.md附加正文 |
| `.showComment` | boolean | 页底评论，需要全站评论服务 |
| `.randomizeSort` | boolean | true随机排序友链页，忽略weight；不改变首页预览权重规则 |
| `friendsConfig[].title` | 字符串 | 小站名称 |
| `.imgurl` | 图片地址 | HTTPS或public根路径 |
| `.desc` | 字符串 | 介绍 |
| `.siteurl` | HTTPS URL | 访问目标 |
| `.tags` | 可选字符串数组 | 标签 |
| `.weight` | 数字 | 大的靠前 |
| `.enabled` | boolean | false隐藏，true展示 |

## 外部源 config/external-sources.json

| 字段 | 类型／限制 | 作用 |
| --- | --- | --- |
| `github.repositories` | owner/repo字符串数组 | 精选公开仓库；`[]`不抓取仓库 |
| `bilibili.uid` | 空或纯数字字符串 | 当前B站账号；空关闭 |
| `bilibili.overrides` | 对象，默认{} | 键是快照番剧id／media_id，值只允许下面两个字段 |
| `overrides["id"].watchedEpisodes` | 非负安全整数 | 自己明确记录的已看集数 |
| `overrides["id"].status` | planned／watching／completed／on-hold／dropped | 想看／在看／看完／搁置／弃番 |

`npm run sync`和`npm run build`读取此文件。请求有超时、有限重试、分页完整性检查，失败保留同一来源成功缓存。UID变化不展示旧UID；仓库按名称隔离。成功空列表会清旧列表。快照的lastAttemptAt是最近尝试，lastSuccessAt是最近成功，不要手改这两个时间伪装更新。

## 音乐 musicConfig.ts

| 字段 | 类型／可选值 | 作用 |
| --- | --- | --- |
| `mode` | local／meting | 本地歌单／Meting接口 |
| `volume` | 0–1数字 | 默认音量，0.5为50%；访客已有偏好可覆盖 |
| `playMode` | list／one／random | 列表循环／单曲循环／随机 |
| `showLyrics` | boolean | 歌词显示 |
| `showInNavbar` | boolean | 顶栏播放器入口 |
| `showInSidebar` | boolean | 侧栏播放器；还需layout启用music组件 |
| `local.playlist` | 对象数组 | 数组顺序即歌单 |
| `playlist[].name` | 必填字符串 | 曲名 |
| `.artist` | 必填字符串 | 作者／演唱者 |
| `.url` | 必填URL或公共路径 | 音频文件，如/assets/music/song.mp3 |
| `.cover` | 可选图片地址 | 封面 |
| `.lrc` | 可选字符串 | LRC内容或歌词文件URL，不是歌词网页 |
| `meting.api` | HTTPS模板URL | Meting兼容接口 |
| `meting.server` | netease／tencent／kugou／xiami／baidu | 类型允许的平台，是否可用由API决定 |
| `meting.type` | song／playlist／album／search／artist | 对象类型 |
| `meting.id` | 字符串 | ID或搜索关键字，按API要求 |
| `meting.auth` | 字符串 | 只能放可公开参数，不能放服务端密钥 |
| `meting.fallbackApis` | 模板URL数组 | 主源失败后按顺序尝试 |

占位符支持:server、:type、:id、:auth、:r，前四个URL编码替换，r用于随机防缓存。主接口和备用接口均需允许浏览器跨源访问，音频／封面／歌词也需要可访问。播放器不强制自动播放；站内切页保持单例，整页刷新不保证连续。

## 环境变量与部署路径

| 名称 | 取值 | 作用与优先级 |
| --- | --- | --- |
| `SITE_BASE` | `/personal_web/`默认，根站为`/` | Astro路径前缀；改仓库名／域名部署时同步修改并重建 |
| `PUBLIC_SITE_LANG` | en／zh_CN／zh_TW／ja／ru／ko及对应语言连字符形式 | 优先于文件SITE_LANG；无效回退 |
| `PUBLIC_PAGES_<KEY>` | true／false等 | 优先于pages对应值，例如PUBLIC_PAGES_GALLERY=false |
| `PUBLIC_DISPLAY_SETTINGS` | true／false等 | 优先于访客设置面板enable，不会自动把每个子控件都打开 |
| `GITHUB_TOKEN` | 构建环境中的可选令牌 | 公开仓库请求的限额凭证，由sync脚本只在服务端读取，不写JSON或提交到仓库；未设置也能请求公开数据 |

布尔环境值大小写不敏感：true／1／on／yes／enable／enabled为开，false／0／off／no／disable／disabled为关，无法识别时用文件值。PUBLIC_变量会进入浏览器产物，不能存秘密。修改环境后重启／重建；在PowerShell可临时用 `$env:SITE_BASE='/'` 再运行构建，结束后 `Remove-Item Env:SITE_BASE` 清除本终端覆盖。作者工作台的本机启动条件由npm脚本管理，不要把它当成上线环境配置。

依赖版本在package.json／pnpm-lock.yaml，Node版本在.node-version，部署流程在.github/workflows/pages.yml。更换这些属于工程维护，改后安装并执行完整检查；不要只改dist。字体、评论、统计、特效和其他可选功能的逐字段说明继续见[高级配置](advanced-configuration.md)。
