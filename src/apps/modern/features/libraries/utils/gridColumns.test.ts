import { ImageType } from '@jellyfin/sdk/lib/generated-client/models/image-type';
import { describe, expect, test } from 'vitest';

import { CardShape } from 'components/cardbuilder/utils/shape';

import { resolveGridColumnsClass, resolveGridImageOptions } from './gridColumns';

describe('resolveGridColumnsClass', () => {
    test('undefined (自动) returns null so responsive rules apply', () => {
        // eslint-disable-next-line sonarjs/no-undefined-argument
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
