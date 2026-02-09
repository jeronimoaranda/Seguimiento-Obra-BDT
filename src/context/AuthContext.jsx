import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    onAuthStateChanged, signInWithCustomToken, signOut 
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, currentAppId } from "../services/firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [access, setAccess] = useState({ 
        role: 'viewer', 
        canEdit: false, 
        canManageUsers: false,
        tabs: ['dashboard', 'systems', 'quantities'] 
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Soporte para token custom inicial (si aplica)
        const initAuth = async () => {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                try { await signInWithCustomToken(auth, __initial_auth_token); } 
                catch (e) { console.warn("Custom token fail", e); }
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const email = u.email ? u.email.toLowerCase() : '';
                
                // Roles
                if (email.startsWith('admin@')) {
                    setAccess({
                        role: 'admin', canEdit: true, canManageUsers: true,
                        tabs: ['dashboard', 'systems', 'quantities']
                    });
                } else {
                    try {
                        const rolesRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'config', 'roles_v2');
                        const docSnap = await getDoc(rolesRef);
                        
                        let userConfig = null;
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            if (data.users && data.users[email]) userConfig = data.users[email];
                            else if (data.admins && data.admins.includes(email)) 
                                userConfig = { role: 'admin', tabs: ['dashboard', 'systems', 'quantities'] };
                        }

                        if (userConfig) {
                            setAccess({
                                role: userConfig.role,
                                canEdit: userConfig.role === 'admin',
                                canManageUsers: false,
                                tabs: userConfig.tabs || ['dashboard', 'systems', 'quantities']
                            });
                        } else {
                            // Default Viewer
                            setAccess({
                                role: 'viewer', canEdit: false, canManageUsers: false,
                                tabs: ['dashboard', 'systems', 'quantities']
                            });
                        }
                    } catch (e) {
                        console.warn("Error loading roles", e);
                        setAccess({ role: 'viewer', canEdit: false, canManageUsers: false, tabs: ['dashboard', 'systems', 'quantities'] });
                    }
                }
            } else {
                setAccess({ role: 'viewer', canEdit: false, canManageUsers: false, tabs: [] });
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email, password, isRegistering) => {
        if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
        else await signInWithEmailAndPassword(auth, email, password);
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, access, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};