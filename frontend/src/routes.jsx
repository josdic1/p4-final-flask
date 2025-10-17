import App from "./App";
import RelationshipGenerator from "./components/RelationshipGenerator";


const routes = [
    { path: "/", element: <App />, children: [
        {index: true, element: <RelationshipGenerator />},
 
    ]}
]

export default routes