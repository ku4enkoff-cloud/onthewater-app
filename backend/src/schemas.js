const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        email: z.string().optional(),
        login: z.string().optional(),
        password: z.string().min(1, 'Пароль обязателен'),
    }).refine((d) => d.email || d.login, { message: 'Укажите email или логин' }),
});

const registerSchema = z.object({
    body: z.object({
        email: z.string().email('Некорректный email'),
        password: z.string().min(3, 'Пароль минимум 3 символа'),
        name: z.string().optional().default(''),
        phone: z.string().optional().default(''),
        role: z.enum(['client', 'owner']).optional().default('client'),
        accept_terms: z.boolean().optional(),
    }),
});

const reportContentSchema = z.object({
    body: z.object({
        reported_user_id: z.number().int().positive(),
        content_type: z.enum(['message', 'user', 'review']),
        content_id: z.number().int().positive().optional().nullable(),
        reason: z.enum(['spam', 'harassment', 'fraud', 'other', 'user_blocked']),
        details: z.string().max(2000).optional().nullable(),
    }),
});

const requestPasswordResetSchema = z.object({
    body: z.object({
        email: z.string().email('Некорректный email'),
    }),
});

const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(8, 'Некорректный токен'),
        new_password: z.string().min(3, 'Пароль минимум 3 символа'),
    }),
});

module.exports = {
    loginSchema,
    registerSchema,
    reportContentSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
};
