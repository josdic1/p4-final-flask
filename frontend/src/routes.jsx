import App from "./App";
import Home from "./pages/Home";
// import RelationshipGenerator from "./components/RelationshipGenerator";


const routes = [
    { path: "/", element: <App />, children: [
        {index: true, element: <Home />},
 
    ]}
]

export default routes