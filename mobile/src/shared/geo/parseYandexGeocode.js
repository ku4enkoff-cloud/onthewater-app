/**
 * Разбор ответа Search.geocodePoint (react-native-yamap-plus / MapKit).
 * @param {{ formatted?: string, Components?: Array<{ kind: string|number, name: string }>, country_code?: string }>|null|undefined} geo
 */
export function parseYandexGeocodeResult(geo) {
    if (!geo) {
        return { country: '', region: '', city: '', address: '' };
    }

    const components = Array.isArray(geo.Components) ? geo.Components : [];
    let country = '';
    let region = '';
    let city = '';
    let street = '';
    let house = '';

    for (const c of components) {
        const k = String(c.kind);
        const n = String(c.name || '').trim();
        if (!n) continue;
        if (k === '1') country = n;
        else if (k === '3' && !region) region = n;
        else if (k === '4' && !region) region = n;
        else if ((k === '5' || k === '6' || k === '7' || k === 'locality') && !city) city = n;
        else if (k === '8' || k === 'street') street = n;
        else if (k === '9' || k === 'house') house = n;
    }

    const formatted = String(geo.formatted || '').trim();
    if (formatted) {
        const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
        if (!country && parts[0]) country = parts[0];
        if (!region && parts[1]) region = parts[1];
        if (!city && parts[2]) city = parts[2];
        if (!street && parts.length > 3) {
            street = parts.slice(3).join(', ');
        }
    }

    let address = street;
    if (house) address = address ? `${address}, ${house}` : house;

    return {
        country,
        region,
        city,
        address,
    };
}
