// Funciones de utilidad pura (sin estado de React)
export const Utils = {
    cleanStr: (str) => (!str ? "" : str.toString().trim()),
    
    safeParseInt: (val) => { 
        const p = parseInt(Utils.cleanStr(val), 10); 
        return isNaN(p) ? 0 : p; 
    },
    
    chunkString: (str, length) => {
        const size = Math.ceil(str.length / length);
        const r = Array(size);
        let offset = 0;
        for (let i = 0; i < size; i++) {
            r[i] = str.substr(offset, length);
            offset += length;
        }
        return r;
    },
    
    normalizeDate: (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return "";
        const clean = dateStr.trim();
        const match = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
        if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;
        return ""; 
    },

    parseCSVLine: (text, delimiter) => {
        const result = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === delimiter && !inQuote) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    },

    normalizeText: (text) => text ? text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "",
    
    isLineaBase: (text) => Utils.normalizeText(text).includes("linea base"),
    
    isAvanceReal: (text) => {
        const t = Utils.normalizeText(text);
        return t.includes("avance real") || t.includes("curva real");
    },

    parseNumber: (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        let str = val.toString().trim();
        if (str === '') return 0;
        if (str.includes('.') && str.includes(',')) {
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.'); 
            else str = str.replace(/,/g, ''); 
        } else if (str.includes(',')) str = str.replace(',', '.'); 
        return parseFloat(str) || 0;
    },

    normalizeDateHeader: (dateStr) => {
        if (!dateStr) return dateStr;
        const cleanStr = dateStr.toString().trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            let [d, m, y] = parts;
            if (y.length === 2) y = '20' + y; 
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
        return cleanStr; 
    },

    detectDelimiter: (text) => text.split('\n')[0].includes(';') ? ';' : ',',
    
    parseSegCantCSV: (text) => {
        const STATIC_COLUMNS = ['curva', 'disciplina', 'actividad', 'alcance', 'actual', 'remanente', 'unidad'];
        const delimiter = Utils.detectDelimiter(text);
        const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return { headers: [], data: [] };

        const rawHeaders = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const headers = rawHeaders.map(h => {
            if (!STATIC_COLUMNS.includes(Utils.normalizeText(h))) return Utils.normalizeDateHeader(h);
            return h;
        });
        
        const data = lines.slice(1).map(line => {
            const values = line.split(delimiter);
            if (values.length < 4) return null; 
            const entry = {};
            headers.forEach((h, i) => {
                const val = values[i] ? values[i].trim().replace(/^"|"$/g, '') : ''; 
                entry[h] = val;
            });
            return entry;
        }).filter(Boolean);
        return { headers, data };
    },

    generateSegCantCSV: (headers, data) => {
        const headerRow = headers.join(',');
        const rows = data.map(row => headers.map(h => row[h] || '').join(','));
        return [headerRow, ...rows].join('\n');
    },

    sortHeaders: (currentHeaders) => {
        const staticPart = [];
        const datePart = [];
        currentHeaders.forEach(h => {
            if (!isNaN(Date.parse(h)) && h.includes('-')) datePart.push(h);
            else staticPart.push(h);
        });
        datePart.sort((a, b) => new Date(a) - new Date(b));
        return [...staticPart, ...datePart];
    }
};