import React, { useState, useContext } from 'react';
import axiosInstance from './axios'; 
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App'; 
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Password } from 'primereact/password';
import { Card } from 'primereact/card';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.css';
import 'primeicons/primeicons.css';
import '../styles/login.css';

function Login() {
    const { updateToken } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axiosInstance.post('http://localhost:8000/api/login/', { username, password });
            updateToken(response.data.token);
            navigate('/verVentas');
        } catch (error) {
            console.error('Error de inicio de sesión', error);
            setError('Nombre de usuario o contraseña incorrectos');
        }
    };

    return (
        <div className="container">
            <Card>
                <form onSubmit={handleSubmit} className="login-form">
                    <h2>Iniciar Sesión</h2>
                    <span className="p-float-label input-wrapper">
                        <InputText
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <label htmlFor="username">Nombre de Usuario</label>
                    </span>
                    <span className="p-float-label input-wrapper">
                        <Password
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            toggleMask
                        />
                        <label htmlFor="password">Contraseña</label>
                    </span>
                    {error && <div className="error-message">{error}</div>}
                    <Button type="submit" label="Iniciar Sesión" className="login-button" />
                </form>
            </Card>
        </div>
    );
}


export default Login;
