import { useState, useEffect, useMemo } from 'react';
import CategoryContext from "../contexts/CategoryContext";
import { getCategories } from '../services/api';  // Import the service function

function CategoryProvider({ children }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            setLoading(true);
            const response = await getCategories();  // Use your service function
            setCategories(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    } 

    const value = useMemo(() => ({
        categories,
        setCategories,
        loading,
        error,
        refetch: fetchCategories  // Allow manual refetch
    }), [categories, loading, error]);

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
}

export default CategoryProvider;