# 网格视图「每行数量（封面九宫格）」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现代媒体库网格视图设置中新增「每行数量」选项（自动/3/4/6，6 为封面九宫格=每行 3），固定列数时全设备生效并强制 16:9 横版封面。

**Architecture:** 抽一个纯函数模块 `resolveGridImageOptions` / `resolveGridColumnsClass` 承担全部决策逻辑（TDD 覆盖），`ItemsView` 与 `ViewSettingsButton` 只做接线；列数由容器类 `gridColumns-N` + `card.scss` 中三条无媒体查询的宽度规则实现。

**Tech Stack:** TypeScript + React（jellyfin-web）、vitest、MUI Menu、SCSS/stylelint、globalize 文案。

**Spec:** `docs/superpowers/specs/2026-10-15-grid-columns-cover-grid-design.md`（已批准）

**执行位置:** 当前工作区（分支 `artplayer`），无需新建 worktree。

---

### Task 1: 类型 + 纯函数模块（TDD）

**Files:**
- Modify: `src/types/library.ts`（`ViewMode` 枚举之后新增类型；`LibraryViewSettings` 新增字段）
- Create: `src/apps/modern/features/libraries/utils/gridColumns.ts`
- Test: `src/apps/modern/features/libraries/utils/gridColumns.test.ts`

- [ ] **Step 1: 修改类型 `src/types/library.ts`**

在 `ViewMode` 枚举**之前**插入（保持文件内 `export` 风格）：

```ts
/** 网格视图固定列数；缺省（undefined）= 自动（响应式递增） */
export type GridColumns = 3 | 4 | 6;
```

在 `LibraryViewSettings` 接口中 `ViewMode: ViewMode;` 行后新增一行：

```ts
    GridColumns?: GridColumns;
```

- [ ] **Step 2: 写失败测试**

创建 `src/apps/modern/features/libraries/utils/gridColumns.test.ts`：

```ts
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { describe, expect, test } from 'vitest';

import { CardShape } from 'components/cardbuilder/utils/shape';

import { resolveGridColumnsClass, resolveGridImageOptions } from './gridColumns';

describe('resolveGridColumnsClass', () => {
    test('undefined (自动) returns null so responsive rules apply', () => {
        expect(resolveGridColumnsClass(undefined)).toBeNull();
    });

    test('returns the container class for fixed columns', () => {
        expect(resolveGridColumnsClass(3)).toBe('gridColumns-3');
        expect(resolveGridColumnsClass(4)).toBe('gridColumns-4');
        expect(resolveGridColumnsClass(6)).toBe('gridColumns-6');
    });
});

describe('resolveGridImageOptions', () => {
    test('fixed columns force 16:9 thumb cover for every column count', () => {
        const expected = {
            shape: CardShape.Backdrop,
            preferThumb: true,
            imageType: ImageType.Thumb
        };

        expect(resolveGridImageOptions(3, ImageType.Primary)).toEqual(expected);
        expect(resolveGridImageOptions(4, ImageType.Logo)).toEqual(expected);
        expect(resolveGridImageOptions(6, ImageType.Banner)).toEqual(expected);
    });

    test('自动 keeps the existing ImageType mapping', () => {
        expect(resolveGridImageOptions(undefined, ImageType.Banner)).toEqual({
            shape: CardShape.Banner,
            imageType: ImageType.Banner
        });
        expect(resolveGridImageOptions(undefined, ImageType.Disc)).toEqual({
            shape: CardShape.Square,
            preferDisc: true,
            imageType: ImageType.Disc
        });
        expect(resolveGridImageOptions(undefined, ImageType.Logo)).toEqual({
            shape: CardShape.Backdrop,
            preferLogo: true,
            imageType: ImageType.Logo
        });
        expect(resolveGridImageOptions(undefined, ImageType.Thumb)).toEqual({
            shape: CardShape.Backdrop,
            preferThumb: true,
            imageType: ImageType.Thumb
        });
        expect(resolveGridImageOptions(undefined, ImageType.Primary)).toEqual({
            shape: CardShape.Auto,
            imageType: ImageType.Primary
        });
    });
});
```

- [ ] **Step 3: 运行测试确认失败**

Run: `npx vitest run src/apps/modern/features/libraries/utils/gridColumns.test.ts`
Expected: FAIL，错误为 `Failed to resolve import .../gridColumns` 或 `gridColumns.ts` 不存在（exit code 1）。

