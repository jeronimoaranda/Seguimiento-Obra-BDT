import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
// Importa el componente SegCantView original o pégalo aquí
// El código original ya tenía SegCantView bastante aislado, 
// así que puedes moverlo directamente a este archivo.

// Importante: En el código original, SegCantView recibía props.
// Ahora puede usar useData() directamente o seguir recibiendo props desde este wrapper.

import SegCantViewOriginal from './components/SegCantView'; // Asumiendo que mueves el componente

const QuantitiesModule = () => {
    const { quantities, saveData } = useData();
    const { user, access } = useAuth();

    return (
        <SegCantViewOriginal 
            quantities={quantities} 
            saveData={saveData} 
            currentUserEmail={user?.email} 
            canEdit={access.canEdit} 
        />
    );
};

export default QuantitiesModule;