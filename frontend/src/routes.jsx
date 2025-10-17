import App from "./App";
import CategoriesComp from "./components/CategoriesComp";
import RecipesComp from "./components/RecipesComp";
import Home from "./pages/Home";

// import RelationshipGenerator from "./components/RelationshipGenerator";


const routes = [
    { path: "/", element: <App />, children: [
        {index: true, element: <Home />},
        {path: 'categories', element: <CategoriesComp />},
        {path: 'recipes', element: <RecipesComp />}
 
    ]}
]

export default routes