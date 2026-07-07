import React, { useMemo, useState } from 'react';
import { Image } from 'expo-image';

const DEFAULT_PLACEHOLDER = 'https://placehold.co/400x300/e2e8f0/64748b?text=';

function resizeModeToContentFit(resizeMode) {
    switch (resizeMode) {
        case 'contain':
            return 'contain';
        case 'stretch':
            return 'fill';
        case 'center':
            return 'none';
        default:
            return 'cover';
    }
}

/**
 * Remote/local image with expo-image caching and downscaling.
 * Use `uri` for remote URLs, `source` for require() assets.
 */
export default function AppImage({
    uri,
    source,
    style,
    resizeMode = 'cover',
    contentFit,
    placeholder,
    recyclingKey,
    transition = 0,
    cachePolicy = 'memory-disk',
    onError,
    ...rest
}) {
    const [failed, setFailed] = useState(false);

    const imageSource = useMemo(() => {
        if (source != null) return source;
        if (!uri || failed) {
            const fallback = placeholder || `${DEFAULT_PLACEHOLDER}${encodeURIComponent('Фото')}`;
            return { uri: fallback };
        }
        return { uri };
    }, [source, uri, failed, placeholder]);

    const handleError = (event) => {
        if (source == null && uri && !failed) setFailed(true);
        onError?.(event);
    };

    return (
        <Image
            source={imageSource}
            style={style}
            contentFit={contentFit || resizeModeToContentFit(resizeMode)}
            cachePolicy={cachePolicy}
            transition={transition}
            recyclingKey={recyclingKey || (typeof uri === 'string' ? uri : undefined)}
            onError={handleError}
            {...rest}
        />
    );
}
