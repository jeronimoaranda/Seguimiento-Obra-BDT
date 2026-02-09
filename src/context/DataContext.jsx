import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, currentAppId, FirebaseHelpers } from "../services/firebase";
import { useAuth } from "./AuthContext";

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [matrix, setMatrix] = useState([]);
    const [registry, setRegistry] = useState([]);
    const [quantities, setQuantities] = useState([]);
    const [edits, setEdits] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user || !db) return;
        setLoading(true);
        setError('');
        
        const docRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'app_metadata', 'main');
        
        const unsub = onSnapshot(docRef, async (snap) => {
            if (snap.exists()) {
                const meta = snap.data();
                if (meta.edits) setEdits(JSON.parse(meta.edits));

                try {
                    if (meta.matrixChunkCount > 0) {
                        const mData = await FirebaseHelpers.fetchLargeData('matrix_chunks', meta.matrixChunkCount);
                        setMatrix(mData || []);
                    }
                    if (meta.registryChunkCount > 0) {
                        const rData = await FirebaseHelpers.fetchLargeData('registry_chunks', meta.registryChunkCount);
                        setRegistry(rData || []);
                    }
                    if (meta.quantitiesChunkCount > 0) {
                        const qData = await FirebaseHelpers.fetchLargeData('quantities_chunks', meta.quantitiesChunkCount);
                        setQuantities(qData || []);
                    }
                } catch (e) {
                    console.error("Data Fetch Error", e);
                    setError('Error recuperando datos fragmentados.');
                }
            } else {
                setMatrix([]); setRegistry([]); setQuantities([]); setEdits({});
            }
            setLoading(false);
        }, (err) => {
            setLoading(false);
            if (err.code !== 'permission-denied') setError(err.message);
        });

        return () => unsub();
    }, [user]);

    const saveData = async (newMatrix, newReg, newEdits, newQuantities, currentUserEmail) => {
        if (!db) return;
        setSaving(true);
        try {
            const finalMatrix = newMatrix || matrix;
            const finalReg = newReg || registry;
            const finalEdits = newEdits || edits;
            const finalQuantities = newQuantities || quantities;

            let mCount = 0, rCount = 0, qCount = 0;
            
            if (newMatrix) mCount = await FirebaseHelpers.saveLargeData('matrix_chunks', JSON.stringify(finalMatrix));
            if (newReg) rCount = await FirebaseHelpers.saveLargeData('registry_chunks', JSON.stringify(finalReg));
            if (newQuantities) qCount = await FirebaseHelpers.saveLargeData('quantities_chunks', JSON.stringify(finalQuantities));

            const docRef = doc(db, 'artifacts', currentAppId, 'public', 'data', 'app_metadata', 'main');
            
            const payload = {
                edits: JSON.stringify(finalEdits),
                lastUpdated: new Date().toISOString(),
                updatedBy: currentUserEmail
            };

            if (newMatrix) payload.matrixChunkCount = mCount;
            if (newReg) payload.registryChunkCount = rCount;
            if (newQuantities) payload.quantitiesChunkCount = qCount;

            await setDoc(docRef, payload, { merge: true });
        } catch (e) {
            alert("Error al guardar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <DataContext.Provider value={{ 
            matrix, registry, quantities, edits, 
            loading, error, saving, saveData, 
            setMatrix, setRegistry, setEdits, setQuantities 
        }}>
            {children}
        </DataContext.Provider>
    );
};