- [ ] **Step 4: 最小实现**

创建 `src/apps/modern/features/libraries/utils/gridColumns.ts`：

```ts
import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';

import { CardShape } from 'components/cardbuilder/utils/shape';
import type { GridColumns } from 'types/library';

export interface GridImageOptions {
    shape: CardShape;
    preferThumb?: boolean;
    preferDisc?: boolean;
    preferLogo?: boolean;
    imageType: ImageType;
}

/** 容器附加类；返回 null 表示「自动」，由现有响应式断点决定列数 */
export function resolveGridColumnsClass(gridColumns?: GridColumns): string | null {
    return gridColumns ? `gridColumns-${gridColumns}` : null;
}

/**
 * 网格视图的取图决策：
 * - 固定列数（3/4/6）= 封面网格模式，强制 16:9 横版（Thumb 优先，缺失时 Primary cover 裁切）
 * - 自动 = 完全沿用现有 ImageType 映射
 */
export function resolveGridImageOptions(
    gridColumns: GridColumns | undefined,
    imageType: ImageType
): GridImageOptions {
    if (gridColumns) {
        return {
            shape: CardShape.Backdrop,
            preferThumb: true,
            imageType: ImageType.Thumb
        };
    }

    if (imageType === ImageType.Banner) {
        return { shape: CardShape.Banner, imageType };
    }

    if (imageType === ImageType.Disc) {
        return { shape: CardShape.Square, preferDisc: true, imageType };
    }

    if (imageType === ImageType.Logo) {
        return { shape: CardShape.Backdrop, preferLogo: true, imageType };
    }

    if (imageType === ImageType.Thumb) {
        return { shape: CardShape.Backdrop, preferThumb: true, imageType };
    }

    return { shape: CardShape.Auto, imageType };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx vitest run src/apps/modern/features/libraries/utils/gridColumns.test.ts`
Expected: PASS（`4 tests passed`，exit code 0）。

- [ ] **Step 6: Commit**

```bash
git add src/types/library.ts src/apps/modern/features/libraries/utils/gridColumns.ts src/apps/modern/features/libraries/utils/gridColumns.test.ts
git commit -m "feat: add GridColumns type and grid image/column resolvers"
```

---

### Task 2: 文案键

**Files:**
- Modify: `src/strings/en-us.json`、`src/strings/en_US.json`、`src/strings/en-gb.json`、`src/strings/zh-cn.json`

- [ ] **Step 1: en-us.json 与 en_US.json 插入 `LabelGridColumns`**

两个文件的 `LabelFriendlyName` 行之后、`LabelGroupMoviesIntoCollections` 行之前插入（字母序 `LabelGrid… < LabelGroup…`）：

```json
    "LabelGridColumns": "Columns Per Row",
```

（两个文件该处上下文相同：`"LabelFriendlyName": "Friendly name",`。）

- [ ] **Step 2: en-gb.json 插入**

`"LabelH264Crf"` 行之前插入：

```json
    "LabelGridColumns": "Columns Per Row",
```

- [ ] **Step 3: zh-cn.json 插入**

`"LabelGroupMoviesIntoCollections"` 行之前插入：

```json
    "LabelGridColumns": "每行数量",
```

「自动」复用现有键 `Auto`（en: "Auto" / zh-cn: "自动"），不新增。

- [ ] **Step 4: 校验 JSON 合法**

Run:
```bash
node -e "['en-us','en_US','en-gb','zh-cn'].forEach(f => JSON.parse(require('fs').readFileSync('src/strings/' + f + '.json', 'utf8'))); console.log('JSON OK')"
```
Expected: 输出 `JSON OK`，exit code 0。

- [ ] **Step 5: Commit**

```bash
git add src/strings/en-us.json src/strings/en_US.json src/strings/en-gb.json src/strings/zh-cn.json
git commit -m "i18n: add LabelGridColumns (columns per row)"
```

---

### Task 3: ItemsView 接线

**Files:**
- Modify: `src/apps/modern/features/libraries/components/ItemsView.tsx`

- [ ] **Step 1: 用解析器替换 shape 分支**

将 `getCardOptions` 开头的这段（从 `let shape;` 到 `} else { shape = CardShape.Auto; }`）：

