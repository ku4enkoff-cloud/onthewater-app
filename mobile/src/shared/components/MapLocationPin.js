import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * Маркер точки на YaMap (iOS/Android): нативный слой рисует children,
 * source с мелким scale часто не отображается на iOS.
 */
export default function MapLocationPin({ color = '#DC2626', size = 44 }) {
    const h = Math.round(size * 1.2);
    return (
        <Svg width={size} height={h} viewBox="0 0 40 48">
            <Path
                d="M20 0C11.2 0 4 7.2 4 16c0 12 16 32 16 32s16-20 16-32C36 7.2 28.8 0 20 0z"
                fill={color}
            />
            <Circle cx="20" cy="16" r="6" fill="#fff" />
        </Svg>
    );
}
