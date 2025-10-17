import { Outlet } from 'react-router-dom'
import UserProvider from './providers/UserProvider.jsx'
import CategoryProvider from './providers/CategoryProvider.jsx'
import RecipeProvider from './providers/RecipeProvider.jsx'
import Navbar from './components/NavBar.jsx'
import './App.css'

function App() {

  return (
    <>
    <UserProvider>
      <RecipeProvider>
        <CategoryProvider>
      <header>
       <Navbar/>
      </header>
      <main>
       <Outlet />
      </main>
      </CategoryProvider>
      </RecipeProvider>
      </UserProvider>
    </>
  )
}

export default App
