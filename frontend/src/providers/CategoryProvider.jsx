import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CategoryContext from "../contexts/CategoryContext";
import { API_URL } from '../utils/api_url';

function CategoryProvider({ children }) {
    const [categories, setCategories] = useState([]);



    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        try {
            const response = await axios.get(`${API_URL}/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    } 

    const value = useMemo(() => ({
        categories,
        setCategories
    }), [categories, setCategories]);

return (
       <CategoryContext.Provider value={value}>
            {children}
       </CategoryContext.Provider>
    );
}

export default CategoryProvider;