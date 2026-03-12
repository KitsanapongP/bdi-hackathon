import type { FastifyPluginAsync } from 'fastify';
import {
    handleRegister,
    handleRegisterVerify,
    handleRegisterResend,
    handleLogin,
    handleMe,
    handleLogout,
} from './auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post('/register', handleRegister);
    app.post('/register/verify', handleRegisterVerify);
    app.post('/register/resend', handleRegisterResend);
    app.post('/login', handleLogin);
    app.get('/me', handleMe);
    app.post('/logout', handleLogout);
};
