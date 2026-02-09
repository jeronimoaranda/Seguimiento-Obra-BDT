import { useState, useEffect } from 'react';
import { doc, onSnapshot, writeBatch, collection, query, getDocs, setDoc } from "firebase/firestore";
import { chunkString, CHUNK_SIZE } from '../utils/helpers';

// Servicios auxiliares internos para este hook
const saveLargeData = async (db, appId, collectionName, dataString) => {
    const chunks = chunkString(dataString, CHUNK_SIZE);
    const batch = writeBatch(db);
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    chunks.forEach((chunk, index) => {
        const docRef = doc(colRef, index.toString());
        batch.set(docRef, { data: chunk });
    });
    await batch.commit();
    return chunks.length;
};

const fetchLargeData = async (db, appId, collectionName, totalChunks) => {
    if (!totalChunks || totalChunks === 0) return [];
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', collectionName);
    const q = query(colRef); 
    const querySnapshot = await getDocs(q);
    const chunks = [];
    querySnapshot.forEach((doc) => {
        const idx = parseInt(doc.id);
        if (!isNaN(idx) && idx < totalChunks) chunks[idx] = doc.data().data;
    });
    return JSON.parse(chunks.join(""));
};

export const useObraData = (firebaseInstance, user) => {
    const [matrix, setMatrix] = useState([]);
    const [registry, setRegistry] = useState([]);
    const [edits, setEdits] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !firebaseInstance.db || !firebaseInstance.isConfigured) return;
        setLoading(true);
        setError('');
        const docRef = doc(firebaseInstance.db, 'artifacts', firebaseInstance.appId, 'public', 'data', 'app_metadata', 'main');
        
        const unsub = onSnapshot(docRef, async (snap) => {
            if (snap.exists()) {
                const meta = snap.data();
                if (meta.edits) setEdits(JSON.parse(meta.edits));
                try {
                    if (meta.matrixChunkCount > 0) {
                        const mData = await fetchLargeData(firebaseInstance.db, firebaseInstance.appId, 'matrix_chunks', meta.matrixChunkCount);
                        setMatrix(mData);
                    } else setMatrix([]);
                    if (meta.registryChunkCount > 0) {
                        const rData = await fetchLargeData(firebaseInstance.db, firebaseInstance.appId, 'registry_chunks', meta.registryChunkCount);
                        setRegistry(rData);
                    } else setRegistry([]);
                } catch (e) {
                    console.error("Data Fetch Error", e);
                    setError('Error recuperando datos fragmentados.');
                }
            } else {
                setMatrix([]); setRegistry([]); setEdits({});
            }
            setLoading(false);
        }, (err) => {
            console.error("Snapshot Error", err);
            setLoading(false);
            setError(err.code === 'permission-denied' ? 'Sin permisos de acceso.' : err.message);
        });
        return () => unsub();
    }, [user, firebaseInstance]);

    const saveData = async (newMatrix, newReg, newEdits, currentUserEmail) => {
        if (!firebaseInstance.db) return;
        setSaving(true);
        try {
            const finalMatrix = newMatrix || matrix;
            const finalReg = newReg || registry;
            const finalEdits = newEdits || edits;
            let mCount = 0, rCount = 0;
            if (newMatrix) mCount = await saveLargeData(firebaseInstance.db, firebaseInstance.appId, 'matrix_chunks', JSON.stringify(finalMatrix));
            if (newReg) rCount = await saveLargeData(firebaseInstance.db, firebaseInstance.appId, 'registry_chunks', JSON.stringify(finalReg));
            
            const docRef = doc(firebaseInstance.db, 'artifacts', firebaseInstance.appId, 'public', 'data', 'app_metadata', 'main');
            const payload = {
                edits: JSON.stringify(finalEdits),
                lastUpdated: new Date().toISOString(),
                updatedBy: currentUserEmail
            };
            if (newMatrix) payload.matrixChunkCount = mCount;
            if (newReg) payload.registryChunkCount = rCount;
            await setDoc(docRef, payload, { merge: true });
        } catch (e) {
            alert("Error al guardar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return { matrix, registry, edits, loading, error, saving, saveData, setMatrix, setRegistry, setEdits };
};