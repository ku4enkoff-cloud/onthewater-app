import { describe, it, expect } from 'vitest';
import { toThumbStoragePath, thumbFilenameFromFull, isThumbPath } from './photoUrls.js';

describe('photoUrls', () => {
    it('builds thumb path from uploads webp', () => {
        expect(toThumbStoragePath('/uploads/abc.webp')).toBe('/uploads/abc-thumb.webp');
        expect(toThumbStoragePath('https://api.onthewater.ru/uploads/abc.webp'))
            .toBe('/uploads/abc-thumb.webp');
    });

    it('ignores non-uploads and existing thumbs', () => {
        expect(toThumbStoragePath('https://images.unsplash.com/x.jpg')).toBeNull();
        expect(toThumbStoragePath('/uploads/abc-thumb.webp')).toBeNull();
        expect(isThumbPath('/uploads/abc-thumb.webp')).toBe(true);
    });

    it('builds thumb filename', () => {
        expect(thumbFilenameFromFull('abc.webp')).toBe('abc-thumb.webp');
        expect(thumbFilenameFromFull('abc-thumb.webp')).toBeNull();
    });
});
