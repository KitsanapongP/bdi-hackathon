import type { FastifyPluginAsync } from 'fastify';
import { handleRegister, handleLogin, handleMe, handleLogout } from './auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post('/register', handleRegister);
    app.post('/login', handleLogin);
    app.get('/me', handleMe);
    app.post('/logout', handleLogout);
};
