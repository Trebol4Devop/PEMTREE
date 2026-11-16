import { useState, useCallback } from 'react';

const DURATION = 3000;

export function useToast() {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'error') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), DURATION);
    }, [removeToast]);

    return { toasts, addToast, removeToast };
}
