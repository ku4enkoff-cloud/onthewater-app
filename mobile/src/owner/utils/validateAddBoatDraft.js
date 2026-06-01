/**
 * Проверка черновика «Добавить катер» перед отправкой на сервер.
 * @returns {{ valid: boolean, errors: Array<{ step: string, field: string, message: string }> }}
 */
export function validateAddBoatDraft({
    boatType,
    boatInfo,
    boatLocation,
    boatSchedule,
    boatMedia,
    title,
    description,
}) {
    const errors = [];
    const add = (step, field, message) => errors.push({ step, field, message });

    if (!boatType?.id && !boatType?.name) {
        add('BoatType', 'type', 'Выберите тип судна');
    }

    if (!boatInfo?.manufacturer?.trim()) {
        add('BoatInfo', 'manufacturer', 'Укажите производителя');
    }
    if (!boatInfo?.model?.trim()) {
        add('BoatInfo', 'model', 'Укажите модель');
    }
    if (!boatInfo?.year?.trim()) {
        add('BoatInfo', 'year', 'Укажите год выпуска');
    }
    if (!boatInfo?.capacity?.trim()) {
        add('BoatInfo', 'capacity', 'Укажите вместимость');
    } else {
        const cap = Number(boatInfo.capacity);
        if (!Number.isFinite(cap) || cap < 1) {
            add('BoatInfo', 'capacity', 'Вместимость должна быть не меньше 1');
        }
    }

    const lat = boatLocation?.lat;
    const lng = boatLocation?.lng;
    if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        add('BoatLocation', 'map', 'Укажите место стоянки на карте');
    }

    const workDates = boatSchedule?.workDates;
    const hasDates = Array.isArray(workDates) && workDates.length > 0;
    if (!hasDates) {
        add('BoatSchedule', 'workDates', 'Выберите хотя бы один рабочий день');
    }

    const priceRaw = boatSchedule?.pricePerMinDuration;
    const price = Number(String(priceRaw ?? '').replace(/\s/g, ''));
    if (!String(priceRaw ?? '').trim() || !Number.isFinite(price) || price <= 0) {
        add('BoatSchedule', 'pricePerHour', 'Укажите цену за минимальную длительность');
    }

    const photos = boatMedia?.photos;
    if (!Array.isArray(photos) || photos.length === 0) {
        add('BoatMedia', 'photos', 'Добавьте хотя бы одну фотографию');
    }

    const titleTrim = String(title ?? '').trim();
    if (!titleTrim) {
        add('AddBoat', 'title', 'Введите название объявления');
    }
    const descTrim = String(description ?? '').trim();
    if (!descTrim) {
        add('AddBoat', 'description', 'Введите описание катера');
    } else if (descTrim.length < 20) {
        add('AddBoat', 'description', 'Описание слишком короткое (минимум 20 символов)');
    }

    return { valid: errors.length === 0, errors };
}

export function errorsForStep(errors, step) {
    const map = {};
    for (const e of errors) {
        if (e.step === step) map[e.field] = e.message;
    }
    return map;
}

export const ADD_BOAT_STEP_LABELS = {
    BoatType: 'Тип судна',
    BoatInfo: 'О катере',
    BoatLocation: 'Местоположение',
    BoatSchedule: 'Расписание и цены',
    BoatMedia: 'Фото и видео',
    AddBoat: 'Описание объявления',
};
