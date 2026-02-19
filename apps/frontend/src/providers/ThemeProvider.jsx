import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: () => { },
});

const STORAGE_KEY = 'theme';

const getSystemTheme = () => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export function ThemeProvider({ children, defaultTheme = 'system' }) {
    const [theme, setThemeState] = useState(() => {
        if (typeof window === 'undefined') return defaultTheme;
        return localStorage.getItem(STORAGE_KEY) || defaultTheme;
    });

    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        root.classList.toggle('dark', resolvedTheme === 'dark');
    }, [resolvedTheme]);

    useEffect(() => {
        if (typeof window === 'undefined' || theme !== 'system') return;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
            const root = document.documentElement;
            root.classList.toggle('dark', media.matches);
        };

        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [theme]);

    const setTheme = (nextTheme) => {
        setThemeState(nextTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, nextTheme);
        }
    };

    const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
