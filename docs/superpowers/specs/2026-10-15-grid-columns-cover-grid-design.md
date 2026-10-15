# 网格视图「每行数量」与封面九宫格 设计文档

日期：2026-10-15
状态：已获用户批准

## 背景与目标

现代媒体库页面（`src/apps/modern/features/libraries/`）的视图设置目前只有「网格视图 / 列表视图」两种模式。网格视图的列数完全由 `card.scss` 的响应式断点决定，小屏幕上会出现每行 1～2 个、大屏幕上每行 6～8 个的情况。

目标：在网格视图设置中新增「**每行数量**」选项（采用方案 C，用户选定）：

- 可选值：**自动 / 3 / 4 / 6**；「封面九宫格」即每行数量 = 3
- 选中固定列数后，**所有设备**（手机、平板、PC）都固定为该列数（用户选定 `all_fixed`）
- 固定列数时封面图强制为 **16:9 横版视频封面**（Thumb/Backdrop，用户选定 `all_fixed_columns`）
- 「自动」= 现状响应式递增，行为完全不变

## 数据模型

`src/types/library.ts`：

```ts
export type GridColumns = 3 | 4 | 6;

export interface LibraryViewSettings {
    // ...现有字段不变
    GridColumns?: GridColumns; // 缺省 = 自动（响应式）
}
```

- `ViewMode` 保持 `grid` / `list` 不变，不引入新的 ViewMode
- 旧 localStorage 数据没有 `GridColumns` 字段 → 视为「自动」，无迁移成本
- 持久化沿用现有 `useLocalStorage`（`hooks/useLibrary.tsx`），新字段自动保存

## UI（`ViewSettingsButton.tsx`）

- 网格视图齿轮展开的设置子菜单中，新增一组「每行数量」（`ListSubheader`），选项为菜单项：`自动 / 3 / 4 / 6`，当前值显示打勾
- 点击选项：`setLibraryViewSettings(prev => ({ ...prev, GridColumns }))`；选「自动」时删除该字段（`GridColumns: undefined`）
- 固定列数（3/4/6）激活时，**隐藏「图像类型」子菜单**（此时图像由本模式强制决定，显示会造成误导）；选「自动」后恢复显示
- 顶部按钮图标与选中勾的判断保持 `=== ViewMode.GridView` 不变（本方案不新增 ViewMode）

## 封面取图（`ItemsView.tsx` → `getCardOptions()`）

```ts
if (libraryViewSettings.GridColumns) {
    shape = CardShape.Backdrop;   // 16:9 padder（padding-bottom: 56.25%）
    preferThumb = true;           // 优先 Thumb/Backdrop 横图，缺失时 fallback 到 Primary 并 cover 裁切
    imageType = ImageType.Thumb;
} else {
    // 现有 ImageType 分支原样保留（Banner/Disc/Logo/Thumb/Primary）
}
```

- 该组合与现有「图像类型 = Thumb」的取图路径完全一致（`cardbuilder/utils/url.ts`），行为已验证过
- `cardOptions.coverImage = true` 已存在，竖图会被裁切成横版封面
- `GridColumns` 为 3/4/6 任一值时均强制横版（用户选定）
- 频道（Channels）视图为既有例外：其 viewType 覆盖在解析器之后将 shape 固定为 Square，固定列数下仍保持方形封面（列数照常固定）

## 布局（列数）

`ItemsView.tsx` 容器类：

```ts
const itemsContainerClass = classNames(
    'padded-left padded-right',
    libraryViewSettings.ViewMode === ViewMode.ListView
        ? 'vertical-list'
        : 'vertical-wrap',
    libraryViewSettings.GridColumns && `gridColumns-${libraryViewSettings.GridColumns}`
);
```

`src/components/cardbuilder/card.scss` 新增（**不带媒体查询**，全设备固定）：

```scss
.vertical-wrap.gridColumns-3 > .card {
    width: 33.333333333333333333333333333333%;
}

.vertical-wrap.gridColumns-4 > .card {
    width: 25%;
}

.vertical-wrap.gridColumns-6 > .card {
    width: 16.666666666666666666666666666667%;
}
```

- 选择器 specificity `(0,3,0)`（三个类选择器），覆盖现有全部卡片宽度规则（`.portraitCard` = `(0,1,0)`、`.itemsContainer-tv > .portraitCard` = `(0,2,0)`，media query 不增加 specificity），无需逐断点覆盖
- 实际插入位置为 `.card:focus` 之后（因 stylelint `no-descending-specificity` 约束），与 `.vertical-wrap.centered` 之后级联等价
- `gridColumns-N` 只在选了固定列数时挂载；「自动」不挂载 → 现有断点规则原样生效
- 卡片为 flex item，`.cardBox` 的 margin 位于卡片内部，百分比宽度下每行恰好 N 个、正常换行

## 文案（`src/strings/`）

新增键（en-us、en_US、en-gb、zh-cn）：

| 键 | en | zh-cn |
| --- | --- | --- |
| `LabelGridColumns` | Columns Per Row | 每行数量 |

「自动」选项复用现有键 `Auto`（en-us: "Auto"，zh-cn: "自动"），不新增。
其余语言由 Weblate 后续补齐，未收录的语言回退到 en-us 的英文文案（"Columns Per Row"），不显示键名、不空白。

## 影响范围

- 仅现代媒体库页面的网格视图（`ItemsView.tsx` / `ViewSettingsButton.tsx`）
- 列表视图、首页板块、搜索结果、legacy 页面均不受影响
- `card.scss` 的三条新规则挂在 `.vertical-wrap.gridColumns-N` 下，不影响任何未使用该字段的页面

## 错误处理与兼容

- 旧数据无 `GridColumns` → 自动，现状不变
- 将来出现非法值（如手工改 localStorage 写入 5）→ `gridColumns-5` 无对应 CSS 规则，布局回退为响应式，不报错
- `ViewSettingsButton` 中 `GridColumns` 取值只来自受控选项，UI 层不会产生非法值

## 验证

- `npm run build:check`（tsc）
- `npm run lint`（eslint）
- `npm run stylelint`
- `npm run test`（vitest）
- 手动验证：选 3/4/6 后手机与 PC 窗口列数一致且为横版封面；选自动后恢复原状；图像类型菜单在固定列数时隐藏、自动时显示
