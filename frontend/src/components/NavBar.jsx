import { NavLink } from "react-router-dom";

function NavBar() {

return (
<>
<nav>
    <NavLink to="/">Home</NavLink>
    <NavLink to="/recipes">Recipes</NavLink>
    <NavLink to="/categories">Categories</NavLink>
</nav>
</>
)}

export default NavBar
