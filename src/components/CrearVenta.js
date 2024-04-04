// CrearVenta.js
import React, { useState, useEffect } from 'react';
import axiosInstance from './axios'; // Importa axiosInstance en lugar de axios directamente
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { AutoComplete } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import '../styles/formventa.css';

function CrearVenta() {
    const toast = useRef(null);
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [valorAutoComplete, setValorAutoComplete] = useState('');
    const [vendedores, setVendedores] = useState([]);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null);
    const [sugerenciasVendedores, setSugerenciasVendedores] = useState([]);
    const [valorAutoCompleteVendedor, setValorAutoCompleteVendedor] = useState('');
    const [venta, setVenta] = useState({
        tipo_documento: '',
        DCTO_N: '',
        MONEDA: '',
        IMPORTE: '',
        PLAZO: '',
        FECHA_EMISION: null,
        RECEP_FT: null,
        FECHA_VENCIMIENTO: null,
        CANCELADO: false,
        vendedor: null,
        cliente: null,
        OBSERVACION: '',
        MODO_PAGO: '',
        COMISIONADO: false,
        NUMERO_OPERACION: '',
        fechaPago: null,
    });

    useEffect(() => {
        axiosInstance.get('http://localhost:8000/api/clientes/')
            .then(response => setClientes(response.data))
            .catch(error => console.error('Error al obtener clientes:', error));
        axiosInstance.get('http://localhost:8000/api/vendedores/')
            .then(response => setVendedores(response.data))
            .catch(error => console.error('Error al obtener vendedores:', error));
    }, []);

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        // Para manejar los checkboxes específicamente
        if (name === 'CANCELADO' || name === 'comisionado') {
            setVenta({ ...venta, [name]: checked });
            // Si se marca como cancelado, establecer la fecha de pago a la fecha actual
            if (name === 'CANCELADO' && checked) {
                setVenta({ ...venta, fechaPago: new Date() });
            }
        } else {
            setVenta({ ...venta, [name]: value });
        }

        if (type === 'checkbox') {
            setVenta({ ...venta, [name]: checked });
        } else {
            setVenta({ ...venta, [name]: value });
        }
    };

    const tipoDocumentoOpciones = [
        { label: 'Factura', value: '1' },
        { label: 'Boleta', value: '2' },
        { label: 'Nota de crédito', value: '3' },
        { label: 'Nota de débito', value: '4' },
        { label: 'Otro', value: '5' }
    ];

    const monedaOpciones = [
        { label: 'Soles', value: 'S/' },
        { label: 'Dólares', value: 'USD' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();

        const formattedDate = date => date ? toUTCString(date) : null;

        const ventaData = {
            ...venta,
            FECHA_EMISION: formattedDate(venta.FECHA_EMISION),
            RECEP_FT: formattedDate(venta.RECEP_FT),
            FECHA_VENCIMIENTO: formattedDate(venta.FECHA_VENCIMIENTO),
            fechaPago: formattedDate(venta.fechaPago),
            cliente: clienteSeleccionado ? clienteSeleccionado.ID_CLIENTE : null,
            vendedor: vendedorSeleccionado ? vendedorSeleccionado.ID_VENDEDOR : null,
            tipo_documento: parseInt(venta.tipo_documento, 10),
            IMPORTE: parseFloat(venta.IMPORTE),
            PLAZO: parseInt(venta.PLAZO, 10),
            cliente: clienteSeleccionado ? clienteSeleccionado.ID_CLIENTE : null,
            vendedor: vendedorSeleccionado ? vendedorSeleccionado.ID_VENDEDOR : null,
            fechaPago: venta.CANCELADO ? new Date().toISOString().split('T')[0] : null, // Asegura que la fecha se envíe correctamente
            MODO_PAGO: venta.modoPago,
            COMISIONADO: venta.comisionado,
            NUMERO_OPERACION: venta.numeroOperacion,
            OBSERVACION: venta.observacion,
        };

        console.log('Datos de venta a enviar:', ventaData);

        axiosInstance.post('http://localhost:8000/api/ventas/', ventaData)
            .then(response => {
                console.log('Venta creada:', response.data);
                console.log('Mostrando toast de éxito');
                toast.current.show({ severity: 'success', summary: 'Venta creada', detail: 'La venta se ha registrado exitosamente', life: 3000 });
                setTimeout(() => {
                    navigate('/verVentas');
                }, 3200); // El tiempo debe ser ligeramente mayor que la vida del toast
            })
            .catch(error => {
                console.error('Error al crear venta:', error);
                toast.current.show({ severity: 'error', summary: 'Error', detail: 'No se pudo crear la venta', life: 3000 });
                if (error.response) {
                    // El servidor respondió con un estado fuera del rango 2xx
                    console.log('Datos de error:', error.response.data);
                    console.log('Estado:', error.response.status);
                    console.log('Encabezados:', error.response.headers);
                    // Aquí podrías actualizar el estado para mostrar el error en la UI
                } else if (error.request) {
                    // La solicitud fue hecha pero no se recibió respuesta
                    console.log('Error en la solicitud:', error.request);
                } else {
                    // Algo sucedió al configurar la solicitud
                    console.log('Error', error.message);
                }
            });
    };

    const buscarCliente = (evento) => {
        let query = evento.query.toLowerCase();
        let resultadosFiltrados = clientes.filter((cliente) => {
            return cliente.RUC.toLowerCase().startsWith(query) || cliente.RAZON_SOCIAL.toLowerCase().includes(query);
        });
        setSugerenciasClientes(resultadosFiltrados);
    };

    const onClienteSelect = (e) => {
        setClienteSeleccionado(e.value);
        setVenta({ ...venta, cliente: e.value ? e.value.ID_CLIENTE : null });
        setValorAutoComplete(e.value ? `${e.value.RUC} - ${e.value.RAZON_SOCIAL}` : '');
    };

    const itemTemplate = (cliente) => {
        return cliente ? `${cliente.RUC} - ${cliente.RAZON_SOCIAL}` : '';
    };

    const onAutoCompleteChange = (e) => {
        setValorAutoComplete(e.value);
        if (!e.value) {
            setClienteSeleccionado(null);
            setVenta({ ...venta, cliente: null });
        }
    };

    const buscarVendedor = (evento) => {
        let query = evento.query.toLowerCase();
        let resultadosFiltrados = vendedores.filter((vendedor) => {
            return vendedor.NOMBRE.toLowerCase().includes(query) || vendedor.CODIGO.toLowerCase().startsWith(query);
        });
        setSugerenciasVendedores(resultadosFiltrados);
    };

    const onVendedorSelect = (e) => {
        setVendedorSeleccionado(e.value);
        setVenta({ ...venta, vendedor: e.value ? e.value.ID_VENDEDOR : null });
        // Actualiza el valor mostrado en el AutoComplete cuando se selecciona un vendedor
        if (e.value) {
            setValorAutoCompleteVendedor(`${e.value.CODIGO} - ${e.value.NOMBRE}`);
        }
    };

    const itemTemplateVendedor = (vendedor) => {
        return vendedor ? `${vendedor.CODIGO} - ${vendedor.NOMBRE}` : '';
    };

    const onAutoCompleteVendedorChange = (e) => {
        setValorAutoCompleteVendedor(e.value);
        if (!e.value) {
            setVendedorSeleccionado(null);
            setVenta({ ...venta, vendedor: null });
        } else {
            // Aquí podrías implementar lógica para filtrar y mostrar sugerencias basadas en lo que el usuario ha escrito
        }
    };

    const handleNumberChange = (value, fieldName) => {
        // Actualiza el estado específicamente para campos de tipo número
        setVenta({ ...venta, [fieldName]: value });
    };

    const toUTCString = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [modoPago, setModoPago] = useState('');
    const modoPagoOpciones = [
        { label: 'CHEQUE', value: 'CHE' },
        { label: 'LETRA', value: 'LE' },
        { label: 'FACTORING', value: 'FCT' },
        { label: 'TRANSACCION INTERBANCARIA', value: 'TI' },
        { label: 'DESCUENTO DE FACTURA NEGOCIABLE', value: 'DFN' },
        { label: 'EFECTIVO', value: 'EFE' },
    ];

    // Función para manejar el cambio en Modo de Pago y Comisionado
    const handleDropdownChange = (e, name) => {
        setVenta({ ...venta, [name]: e.value });
    };

    const handleModoPagoChange = (e) => {
        setVenta({ ...venta, modoPago: e.value });
    };

    const handleCheckboxChange = (e) => {
        setVenta({ ...venta, [e.target.name]: e.target.checked });
    };



    return (
        <div className="formulario-crear-venta">
            <Toast ref={toast} />
            <h2 className="titulo-formulario">Crear Nueva Venta</h2>
            <form onSubmit={handleSubmit} className="form-venta">
                <div className="form-group">
                    <label htmlFor="vendedor" className="form-label">Vendedor:</label>
                    <AutoComplete
                        value={valorAutoCompleteVendedor}
                        suggestions={sugerenciasVendedores}
                        completeMethod={buscarVendedor}
                        field="NOMBRE"
                        itemTemplate={itemTemplateVendedor}
                        onChange={onAutoCompleteVendedorChange}
                        onSelect={onVendedorSelect}
                        placeholder="Ingrese Código o Nombre del Vendedor"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="cliente" className="form-label">Cliente:</label>
                    <AutoComplete
                        value={valorAutoComplete}
                        suggestions={sugerenciasClientes}
                        completeMethod={buscarCliente}
                        field="RUC"
                        itemTemplate={itemTemplate}
                        onChange={onAutoCompleteChange}
                        onSelect={onClienteSelect}
                        placeholder="Ingrese RUC o Razón Social"
                    />
                </div>
                {/* Dropdown para Tipo de Documento */}
                <div className="form-group">
                    <label htmlFor="tipo_documento" className="form-label">Tipo de Documento:</label>
                    <Dropdown id="tipo_documento" name="tipo_documento" value={venta.tipo_documento} options={tipoDocumentoOpciones} onChange={handleChange} />
                </div>
                {/* InputText para Número de Documento */}
                <div className="form-group">
                    <label htmlFor="DCTO_N" className="form-label">Número de Documento:</label>
                    <InputText id="DCTO_N" name="DCTO_N" value={venta.DCTO_N} onChange={handleChange} />
                </div>
                {/* Dropdown para Moneda */}
                <div className="form-group">
                    <label htmlFor="MONEDA" className="form-label">Moneda:</label>
                    <Dropdown id="MONEDA" name="MONEDA" value={venta.MONEDA} options={monedaOpciones} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label className="form-label">Importe:</label>
                    <InputNumber
                        value={venta.IMPORTE}
                        onValueChange={(e) => handleNumberChange(e.value, 'IMPORTE')}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Plazo (días):</label>
                    <InputNumber
                        value={venta.PLAZO}
                        onValueChange={(e) => handleNumberChange(e.value, 'PLAZO')}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de Emisión:</label>
                    <Calendar name="FECHA_EMISION" value={venta.FECHA_EMISION} onChange={handleChange} dateFormat="dd/mm/yy" />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha de Recepción del Documento:</label>
                    <Calendar name="RECEP_FT" value={venta.RECEP_FT} onChange={handleChange} dateFormat="dd/mm/yy" />
                </div>
                {/* <div className="form-group">
                    <label className="form-label">Fecha de Vencimiento:</label>
                    <Calendar name="FECHA_VENCIMIENTO" value={venta.FECHA_VENCIMIENTO} onChange={handleChange} />
                </div> */}
                <div className="form-group">
                    <label htmlFor="CANCELADO" className="form-label">Cancelado:</label>
                    <Checkbox checked={venta.CANCELADO} onChange={e => setVenta({ ...venta, CANCELADO: e.checked })} />
                </div>
                {/* Campo para Observación */}
                <div className="form-group">
                    <label htmlFor="observacion" className="form-label">Observación:</label>
                    <InputTextarea id="observacion" name="observacion" value={venta.observacion} onChange={handleChange} rows={5} />
                </div>

                {/* Campo para Modo de Pago */}
                <div className="form-group">
                    <label htmlFor="modoPago" className="form-label">Modo de Pago:</label>
                    <Dropdown
                        id="modoPago"
                        value={venta.modoPago}
                        options={modoPagoOpciones}
                        onChange={(e) => handleDropdownChange(e, 'modoPago')}
                        placeholder="Seleccione el modo de pago"
                    />
                </div>
                {/* Campo para Comisionado */}
                <div className="form-group">
                    <label htmlFor="comisionado" className="form-label">Comisionado:</label>
                    <Checkbox
                        id="comisionado"
                        checked={venta.comisionado}
                        onChange={handleCheckboxChange} // Usa el manejador de estado adecuado
                        name="comisionado"
                    />
                </div>

                {/* Campo para Número de Operación */}
                <div className="form-group">
                    <label htmlFor="numeroOperacion" className="form-label">Número de Operación:</label>
                    <InputText id="numeroOperacion" name="numeroOperacion" value={venta.numeroOperacion} onChange={handleChange} />
                </div>

                {/* Botón de envío */}
                <Button type="submit" label="Crear Venta" />
            </form >
        </div >
    );
}

export default CrearVenta;
