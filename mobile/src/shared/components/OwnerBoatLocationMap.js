import React, { memo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapLocationPin from './MapLocationPin';

/**
 * Изолированная карта для формы владельца: не перерисовывается при вводе в поля адреса.
 */
function OwnerBoatLocationMap({
    YaMap,
    Marker,
    initialLat,
    initialLng,
    markerLat,
    markerLng,
    onMapPress,
}) {
    const initialRegionRef = useRef(null);
    if (!initialRegionRef.current) {
        const hasPoint = initialLat != null && initialLng != null;
        initialRegionRef.current = {
            lat: hasPoint ? initialLat : 55.751244,
            lon: hasPoint ? initialLng : 37.618423,
            zoom: hasPoint ? 14 : 10,
        };
    }

    if (!YaMap) return null;

    return (
        <YaMap
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegionRef.current}
            onMapPress={onMapPress}
            rotateGesturesEnabled={false}
            tiltGesturesEnabled={false}
        >
            {markerLat != null && markerLng != null && Marker ? (
                <Marker
                    point={{ lat: markerLat, lon: markerLng }}
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <MapLocationPin color="#0D5C5C" size={40} />
                </Marker>
            ) : null}
        </YaMap>
    );
}

export default memo(
    OwnerBoatLocationMap,
    (prev, next) =>
        prev.markerLat === next.markerLat &&
        prev.markerLng === next.markerLng &&
        prev.onMapPress === next.onMapPress &&
        prev.YaMap === next.YaMap &&
        prev.Marker === next.Marker,
);
