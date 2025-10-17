import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import RecipeContext from "../contexts/RecipeContext";
import { API_URL } from '../utils/api_url';

function RecipeProvider({ children }) {
    const [recipes, setRecipes] = useState([]);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    useEffect(() => {
        fetchRecipes();
    }, []);

    async function fetchRecipes() {
        try {
            const response = await axios.get(`${API_URL}/recipes`);
            setRecipes(response.data);
        } catch (error) {
            console.error('Error fetching recipes:', error);
        }
    } // <-- Correctly has one closing brace now

    const value = useMemo(() => ({
        recipes,
        setRecipes,
        selectedRecipe,
        setSelectedRecipe
    }), [recipes, selectedRecipe]);

return (
       <RecipeContext.Provider value={value}>
            {children}
       </RecipeContext.Provider>
    );
}

export default RecipeProvider;