import React, { useState, useEffect } from 'react';
import axiosInstance from './axios'; // Importa axiosInstance en lugar de axios directamente
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar } from 'primereact/calendar';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { AutoComplete } from 'primereact/autocomplete';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import 'primereact/resources/themes/saga-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import '../styles/formventa.css';
import { useAuth } from '../App'; // Importa el hook useAuth


function EditarVenta() {
    const { isAuthenticated } = useAuth();
    const toast = useRef(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [sugerenciasClientes, setSugerenciasClientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null);
    const [sugerenciasVendedores, setSugerenciasVendedores] = useState([]);
    const [valorAutoComplete, setValorAutoComplete] = useState('');
    const [valorAutoCompleteVendedor, setValorAutoCompleteVendedor] = useState('');
    const [venta, setVenta] = useState({
        tipo_documento: null,
        DCTO_N: '',
        MONEDA: null,
        IMPORTE: null,
        PLAZO: null,
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
        FECHA_PAGO: null,
    });

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
        }
        axiosInstance.get(`http://localhost:8000/api/ventas/${id}/`)
            .then(response => {
                const data = response.data;
                setVenta({
                    ...data,
                    FECHA_EMISION: data.FECHA_EMISION ? new Date(data.FECHA_EMISION + 'T00:00:00') : null,
                    RECEP_FT: data.RECEP_FT ? new Date(data.RECEP_FT + 'T00:00:00') : null,
                    FECHA_VENCIMIENTO: data.FECHA_VENCIMIENTO ? new Date(data.FECHA_VENCIMIENTO + 'T00:00:00') : null,
                    tipo_documento: data.tipo_documento.toString(), // Convertir a string
                });
            })
            .catch(error => console.error('Error al obtener la venta:', error));
    }, [id, isAuthenticated, navigate]);

    useEffect(() => {
        // Lógica para cargar clientes y vendedores
        axiosInstance.get('http://localhost:8000/api/clientes/')
            .then(response => setClientes(response.data))
            .catch(error => console.error('Error al obtener clientes:', error));

        axiosInstance.get('http://localhost:8000/api/vendedores/')
            .then(response => setVendedores(response.data))
            .catch(error => console.error('Error al obtener vendedores:', error));
    }, []); // Este efecto solo se ejecuta una vez cuando el componente se monta

    // Otro useEffect para establecer el cliente y vendedor seleccionado basado en la venta cargada
    useEffect(() => {
        if (venta.cliente && clientes.length > 0) {
            const selectedCliente = clientes.find(c => c.ID_CLIENTE === venta.cliente);
            if (selectedCliente) {
                setClienteSeleccionado(selectedCliente);
                setValorAutoComplete(`${selectedCliente.RUC} - ${selectedCliente.RAZON_SOCIAL}`);
                // Asumiendo que el cliente ya incluye la información del vendedor:
                const vendedorDelCliente = selectedCliente.vendedor; // Ajustar según cómo accedes al vendedor en el objeto cliente
                if (vendedorDelCliente) {
                    setVendedorSeleccionado(vendedorDelCliente);
                    setValorAutoCompleteVendedor(`${vendedorDelCliente.CODIGO} - ${vendedorDelCliente.NOMBRE}`);
                }
            }
        }
    }, [venta, clientes, vendedores]);
    

    useEffect(() => {
        if (venta.CANCELADO) {
            // Si se marca como cancelado, actualiza la fecha de pago a la fecha actual
            setVenta(prevState => ({ ...prevState, FECHA_PAGO: new Date().toISOString().slice(0, 10) })); // Ajusta el formato de fecha según sea necesario
        } else {
            // Si se desmarca como cancelado, elimina la fecha de pago
            setVenta(prevState => ({ ...prevState, FECHA_PAGO: null }));
        }
    }, [venta.CANCELADO]); // Escucha específicamente por cambios en venta.CANCELADO


    const buscarCliente = (evento) => {
        let query = evento.query.toLowerCase();
        let resultadosFiltrados = clientes.filter((cliente) => {
            return cliente.RUC.toLowerCase().startsWith(query) || cliente.RAZON_SOCIAL.toLowerCase().includes(query);
        });
        setSugerenciasClientes(resultadosFiltrados);
    };

    const buscarVendedor = (evento) => {
        let query = evento.query.toLowerCase();
        let resultadosFiltrados = vendedores.filter((vendedor) => {
            return vendedor.NOMBRE.toLowerCase().includes(query) || vendedor.CODIGO.toLowerCase().startsWith(query);
        });
        setSugerenciasVendedores(resultadosFiltrados);
    };

    const itemTemplateCliente = (cliente) => {
        return cliente ? `${cliente.RUC} - ${cliente.RAZON_SOCIAL}` : '';
    };

    const itemTemplateVendedor = (vendedor) => {
        return vendedor ? `${vendedor.CODIGO} - ${vendedor.NOMBRE}` : '';
    };

    const onClienteSelect = (e) => {
        setClienteSeleccionado(e.value);
        setVenta({ ...venta, cliente: e.value.ID_CLIENTE });
        setValorAutoComplete(`${e.value.RUC} - ${e.value.RAZON_SOCIAL}`);
    };

    const onVendedorSelect = (e) => {
        setVendedorSeleccionado(e.value);
        setVenta({ ...venta, vendedor: e.value.ID_VENDEDOR });
        setValorAutoCompleteVendedor(`${e.value.CODIGO} - ${e.value.NOMBRE}`);
    };


    const onAutoCompleteChange = (e, tipo) => {
        if (tipo === 'cliente') {
            setValorAutoComplete(e.value);
            if (!e.value) {
                setClienteSeleccionado(null);
                setVenta({ ...venta, cliente: null });
            }
        } else if (tipo === 'vendedor') {
            setValorAutoCompleteVendedor(e.value);
            if (!e.value) {
                setVendedorSeleccionado(null);
                setVenta({ ...venta, vendedor: null });
            }
        }
    };

    const handleChange = (e, name) => {
        let newVenta = { ...venta };

        if (name === 'CANCELADO') {
            newVenta[name] = e.checked;
            // Si se marca "Cancelado", establece la fecha de pago a la fecha actual
            if (e.checked) {
                newVenta['FECHA_PAGO'] = new Date().toISOString().slice(0, 10); // Formato de fecha AAAA-MM-DD
            } else {
                // Si se desmarca "Cancelado", elimina la fecha de pago
                newVenta['FECHA_PAGO'] = null;
            }
        } else if (name === 'COMISIONADO') {
            newVenta[name] = e.checked;
        } else if (typeof e === 'object' && e !== null && 'target' in e) {
            const { name, value } = e.target;
            newVenta[name] = value;
        } else {
            newVenta[name] = e;
        }

        if (name === 'RECEP_FT' || name === 'PLAZO') {
            if (newVenta.RECEP_FT && newVenta.PLAZO !== null) {
                const fechaRecepcion = new Date(newVenta.RECEP_FT);
                fechaRecepcion.setDate(fechaRecepcion.getDate() + newVenta.PLAZO);
                newVenta.FECHA_VENCIMIENTO = fechaRecepcion;
            }
        }

        setVenta(newVenta);
    };



    const toUTCString = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0'); // Los meses comienzan en 0
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const fechaPagoFormatted = venta.FECHA_PAGO ? new Date(venta.FECHA_PAGO).toISOString().slice(0, 10) : null;
        const ventaData = {
            ...venta,
            FECHA_EMISION: toUTCString(venta.FECHA_EMISION),
            RECEP_FT: toUTCString(venta.RECEP_FT),
            FECHA_VENCIMIENTO: venta.FECHA_VENCIMIENTO ? toUTCString(venta.FECHA_VENCIMIENTO) : null,
            cliente: clienteSeleccionado ? clienteSeleccionado.ID_CLIENTE : null,
            vendedor: vendedorSeleccionado ? vendedorSeleccionado.ID_VENDEDOR : null,
            tipo_documento: parseInt(venta.tipo_documento), // Convertir de nuevo a número
            IMPORTE: parseFloat(venta.IMPORTE),
            PLAZO: parseInt(venta.PLAZO),
            FECHA_PAGO: fechaPagoFormatted, // Asegúrate de incluir esto

        };

        axiosInstance.put(`http://localhost:8000/api/ventas/${id}/`, ventaData)
            .then(response => {
                console.log('Venta actualizada:', response.data);
                toast.current.show({ severity: 'info', summary: 'Venta Actualizada', detail: 'La venta se ha actualizado exitosamente', life: 3000 });
                setTimeout(() => {
                    navigate('/verVentas');
                }, 3200); // El tiempo debe ser ligeramente mayor que la vida del toast
            })
            .catch(error => console.error('Error al actualizar la venta:', error));
    };

    const handleTipoDocumentoChange = (e) => {
        setVenta({ ...venta, tipo_documento: e.value });
    };

    const handleModoPagoChange = (e) => {
        setVenta({ ...venta, MODO_PAGO: e.value });
    };

    const handleMonedaChange = (e) => {
        setVenta({ ...venta, MONEDA: e.value });
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

    const modoPagoOpciones = [
        { label: 'CHEQUE', value: 'CHE' },
        { label: 'LETRA', value: 'LE' },
        { label: 'FACTORING', value: 'FCT' },
        { label: 'TRANSACCION INTERBANCARIA', value: 'TI' },
        { label: 'DESCUENTO DE FACTURA NEGOCIABLE', value: 'DFN' },
        { label: 'EFECTIVO', value: 'EFE' },
    ];
    return (
        <div className="formulario-crear-venta">
            <Toast ref={toast} />
            <h2 className="titulo-formulario">Editar Venta</h2>
            <form onSubmit={handleSubmit} className="form-venta">

                {/* Cliente */}
                <div className="form-group">
                    <label htmlFor="cliente" className="form-label">Cliente:</label>
                    <AutoComplete
                        value={valorAutoComplete}
                        suggestions={sugerenciasClientes}
                        completeMethod={buscarCliente}
                        field="RUC"
                        itemTemplate={itemTemplateCliente}
                        onChange={(e) => onAutoCompleteChange(e, 'cliente')}
                        onSelect={onClienteSelect}
                        placeholder="Ingrese RUC o Razón Social del Cliente"
                    />
                </div>

                {/* Tipo de Documento */}
                <div className="form-group">
                    <label htmlFor="tipo_documento" className="form-label">Tipo de Documento:</label>
                    <Dropdown
                        value={venta.tipo_documento}
                        options={tipoDocumentoOpciones}
                        onChange={handleTipoDocumentoChange}
                        placeholder="Seleccione un tipo de documento"
                    />
                </div>

                {/* Número de Documento */}

                <div className="form-group">
                    <label htmlFor="DCTO_N" className="form-label">Número de Documento:</label>
                    <InputText
                        id="DCTO_N"
                        name="DCTO_N"
                        value={venta.DCTO_N}
                        onChange={(e) => handleChange(e)}
                        placeholder="Ingrese el número de documento"
                    />
                </div>

                {/* Moneda */}
                <div className="form-group">
                    <label htmlFor="MONEDA" className="form-label">Moneda:</label>
                    <Dropdown
                        value={venta.MONEDA}
                        options={monedaOpciones}
                        onChange={handleMonedaChange}
                        placeholder="Seleccione una moneda"
                    />
                </div>

                {/* Importe */}
                <div className="form-group">
                    <label htmlFor="IMPORTE" className="form-label">Importe:</label>
                    <InputNumber
                        id="IMPORTE"
                        name="IMPORTE"
                        value={venta.IMPORTE}
                        onValueChange={(e) => handleChange(e.value, 'IMPORTE')}
                        placeholder="Ingrese el importe"
                    />

                </div>

                {/* Plazo */}
                <div className="form-group">
                    <label htmlFor="PLAZO" className="form-label">Plazo:</label>
                    <InputNumber
                        id="PLAZO"
                        name="PLAZO"
                        value={venta.PLAZO}
                        onChange={(e) => handleChange(e.value, 'PLAZO')}
                        placeholder="Ingrese el plazo"

                    />
                </div>
                {/* Fecha de Emisión */}
                <div className="form-group">
                    <label htmlFor="FECHA_EMISION" className="form-label">Fecha de Emisión:</label>
                    <Calendar
                        id="FECHA_EMISION"
                        name="FECHA_EMISION"
                        value={venta.FECHA_EMISION}
                        onChange={(e) => handleChange(e, 'FECHA_EMISION')}
                        dateFormat="dd/mm/yy"
                    />
                </div>
                {/* Fecha de Recepción */}
                <div className="form-group">
                    <label htmlFor="RECEP_FT" className="form-label">Fecha de Recepción:</label>
                    <Calendar
                        id="RECEP_FT"
                        name="RECEP_FT"
                        value={venta.RECEP_FT}
                        onChange={(e) => handleChange(e.value, 'RECEP_FT')}
                        dateFormat="dd/mm/yy"
                    />
                </div>
                {/* Fecha de Vencimiento
                <div className="form-group">
                    <label htmlFor="FECHA_VENCIMIENTO" className="form-label">Fecha de Vencimiento:</label>
                    <Calendar
                        id="FECHA_VENCIMIENTO"
                        name="FECHA_VENCIMIENTO"
                        value={venta.FECHA_VENCIMIENTO}
                        onChange={(e) => handleChange(e, 'FECHA_VENCIMIENTO')}
                        dateFormat="dd/mm/yy"
                    />
                </div> */}
                {/* Cancelado */}
                <div className="form-group">
                    <label htmlFor="CANCELADO" className="form-label">Cancelado:</label>
                    <Checkbox
                        id="CANCELADO"
                        name="CANCELADO"
                        checked={venta.CANCELADO}
                        onChange={(e) => handleChange(e, 'CANCELADO')}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="OBSERVACION" className="form-label">Observación:</label>
                    <InputTextarea
                        id="OBSERVACION"
                        name="OBSERVACION"
                        value={venta.OBSERVACION}
                        onChange={(e) => handleChange(e, 'OBSERVACION')}
                        rows={3}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="MODO_PAGO" className="form-label">Modo de Pago:</label>
                    <Dropdown
                        value={venta.MODO_PAGO}
                        options={modoPagoOpciones} // Asegúrate de tener esta variable definida
                        onChange={handleModoPagoChange}
                        placeholder="Seleccione el modo de pago"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="COMISIONADO" className="form-label">Comisionado</label>
                    <Checkbox
                        inputId="COMISIONADO"
                        checked={venta.COMISIONADO}
                        onChange={(e) => handleChange(e, 'COMISIONADO')}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="NUMERO_OPERACION" className="form-label">Número de Operación:</label>
                    <InputText
                        id="NUMERO_OPERACION"
                        name="NUMERO_OPERACION"
                        value={venta.NUMERO_OPERACION}
                        onChange={(e) => handleChange(e)}
                        placeholder="Ingrese el número de operación"
                    />
                </div>

                <Button type="submit" label="Actualizar" className="p-button-success" />
            </form>
        </div>
    );
}

export default EditarVenta;

