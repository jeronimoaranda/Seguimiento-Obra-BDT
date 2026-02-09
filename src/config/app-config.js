// Configuración global de la aplicación
export const APP_CONFIG = {
    CHUNK_SIZE: 800000,
    DEFAULT_APP_ID: "tablero-de-control---obra",
    COLORS: { 
        blue: "#3b82f6", green: "#10b981", orange: "#f97316", red: "#ef4444", 
        yellow: "#eab308", purple: "#a855f7", indigo: "#6366f1", gray: "#64748b", 
        teal: "#14b8a6", pink: "#db2777", cyan: "#06b6d4" 
    },
    DEFAULT_PAGE_SIZE: 50
};

export const COLORS_LIST = Object.values(APP_CONFIG.COLORS);