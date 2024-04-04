import React, { useState, createContext, useEffect, useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import Header from "./layouts/Header";
import Sidebar from "./layouts/Sidebar";
import axios from 'axios'; // Importar axios
import VentasList from "./components/VentasList";
import CrearVenta from "./components/CrearVenta";
import EditarVenta from "./components/EditarVenta";
import Login from "./components/Login";
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "./App.css";
import ComprasList from "./components/ComprasList";

export const AuthContext = createContext(null);

// Definición del hook useAuth
export const useAuth = () => useContext(AuthContext);

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Verificar el token al cargar la aplicación
  useEffect(() => {
    const verifyToken = async () => {
      try {
        await axios.get('http://localhost:8000/api/verify_token/', {
          headers: { Authorization: `Token ${token}` }
        });
        // Si el token es válido, no hay necesidad de actualizar nada
      } catch (error) {
        // Si el token no es válido, actualizar el estado y localStorage
        setToken(null);
        localStorage.removeItem("token");
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const isAuthenticated = () => !!token;

  const updateToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout/', {}, {
        headers: { Authorization: `Token ${token}` }
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    setToken(null);
    localStorage.removeItem("token");
    window.location.href = "/login";
  };


  const handleLogout = () => {
    logout();
  };
  
  return (
    <AuthContext.Provider value={{ token, updateToken, isAuthenticated }}>
      <Router>
        {isAuthenticated() && (
          <>
            <Sidebar />
            <Header onLogout={handleLogout} />
          </>
        )}
        <div className="content">
          <Routes>
            <Route path="/" element={isAuthenticated() ? <VentasList /> : <Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verVentas" element={isAuthenticated() ? <VentasList /> : <Navigate to="/login" />} />
            <Route path="/crearVenta" element={isAuthenticated() ? <CrearVenta /> : <Navigate to="/login" />} />
            <Route path="/editarVenta/:id" element={isAuthenticated() ? <EditarVenta /> : <Navigate to="/login" />} />
            <Route path="/verCompras" element={isAuthenticated() ? <ComprasList /> : <Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;