import type { FastifyPluginAsync } from 'fastify';
import {
    handleRegister,
    handleRegisterVerify,
    handleRegisterVerifyLink,
    handleRegisterResend,
    handleForgotPassword,
    handleResetPassword,
    handleLogin,
    handleMe,
    handleLogout,
} from './auth.controller.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post('/register', handleRegister);
    app.post('/register/verify', handleRegisterVerify);
    app.post('/register/verify-link', handleRegisterVerifyLink);
    app.post('/register/resend', handleRegisterResend);
    app.post('/forgot-password', handleForgotPassword);
    app.post('/reset-password', handleResetPassword);
    app.post('/login', handleLogin);
    app.get('/me', handleMe);
    app.post('/logout', handleLogout);
};
