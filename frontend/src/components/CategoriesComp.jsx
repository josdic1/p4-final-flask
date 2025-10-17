import { useContext } from "react"
import CategoryContext from "../contexts/CategoryContext"

function CategoriesComp() {
    const { categories } = useContext(CategoryContext)

return (
<>
<table border="1">
    <thead>
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>View Recipes</th>
        </tr>
    </thead>
    <tbody>
        {categories.map(c => (
            <tr key={c.id}>
                <td>{c.id}</td>
                 <td>{c.name}</td>
                <td>
                    <button type='button'>Click</button>
                </td>
            </tr>
        ))}
    </tbody>
</table>

</>
)}

export default CategoriesComp