```ts
        let shape;
        let preferThumb;
        let preferDisc;
        let preferLogo;

        if (libraryViewSettings.ImageType === ImageType.Banner) {
            shape = CardShape.Banner;
        } else if (libraryViewSettings.ImageType === ImageType.Disc) {
            shape = CardShape.Square;
            preferDisc = true;
        } else if (libraryViewSettings.ImageType === ImageType.Logo) {
            shape = CardShape.Backdrop;
            preferLogo = true;
        } else if (libraryViewSettings.ImageType === ImageType.Thumb) {
            shape = CardShape.Backdrop;
            preferThumb = true;
        } else {
            shape = CardShape.Auto;
        }
```

替换为：

```ts
        const {
            shape,
            preferThumb,
            preferDisc,
            preferLogo,
            imageType
        } = resolveGridImageOptions(libraryViewSettings.GridColumns, libraryViewSettings.ImageType);
```

- [ ] **Step 2: cardOptions 使用解析出的 imageType**

`cardOptions` 对象里：

```ts
            imageType: libraryViewSettings.ImageType,
```

改为：

```ts
            imageType,
```

- [ ] **Step 3: 更新 import 与依赖数组**

- 新增 import（与 `getDefaultLibraryViewSettings` 同一来源行相邻）：

```ts
import { resolveGridColumnsClass, resolveGridImageOptions } from 'apps/modern/features/libraries/utils/gridColumns';
```

- 删除 `import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';`（该文件不再使用 `ImageType`；`CardShape` 仍被 Channels/SeriesTimers 分支使用，保留）。
- `getCardOptions` 的 `useCallback` 依赖数组中，在 `libraryViewSettings.ImageType,` 之后增加：

```ts
        libraryViewSettings.GridColumns,
```

- [ ] **Step 4: 容器类追加 gridColumns-N**

```ts
    const itemsContainerClass = classNames(
        'padded-left padded-right',
        libraryViewSettings.ViewMode === ViewMode.ListView ?
            'vertical-list' :
            'vertical-wrap',
        resolveGridColumnsClass(libraryViewSettings.GridColumns)
    );
```

（`resolveGridColumnsClass` 返回 `null` 时 classNames 自动忽略。）

- [ ] **Step 5: 类型检查**

Run: `npx tsc --noEmit`
Expected: exit code 0，无错误。

- [ ] **Step 6: Commit**

```bash
git add src/apps/modern/features/libraries/components/ItemsView.tsx
git commit -m "feat: apply fixed column count and 16:9 cover in library grid"
```

---

### Task 4: ViewSettingsButton 菜单

**Files:**
- Modify: `src/apps/modern/features/libraries/components/ViewSettingsButton.tsx`

- [ ] **Step 1: 新增类型 import 与列数选项**

`import { LibraryViewSettings, ViewMode } from 'types/library';` 改为：

```ts
import { type GridColumns, LibraryViewSettings, ViewMode } from 'types/library';
```

在 `imageTypesOptions` 定义之后新增：

```ts
const gridColumnsOptions: Array<GridColumns | undefined> = [undefined, 3, 4, 6];
```

- [ ] **Step 2: 新增 setGridColumns 回调**

在 `onListViewClick` 之后新增：

```ts
    const setGridColumns = useCallback((columns?: GridColumns) => {
        setLibraryViewSettings(prevState => ({
            ...prevState,
            GridColumns: columns
        }));
    }, [setLibraryViewSettings]);
```

- [ ] **Step 3: 固定列数时隐藏图像类型菜单**

```ts
    const isImageTypeVisible = !IMAGE_TYPE_EXCLUDED_VIEWS.includes(viewType);
```

改为：

```ts
    const isImageTypeVisible = !IMAGE_TYPE_EXCLUDED_VIEWS.includes(viewType)
        && !libraryViewSettings.GridColumns;
```

- [ ] **Step 4: Collapse 内新增「每行数量」菜单组**

在 `<Collapse in={isSettingsOpen} ...>` 内**最前面**（`{isImageTypeVisible && (` 的 `MenuList` 之前）插入：

```tsx
                        <MenuList
                            subheader={
                                <ListSubheader
                                    disableSticky
                                    sx={{
                                        lineHeight: '36px'
                                    }}
                                >
                                    {globalize.translate('LabelGridColumns')}
                                </ListSubheader>
                            }
                            dense
                        >
                            {gridColumnsOptions.map((columns) => (
                                <MenuItem
                                    key={columns ?? 'auto'}
                                    onClick={() => setGridColumns(columns)}
                                >
                                    <ListItemIcon>
                                        {libraryViewSettings.GridColumns === columns && <Check fontSize='small' />}
                                    </ListItemIcon>
                                    <ListItemText>
                                        {columns == null ? globalize.translate('Auto') : columns}
                                    </ListItemText>
                                </MenuItem>
                            ))}
                        </MenuList>
```

