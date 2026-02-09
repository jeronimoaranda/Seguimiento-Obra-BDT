import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const APP_CONFIG = {
    DEFAULT_APP_ID: "tablero-de-control---obra",
};

export const initFirebase = () => {
    try {
        const hardcodedConfig = {
            apiKey: "AIzaSyCon3w6IFtCGpwPi25e8dwFRU_R0CzQmjc",
            authDomain: "tablero-de-control---obra.firebaseapp.com",
            projectId: "tablero-de-control---obra",
            storageBucket: "tablero-de-control---obra.firebasestorage.app",
            messagingSenderId: "838434221051",
            appId: "1:838434221051:web:0c599f2734f613c7c6f95e",
        };

        const envConfig = import.meta.env?.VITE_API_KEY ? {
            apiKey: import.meta.env.VITE_API_KEY,
            authDomain: import.meta.env.VITE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_APP_ID
        } : null;

        const finalConfig = envConfig || hardcodedConfig;
        const app = initializeApp(finalConfig);
        
        return { 
            auth: getAuth(app), 
            db: getFirestore(app), 
            appId: APP_CONFIG.DEFAULT_APP_ID,
            isConfigured: true 
        };
    } catch (e) {
        console.error("Firebase Init Error:", e);
        return { isConfigured: false };
    }
};