import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, writeBatch, collection, doc, getDocs, query } from "firebase/firestore";
// Importamos Utils correctamente desde su nueva ubicación
import { Utils } from "../utils/helpers";

// Definimos APP_CONFIG aquí por si acaso falla la importación, para asegurar robustez
const APP_CONFIG = {
    CHUNK_SIZE: 800000,
    DEFAULT_APP_ID: "tablero-de-control---obra",
};

// Configuración por defecto (Hardcoded para asegurar funcionamiento inmediato)
const hardcodedConfig = {
    apiKey: "AIzaSyCon3w6IFtCGpwPi25e8dwFRU_R0CzQmjc",
    authDomain: "tablero-de-control---obra.firebaseapp.com",
    projectId: "tablero-de-control---obra",
    storageBucket: "tablero-de-control---obra.firebasestorage.app",
    messagingSenderId: "838434221051",
    appId: "1:838434221051:web:0c599f2734f613c7c6f95e",
};

// Intentar leer de variables de entorno de Vite
const envConfig = (import.meta.env && import.meta.env.VITE_API_KEY) ? {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
} : null;

// Selección final de configuración
let finalConfig = envConfig || hardcodedConfig;
if (!envConfig && typeof __firebase_config !== 'undefined') {
    try {
        finalConfig = JSON.parse(__firebase_config);
    } catch (e) {
        console.error("Error parsing __firebase_config", e);
    }
}

// Inicialización de Firebase
const app = initializeApp(finalConfig);

// Inicialización de App ID
let rawAppId = APP_CONFIG.DEFAULT_APP_ID;
if (typeof __app_id !== 'undefined') {
    rawAppId = __app_id;
}
// Asegurar que exportamos currentAppId
export const currentAppId = rawAppId.replace(/[/\.]/g, '_');

// Exportaciones de Servicios - ESTO ES LO QUE BUSCABA EL ERROR
export const auth = getAuth(app);
export const db = getFirestore(app);
export const isConfigured = true;

// Helpers de BD (Dependen de Utils que ahora está importado correctamente)
export const FirebaseHelpers = {
    saveLargeData: async (collectionName, dataString) => {
        const chunks = Utils.chunkString(dataString, APP_CONFIG.CHUNK_SIZE);
        const batch = writeBatch(db);
        const colRef = collection(db, 'artifacts', currentAppId, 'public', 'data', collectionName);
        chunks.forEach((chunk, index) => {
            const docRef = doc(colRef, index.toString());
            batch.set(docRef, { data: chunk });
        });
        await batch.commit();
        return chunks.length;
    },

    fetchLargeData: async (collectionName, totalChunks) => {
        if (!totalChunks || totalChunks === 0) return [];
        const colRef = collection(db, 'artifacts', currentAppId, 'public', 'data', collectionName);
        const q = query(colRef); 
        const querySnapshot = await getDocs(q);
        const chunks = [];
        querySnapshot.forEach((doc) => {
            const idx = parseInt(doc.id);
            if (!isNaN(idx) && idx < totalChunks) chunks[idx] = doc.data().data;
        });
        
        try {
            const joined = chunks.join("");
            if (!joined) return [];
            return JSON.parse(joined);
        } catch (e) {
            console.error("JSON Parse Error/Data Corruption:", e);
            return [];
        }
    }
};