- [ ] **Step 5: Lint + 类型检查**

Run: `npx eslint src/apps/modern/features/libraries/components/ViewSettingsButton.tsx && npx tsc --noEmit`
Expected: 无输出（eslint 通过），exit code 0。

- [ ] **Step 6: Commit**

```bash
git add src/apps/modern/features/libraries/components/ViewSettingsButton.tsx
git commit -m "feat: add columns-per-row menu (auto/3/4/6) to grid view settings"
```

---

### Task 5: card.scss 固定列数规则

**Files:**
- Modify: `src/components/cardbuilder/card.scss`

- [ ] **Step 1: 新增三条宽度规则**

在 `.vertical-wrap.centered` 规则块之后插入：

> **执行记录**：实际改插在 `.card:focus` 规则之后（约 card.scss:135），因为按原位置插入会触发 stylelint `no-descending-specificity`（`.card:focus` 不能出现在更高 specificity 的 `.card` 结尾选择器之后）。审查已验证两处位置级联等价（两者之间无任何 `width` 声明）。

```scss
// 网格视图「每行数量」固定列数（无媒体查询 = 所有设备生效）
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

要点（勿改）：
- 选择器 specificity `(0,3,0)`（三个类选择器），覆盖 `.portraitCard` `(0,1,0)`、`.itemsContainer-tv > .portraitCard` `(0,2,0)` 及全部 media query 内的宽度（media query 不增加 specificity）
- 必须**不带** media query，才能保证手机与 PC 同列数
- 只在容器挂了 `gridColumns-N` 类时生效；「自动」不挂类 → 现有规则原样工作

- [ ] **Step 2: Stylelint**

Run: `npx stylelint src/components/cardbuilder/card.scss`
Expected: 无输出，exit code 0。

- [ ] **Step 3: Commit**

```bash
git add src/components/cardbuilder/card.scss
git commit -m "feat: fixed grid columns (3/4/6) for all viewports"
```

---

### Task 6: 全量验证

- [ ] **Step 1: 类型检查**

Run: `npm run build:check`
Expected: exit code 0。

- [ ] **Step 2: ESLint**

Run: `npx eslint src/apps/modern/features/libraries src/components/cardbuilder`
Expected: exit code 0。

- [ ] **Step 3: Stylelint**

Run: `npm run stylelint`
Expected: exit code 0。

- [ ] **Step 4: 单元测试（全量）**

Run: `npm run test`
Expected: exit code 0，全部通过（含新增 `gridColumns.test.ts` 4 个用例）。

- [ ] **Step 5: 手动验证**

Run: `npm start`

在浏览器中验证清单：
1. 电影库 → 视图设置齿轮 → 出现「每行数量」组：`自动 / 3 / 4 / 6`，「自动」打勾
2. 选 **3**：所有窗口宽度（拖动浏览器窗口从 320px 到全屏）均固定每行 3 个、16:9 横版封面；「图像类型」菜单隐藏
3. 选 **4** / **6**：同上，分别每行 4 / 6 个
4. 选 **自动**：恢复现状（小屏少、大屏多列，图像类型菜单重新显示，图片按 ImageType 显示）
5. 列表视图切换仍正常；刷新页面后选择被记住（localStorage 持久化）
6. 电视布局（如有）与剧集页不受影响

- [ ] **Step 6: 最终 Commit（如有遗漏文件）**

```bash
git status
git add -A && git commit -m "chore: grid columns feature verification cleanups" || true
```

---

## Self-Review 记录

1. **Spec 覆盖**：数据模型→Task 1；UI 菜单/隐藏图像类型→Task 4；取图强制横版→Task 1+3；布局列数→Task 3+5；文案→Task 2；验证→Task 6。无缺口。
2. **Placeholder 扫描**：所有代码步骤含完整代码，无 TBD/「类似 Task N」。
3. **类型一致性**：`GridColumns`（Task 1 定义）→ `resolveGridColumnsClass`/`resolveGridImageOptions`（Task 1 定义，Task 3 使用）→ `setGridColumns`/`gridColumnsOptions`（Task 4）→ `gridColumns-N` 类（Task 3 挂载、Task 5 消费），命名一致。
