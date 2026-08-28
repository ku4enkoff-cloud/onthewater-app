/**
 * Подготовка маркеров для YaMap: JS-кластеризация без ClusteredYamap.
 * На iOS нативный ClusteredYamap сбрасывает React-children при обновлении точек.
 */

function distanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function sameCoordGroup(boatA, boatB, decimals = 4) {
    const latA = Number(boatA?.lat);
    const lonA = Number(boatA?.lng);
    const latB = Number(boatB?.lat);
    const lonB = Number(boatB?.lng);
    if (!Number.isFinite(latA) || !Number.isFinite(lonA) || !Number.isFinite(latB) || !Number.isFinite(lonB)) {
        return false;
    }
    return (
        latA.toFixed(decimals) === latB.toFixed(decimals) &&
        lonA.toFixed(decimals) === lonB.toFixed(decimals)
    );
}

export function groupedMarkerKey(boats, fallback = 'x') {
    if (!Array.isArray(boats) || !boats.length) return fallback;
    const ids = boats
        .map((b) => (b?.id != null ? String(b.id) : ''))
        .filter(Boolean)
        .sort();
    return ids.length ? ids.join('_') : fallback;
}

/** Радиус группировки (м) зависит от zoom: дальше — крупнее кластеры. */
export function clusterRadiusForZoom(zoom, { enterPriceZoom = 13, nearbyMeters = 100 } = {}) {
    const z = Number.isFinite(Number(zoom)) ? Number(zoom) : 10;
    if (z >= enterPriceZoom) return nearbyMeters;
    return Math.max(120, 4000 / 2 ** Math.max(0, z - 8));
}

/** Близкие точки — одна метка с массивом boats. */
export function groupMarkersByProximity(markers, radiusMeters) {
    if (!Array.isArray(markers) || markers.length < 2) {
        return (markers || []).map((m) => ({
            point: m.point,
            boats: [m.data],
            key: groupedMarkerKey([m.data], `m-${m.data?.id ?? 'x'}`),
        }));
    }

    const groups = [];
    const used = new Set();

    for (let i = 0; i < markers.length; i++) {
        if (used.has(i)) continue;
        const base = markers[i];
        const members = [base];
        used.add(i);

        for (let j = i + 1; j < markers.length; j++) {
            if (used.has(j)) continue;
            const other = markers[j];
            const blat = Number(base.point?.lat);
            const blon = Number(base.point?.lon);
            const olat = Number(other.point?.lat);
            const olon = Number(other.point?.lon);
            if (!Number.isFinite(blat) || !Number.isFinite(blon) || !Number.isFinite(olat) || !Number.isFinite(olon)) {
                continue;
            }
            const near =
                distanceMeters(blat, blon, olat, olon) <= radiusMeters ||
                sameCoordGroup(base.data, other.data);
            if (near) {
                members.push(other);
                used.add(j);
            }
        }

        const boats = members.map((m) => m.data).filter(Boolean);
        const latSum = members.reduce((s, m) => s + Number(m.point.lat), 0);
        const lonSum = members.reduce((s, m) => s + Number(m.point.lon), 0);
        groups.push({
            point: { lat: latSum / members.length, lon: lonSum / members.length },
            boats,
            key: groupedMarkerKey(boats, `g-${i}`),
        });
    }

    return groups;
}

/**
 * @param {Array<{point: {lat, lon}, data: object}>} markers
 * @param {{ priceMode: boolean, zoom: number, limit?: number, enterPriceZoom?: number, nearbyMeters?: number }} opts
 */
export function buildMapDisplayMarkers(markers, opts = {}) {
    const {
        priceMode = false,
        zoom = 10,
        limit = 0,
        enterPriceZoom = 13,
        nearbyMeters = 100,
    } = opts;

    if (!Array.isArray(markers) || !markers.length) return [];

    const radius = priceMode
        ? nearbyMeters
        : clusterRadiusForZoom(zoom, { enterPriceZoom, nearbyMeters });

    let items = groupMarkersByProximity(markers, radius);
    if (limit > 0 && priceMode && items.length > limit) {
        items = items.slice(0, limit);
    }
    return items;
}

/** Плоский список { point, data } для поиска соседних катеров по тапу. */
export function flattenDisplayMarkers(items) {
    const flat = [];
    for (const item of items || []) {
        for (const boat of item.boats || []) {
            if (boat) flat.push({ point: item.point, data: boat });
        }
    }
    return flat;
}
