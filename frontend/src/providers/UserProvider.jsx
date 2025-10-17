import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import UserContext from "../contexts/UserContext";
import { API_URL } from '../utils/api_url';

function UserProvider({ children }) {
    const [users, setUsers] = useState([]);
    const [loggedInUser, setLoggedInUser] = useState(null);


    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const response = await axios.get(`${API_URL}/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    } 

    const value = useMemo(() => ({
        users,
        setUsers,
        loggedInUser,
        setLoggedInUser
    }), [users, setUsers]);

return (
       <UserContext.Provider value={value}>
            {children}
       </UserContext.Provider>
    );
}

export default UserProvider;