import React from 'react';
import { Button } from 'primereact/button';
import "../styles/header.css";

function Header({ onToggleSidebar, onLogout }) {
    return (
        <div className="header">
            <div className="header-logo">DIAJO SAC</div>
            <Button icon="pi pi-sign-out" onClick={onLogout} className="cerrar p-button-rounded p-button-danger" />
        </div>
    );
}

export default Header;
