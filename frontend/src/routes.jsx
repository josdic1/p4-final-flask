import App from "./App";

const routes = [
    { path: "/", element: <App />, children: [
        {index: true, element: <p>'Welcome to element'</p>}
    ]}
]

export default routes