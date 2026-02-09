import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

export const useAuth = (firebaseInstance) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firebaseInstance.auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(firebaseInstance.auth, (u) => {
            setUser(u);
            if (u && u.email && u.email.toLowerCase().startsWith('admin')) {
                setRole('admin');
            } else {
                setRole('viewer');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [firebaseInstance.auth]);

    const login = async (email, password, isRegistering) => {
        if (isRegistering) await createUserWithEmailAndPassword(firebaseInstance.auth, email, password);
        else await signInWithEmailAndPassword(firebaseInstance.auth, email, password);
    };

    const logout = () => signOut(firebaseInstance.auth);

    return { user, role, loading, login, logout };
};