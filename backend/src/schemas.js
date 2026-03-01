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
    }),
});

module.exports = {
    loginSchema,
    registerSchema,
};
