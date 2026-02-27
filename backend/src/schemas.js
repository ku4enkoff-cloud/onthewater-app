const { z } = require('zod');

const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Некорректный email'),
        phone: z.string().min(10, 'Телефон слишком короткий').max(20, 'Телефон слишком длинный'),
        password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
        name: z.string().min(2, 'Имя слишком короткое').max(100),
        role: z.enum(['client', 'owner']).optional().default('client'),
    })
});

const loginSchema = z.object({
    body: z.object({
        login: z.string().min(1, 'Логин (email или телефон) обязателен'),
        password: z.string().min(1, 'Пароль обязателен'),
    })
});

const boatCreateSchema = z.object({
    body: z.object({
        title: z.string().min(3),
        description: z.string().min(10),
        year: z.coerce.number().int().min(1950).max(new Date().getFullYear()),
        length_m: z.coerce.number().positive(),
        capacity: z.coerce.number().int().positive(),
        location_city: z.string().min(2),
        location_address: z.string().min(5),
        lat: z.coerce.number().min(-90).max(90),
        lng: z.coerce.number().min(-180).max(180),
        price_per_hour: z.coerce.number().positive(),
        price_per_day: z.coerce.number().positive().optional(),
        captain_included: z.boolean().or(z.string().transform(v => v === 'true')).default(false),
        has_captain_option: z.boolean().or(z.string().transform(v => v === 'true')).default(false),
        rules: z.string().optional(),
        type_id: z.coerce.number().int().positive(),
    })
});

const boatSearchSchema = z.object({
    query: z.object({
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().optional().default(50), // В километрах
        city: z.string().optional(),
        type_id: z.coerce.number().optional(),
        min_price: z.coerce.number().optional(),
        max_price: z.coerce.number().optional(),
        capacity: z.coerce.number().optional(),
        limit: z.coerce.number().default(20),
        offset: z.coerce.number().default(0),
    })
});

module.exports = {
    registerSchema,
    loginSchema,
    boatCreateSchema,
    boatSearchSchema,
};
