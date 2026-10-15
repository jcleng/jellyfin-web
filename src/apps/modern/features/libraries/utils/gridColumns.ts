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
