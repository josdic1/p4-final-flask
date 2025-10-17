import { useContext } from "react"
import RecipeContext from "../contexts/RecipeContext"

function RecipesComp() {
    const { recipes } = useContext(RecipeContext)

    

return (
<>
<table border="1">
    <thead>
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>category_id</th>
             <th>user_id</th>
        </tr>
    </thead>
    <tbody>
        {recipes.map(r => (
            <tr key={r.id}>
                <td>{r.id}</td>
                 <td>{r.name}</td>
               <td>{r.category_id}</td>
                <td>{r.user_id}</td>
            </tr>
        ))}
    </tbody>
</table>

</>
)}

export default RecipesComp
