import React, { useEffect, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'primereact/calendar';
import { Toast } from 'primereact/toast';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { OverlayPanel } from 'primereact/overlaypanel';
import { useRef } from 'react';
import { useAuth } from '../App'; // Importa el hook useAuth
import axiosInstance from './axios'; // Importa axiosInstance en lugar de axios directamente
import '../styles/ventaslist.css';



function VentasList() {
  const { isAuthenticated } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState({});
  const [vendedores, setVendedores] = useState({});
  const toast = useRef(null);
  const [toastActivo, setToastActivo] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return; // Detiene la ejecución si el usuario no está autenticado
    }

    const fetchData = async () => {
      try {
        // Carga de datos de clientes
        const respClientes = await axiosInstance.get('http://localhost:8000/api/clientes/');
        const clientesMap = respClientes.data.reduce((map, cliente) => {
          map[cliente.ID_CLIENTE] = cliente;
          return map;
        }, {});

        // Carga de datos de vendedores
        const respVendedores = await axiosInstance.get('http://localhost:8000/api/vendedores/');
        const vendedoresMap = respVendedores.data.reduce((map, vendedor) => {
          map[vendedor.ID_VENDEDOR] = vendedor;
          return map;
        }, {});

        // Carga y enriquecimiento de datos de ventas
        const respVentas = await axiosInstance.get('http://localhost:8000/api/ventas/');
        const ventasEnriquecidas = respVentas.data.map(venta => {
          // Asegúrate de que clienteMap[venta.cliente] exista antes de intentar acceder a sus propiedades
          const cliente = clientesMap[venta.cliente];
          return {
            ...venta,
            rucCliente: cliente ? cliente.RUC : '',
            razonSocial: cliente ? cliente.RAZON_SOCIAL : '',
            tipoCliente: cliente && cliente.TIPO_CLIENTE === 1 ? 'Cliente final' : 'Subdistribuidor',
            grupoEconomico: cliente && cliente.GRUPO_ECON !== '999' ? cliente.GRUPO_ECON : 'No pertenece',
            nombreGrupo: cliente ? cliente.NOMBRE_GRUPO : 'No aplica',
            nombreVendedor: vendedoresMap[cliente ? cliente.VENDEDOR : '']?.NOMBRE || 'Desconocido',
            estadoVenta: calcularEstadoVenta(venta),
          };
        }).sort((a, b) => new Date(b.IT) - new Date(a.IT));

        // Actualización de estados
        setClientes(clientesMap);
        setVendedores(vendedoresMap);
        setVentas(ventasEnriquecidas);

      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };
    fetchData();
  }, [isAuthenticated, navigate]);


  const formatoFecha = (fecha) => {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-');
    return `${day}-${month}-${year}`;
  };


  // Template para el tipo de cliente
  const tipoClienteTemplate = (rowData) => {
    const cliente = clientes[rowData.cliente];
    return cliente ? (cliente.TIPO_CLIENTE === 1 ? 'Cliente final' : 'Subdistribuidor') : '';
  };

  const tipoDocumentoTemplate = (rowData) => {
    const tipos = {
      1: 'Factura',
      2: 'Boleta',
      3: 'Nota de crédito',
      4: 'Nota de débito',
      5: 'Otro'
    };
    return tipos[rowData.tipo_documento];
  };

  const editarVenta = (rowData) => {
    navigate(`/editarVenta/${rowData.IT}`);
  };

  const anularVenta = (rowData) => {
    if (!toastActivo) {
      setToastActivo(true);
      toast.current.show({
        content: (
          <div className="p-flex p-flex-column" style={{ flex: '1' }}>
            <div className="p-text-center">
              <h4>¿Estás seguro de querer anular la venta {rowData.DCTO_N}?</h4>
              <Button
                label="Confirmar"
                className="p-button-danger"
                onClick={() => confirmarAnulacion(rowData)}
              />
            </div>
          </div>
        ),
        sticky: true // El Toast permanecerá hasta que el usuario interactúe
      });
    }
  };

  const confirmarAnulacion = (rowData) => {
    // Modificar la petición para incluir la actualización del importe y comisionado
    axiosInstance.post(`http://localhost:8000/api/ventas/${rowData.IT}/anular/`, {
      IMPORTE: 0,
      COMISIONADO: false, // Asume que el backend acepta este campo y lo actualiza adecuadamente
    })
      .then(() => {
        // Actualizar el estado para reflejar los cambios inmediatamente en la UI
        const ventasActualizadas = ventas.map(venta => {
          if (venta.IT === rowData.IT) {
            return { ...venta, ANULADO: true, IMPORTE: 0, COMISIONADO: false };
          }
          return venta;
        });
        setVentas(ventasActualizadas);

        toast.current.clear();
        toast.current.show({ severity: 'success', summary: 'Anulado', detail: `Venta ${rowData.DCTO_N} anulada con éxito.`, life: 3000 });
        setToastActivo(false);
      })
      .catch(error => {
        console.error('Error al anular la venta:', error);
        toast.current.clear();
        toast.current.show({ severity: 'error', summary: 'Error', detail: 'Hubo un error al anular la venta.', life: 3000 });
        setToastActivo(false);
      });
  };



  const accionesTemplate = (rowData) => {
    const esAnulado = rowData.ANULADO;

    return (
      <React.Fragment>
        <Button
          icon="pi pi-pencil"
          className="p-button-rounded p-button-success p-mr-2"
          onClick={() => editarVenta(rowData)}
          disabled={esAnulado}
        />
        <Button
          icon="pi pi-ban"
          className="p-button-rounded p-button-danger"
          onClick={() => anularVenta(rowData)}
          disabled={esAnulado}
        />
      </React.Fragment>
    );
  };


  const estadoVentaTemplate = (rowData) => {
    // Convertir la fecha de vencimiento a un objeto Date
    let estado;
    const hoy = new Date();

    if (rowData.ANULADO) {
      estado = 'Anulado';
    } else if (rowData.CANCELADO) {
      estado = 'Cancelado';
    } else if (new Date(rowData.FECHA_VENCIMIENTO) < hoy) {
      estado = 'Vencido';
    } else {
      estado = 'Vigente';
    }

    return (
      <span className={`venta-estado ${estado.toLowerCase()}`}>
        {estado}
      </span>
    );
  };

  const modoPagoTemplate = (rowData) => {
    const modos = {
      'CHE': 'CHEQUE',
      'LE': 'LETRA',
      'FCT': 'FACTORING',
      'TI': 'TRANSACCION INTERBANCARIA',
      'DFN': 'DESCUENTO DE FACTURA NEGOCIABLE',
      'EFE': 'EFECTIVO',
    };
    return modos[rowData.MODO_PAGO] || '';
  };

  const modosPagoOpciones = [
    { label: 'Cheque', value: 'CHE' },
    { label: 'Letra', value: 'LE' },
    { label: 'Factoring', value: 'FCT' },
    { label: 'Transacción interbancaria', value: 'TI' },
    { label: 'Descuento de factura negociable', value: 'DFN' },
    { label: 'Efectivo', value: 'EFE' },
  ];

  const modoPagoFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={modosPagoOpciones}
        onChange={(e) => {
          options.filterCallback(e.value);
        }}
        optionLabel="label"
        optionValue="value"
        placeholder="Seleccionar modo"
        className="p-column-filter"
        showClear
      />
    );
  };


  // Nuevo template para mostrar si es comisionado o no
  const comisionadoTemplate = (rowData) => {
    return rowData.COMISIONADO ? 'Sí' : 'No';
  };

  // Template para mostrar la observación
  const observacionTemplate = (rowData) => {
    return rowData.OBSERVACION || '';
  };

  // Template para mostrar el número de operación
  const numeroOperacionTemplate = (rowData) => {
    return rowData.NUMERO_OPERACION || '';
  };

  const onGlobalFilterChange = (e) => {
    setGlobalFilter(e.target.value);
    // Puedes ajustar cómo se actualizan los filtros aquí
  };

  const [globalFilter, setGlobalFilter] = useState('');
  const [filters, setFilters] = useState({
    // Inicializar tus filtros aquí, ejemplo:
    IT: { value: null, matchMode: 'equals' },
    DCTO_N: { value: null, matchMode: 'equals' },
    NUMERO_OPERACION: { value: null, matchMode: 'equals' },
    rucCliente: { value: null, matchMode: 'contains' },
    razonSocial: { value: null, matchMode: 'contains' },
    tipoCliente: { value: null, matchMode: 'equals' },
    grupoEconomico: { value: null, matchMode: 'contains' },
    nombreGrupo: { value: null, matchMode: 'contains' },
    FECHA_EMISION: { value: null, matchMode: 'dateIs' },
    nombreVendedor: { value: null, matchMode: 'contains' },
    MONEDA: { value: null, matchMode: 'equals' },
    tipo_documento: { value: null, matchMode: 'equals' },
    estadoVenta: { value: null, matchMode: 'equals' },
    MODO_PAGO: { value: null, matchMode: 'equals' },
    COMISIONADO: { value: null, matchMode: 'equals' },
    IMPORTE: { value: null, matchMode: 'range' },
    // Agrega más filtros según necesites
  });


  const clearFilter = () => {
    setGlobalFilter('');
    setFilters({
      IT: { value: null, matchMode: 'equals' },
      DCTO_N: { value: null, matchMode: 'equals' },
      NUMERO_OPERACION: { value: null, matchMode: 'equals' },
      rucCliente: { value: null, matchMode: 'contains' },
      razonSocial: { value: null, matchMode: 'contains' },
      tipoCliente: { value: null, matchMode: 'equals' },
      grupoEconomico: { value: null, matchMode: 'contains' },
      nombreGrupo: { value: null, matchMode: 'contains' },
      nombreVendedor: { value: null, matchMode: 'contains' },
      MONEDA: { value: null, matchMode: 'equals' },
      tipo_documento: { value: null, matchMode: 'equals' },
      estadoVenta: { value: null, matchMode: 'equals' },
      MODO_PAGO: { value: null, matchMode: 'equals' },
      COMISIONADO: { value: null, matchMode: 'equals' },
      IMPORTE: { value: null, matchMode: 'range' },
    });
    // Restablecer los filtros de fecha
    setFechaEmisionFiltro(null);
    setFechaRecepcionFiltro(null);
    setFechaVencimientoFiltro(null);
    setFechaPagoFiltro(null);
    // Restablecer el filtro de mes
    setMesSeleccionado(null); 
  };

  const actualizarDatos = async () => {
    try {
      // Carga de datos de clientes
      const respClientes = await axiosInstance.get('http://localhost:8000/api/clientes/');
      const clientesMap = respClientes.data.reduce((map, cliente) => {
        map[cliente.ID_CLIENTE] = cliente;
        return map;
      }, {});
  
      // Carga de datos de vendedores
      const respVendedores = await axiosInstance.get('http://localhost:8000/api/vendedores/');
      const vendedoresMap = respVendedores.data.reduce((map, vendedor) => {
        map[vendedor.ID_VENDEDOR] = vendedor;
        return map;
      }, {});
  
      // Carga y enriquecimiento de datos de ventas
      const respVentas = await axiosInstance.get('http://localhost:8000/api/ventas/');
      const ventasEnriquecidas = respVentas.data.map(venta => {
        // Asegúrate de que clienteMap[venta.cliente] exista antes de intentar acceder a sus propiedades
        const cliente = clientesMap[venta.cliente];
        return {
          ...venta,
          rucCliente: cliente ? cliente.RUC : '',
          razonSocial: cliente ? cliente.RAZON_SOCIAL : '',
          tipoCliente: cliente && cliente.TIPO_CLIENTE === 1 ? 'Cliente final' : 'Subdistribuidor',
          grupoEconomico: cliente && cliente.GRUPO_ECON !== '999' ? cliente.GRUPO_ECON : 'No pertenece',
          nombreGrupo: cliente ? cliente.NOMBRE_GRUPO : 'No aplica',
          nombreVendedor: vendedoresMap[cliente ? cliente.VENDEDOR : '']?.NOMBRE || 'Desconocido',
          estadoVenta: calcularEstadoVenta(venta),
        };
      }).sort((a, b) => new Date(b.IT) - new Date(a.IT));
  
      // Actualización de estados
      setClientes(clientesMap);
      setVendedores(vendedoresMap);
      setVentas(ventasEnriquecidas);
  
      // Mostrar mensaje de éxito
      toast.current.show({ severity: 'success', summary: 'Datos actualizados', life: 3000 });
    } catch (error) {
      console.error('Error al actualizar datos:', error);
      // Mostrar mensaje de error
      toast.current.show({ severity: 'error', summary: 'Error al actualizar datos', life: 3000 });
    }
  };
  

  const renderHeader = () => {
    return (
      <div className="table-header p-d-flex p-jc-between p-ai-center p-p-2">

        <Button
        type="button"
        icon="pi pi-refresh"
        className="p-button-outlined p-mr-2"
        onClick={actualizarDatos}
        /> 

        <Button
          type="button"
          icon="pi pi-filter-slash"
          label="Limpiar"
          className="p-button-outlined p-mr-2"
          onClick={clearFilter}
        />

        <span className="p-input-icon-left p-flex-1 p-mr-2">
          <i className="pi pi-search" />
          <InputText
            value={globalFilter}
            onChange={onGlobalFilterChange}
            placeholder="Busqueda Global"
          />
        </span>

        <Dropdown
          value={mesSeleccionado}
          options={opcionesMeses}
          onChange={(e) => setMesSeleccionado(e.value)}
          placeholder="Seleccionar Mes"
          className="p-mr-2"
        />

        <Button
          label="Actualizar Comisionado"
          onClick={actualizarComisionadoSeleccionados}
          className="p-button-success p-ml-auto" // Utiliza `p-ml-auto` si quieres empujar este botón hacia la derecha
        />
      </div>
    );
  };



  const monedas = [
    { label: 'Soles', value: 'S/' },
    { label: 'Dólares', value: 'USD' },
  ];

  const monedaFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={monedas}
        onChange={(e) => {
          // Aplicar el filtro inmediatamente después de la selección
          options.filterCallback(e.value);
        }}
        placeholder="Seleccionar moneda"
        className="p-column-filter"
        showClear
      />
    );
  };

  // Prepara las opciones para el filtro de Tipo de Documento
  const tipoDocumentoOpciones = [
    { label: 'Factura', value: '1' },
    { label: 'Boleta', value: '2' },
    { label: 'Nota de crédito', value: '3' },
    { label: 'Nota de débito', value: '4' },
    { label: 'Otro', value: '5' }
  ];

  // Función que retorna el elemento de filtro para la columna Tipo de Documento
  const tipoDocumentoFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={tipoDocumentoOpciones}
        onChange={(e) => {
          // Aplicar el filtro inmediatamente después de la selección
          options.filterCallback(e.value);
        }}
        optionLabel="label"
        optionValue="value"
        placeholder="Seleccionar tipo"
        className="p-column-filter"
        showClear
      />
    );
  };

  // Opciones para el filtro de estado
  const estadoOpciones = [
    { label: 'Anulado', value: 'Anulado' },
    { label: 'Cancelado', value: 'Cancelado' },
    { label: 'Vencido', value: 'Vencido' },
    { label: 'Vigente', value: 'Vigente' }
  ];

  // Plantilla para el filtro de estado
  const estadoFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={estadoOpciones}
        onChange={(e) => {
          // Aplica el filtro inmediatamente después de la selección
          options.filterCallback(e.value);
        }}
        optionLabel="label"
        optionValue="value"
        placeholder="Seleccionar estado"
        className="p-column-filter"
        showClear
      />
    );
  };

  // Calcula el estado de la venta para la lógica de filtrado
  const calcularEstadoVenta = (venta) => {
    const hoy = new Date();
    if (venta.ANULADO) {
      return 'Anulado';
    } else if (venta.CANCELADO) {
      return 'Cancelado';
    } else if (new Date(venta.FECHA_VENCIMIENTO) < hoy) {
      return 'Vencido';
    } else {
      return 'Vigente';
    }
  };

  const comisionadoOpciones = [
    { label: 'Sí', value: true },
    { label: 'No', value: false },
  ];

  const comisionadoFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={comisionadoOpciones}
        onChange={(e) => {
          options.filterCallback(e.value);
        }}
        optionLabel="label"
        optionValue="value"
        placeholder="Seleccionar"
        className="p-column-filter"
        showClear
      />
    );
  };

  const tipoClienteOpciones = [
    { label: 'Cliente Final', value: 'Cliente final' },
    { label: 'Subdistribuidor', value: 'Subdistribuidor' },
  ];

  const tipoClienteFilterTemplate = (options) => {
    return (
      <Dropdown
        value={options.value}
        options={tipoClienteOpciones}
        onChange={(e) => {
          options.filterCallback(e.value);
        }}
        optionLabel="label"
        optionValue="value"
        placeholder="Seleccionar tipo"
        className="p-column-filter"
        showClear
      />
    );
  };

  const [fechaEmisionFiltro, setFechaEmisionFiltro] = useState(null);


  const filtrarVentas = () => {
    return ventas.filter((venta) => {
      // Filtros existentes por fechas específicas
      let cumpleFiltroEmision = !fechaEmisionFiltro || (new Date(venta.FECHA_EMISION).toISOString().slice(0, 10) === fechaEmisionFiltro.toISOString().slice(0, 10));
      let cumpleFiltroRecepcion = !fechaRecepcionFiltro || (new Date(venta.RECEP_FT).toISOString().slice(0, 10) === fechaRecepcionFiltro.toISOString().slice(0, 10));
      let cumpleFiltroVencimiento = !fechaVencimientoFiltro || (new Date(venta.FECHA_VENCIMIENTO).toISOString().slice(0, 10) === fechaVencimientoFiltro.toISOString().slice(0, 10));
      let cumpleFiltroPago = !fechaPagoFiltro || (new Date(venta.FECHA_PAGO).toISOString().slice(0, 10) === fechaPagoFiltro.toISOString().slice(0, 10));

      // Modificación: Considerar múltiples columnas de fecha en el filtro por mes
      const fechasVenta = [venta.FECHA_EMISION, venta.RECEP_FT, venta.FECHA_VENCIMIENTO, venta.FECHA_PAGO].map(fecha => new Date(fecha));
      let cumpleFiltroMes = mesSeleccionado ? fechasVenta.some(fecha => fecha.getMonth() + 1 === mesSeleccionado) : true;

      // Combinar todos los filtros
      return cumpleFiltroEmision && cumpleFiltroRecepcion && cumpleFiltroVencimiento && cumpleFiltroPago && cumpleFiltroMes;
    });
  };



  <Calendar value={fechaEmisionFiltro} onChange={(e) => setFechaEmisionFiltro(e.value)} inline showIcon dateFormat="yy-mm-dd" locale='es' />


  const FechaEmisionHeader = ({ fechaFiltro, setFechaFiltro }) => {
    const op = useRef(null);

    return (
      <div className="fecha-column-header">
        F. Emisión
        <Button
          icon="pi pi-calendar"
          className="p-button-text overlay-panel-icon"
          onClick={(e) => op.current.toggle(e)}
        />
        <OverlayPanel ref={op} showCloseIcon id="overlay_panel" style={{ width: 'auto' }}>
          <Calendar value={fechaFiltro} onChange={(e) => setFechaFiltro(e.value)} inline showIcon dateFormat="yy-mm-dd" />
        </OverlayPanel>
      </div>
    );
  };


  const [fechaRecepcionFiltro, setFechaRecepcionFiltro] = useState(null);
  const [fechaVencimientoFiltro, setFechaVencimientoFiltro] = useState(null);
  const [fechaPagoFiltro, setFechaPagoFiltro] = useState(null);
  const [mesSeleccionado, setMesSeleccionado] = useState(null);

  const opcionesMeses = [
    { label: 'Enero', value: 1 },
    { label: 'Febrero', value: 2 },
    { label: 'Marzo', value: 3 },
    { label: 'Abril', value: 4 },
    { label: 'Mayo', value: 5 },
    { label: 'Junio', value: 6 },
    { label: 'Julio', value: 7 },
    { label: 'Agosto', value: 8 },
    { label: 'Septiembre', value: 9 },
    { label: 'Octubre', value: 10 },
    { label: 'Noviembre', value: 11 },
    { label: 'Diciembre', value: 12 },
  ];

  const [selectedVentas, setSelectedVentas] = useState(null);

  const actualizarComisionadoSeleccionados = async () => {
    if (!selectedVentas || selectedVentas.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'Advertencia', detail: 'No hay ventas seleccionadas.', life: 3000 });
      return;
    }

    const actualizarPromesas = selectedVentas.map(venta => {
      const actualizado = { ...venta, COMISIONADO: !venta.COMISIONADO }; // Cambia el estado de COMISIONADO
      return axiosInstance.patch(`http://localhost:8000/api/ventas/${venta.IT}/`, { COMISIONADO: actualizado.COMISIONADO });
    });

    try {
      await Promise.all(actualizarPromesas);
      toast.current.show({ severity: 'success', summary: 'Éxito', detail: 'Ventas actualizadas correctamente.', life: 3000 });

      // Aquí se deseleccionan todas las ventas después de actualizar
      setSelectedVentas([]);

      // Opcionalmente, recargar las ventas para reflejar los cambios
      // fetchData();
    } catch (error) {
      console.error('Error al actualizar ventas:', error);
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al actualizar las ventas.', life: 3000 });
    }
  };


  const FechaRecepcionHeader = ({ fechaFiltro, setFechaFiltro }) => {
    const op = useRef(null);

    return (
      <div className="fecha-column-header">
        F. Recepción
        <Button
          icon="pi pi-calendar"
          className="p-button-text overlay-panel-icon"
          onClick={(e) => op.current.toggle(e)}
        />
        <OverlayPanel ref={op} showCloseIcon id="overlay_panel_recepcion" style={{ width: 'auto' }}>
          <Calendar value={fechaFiltro} onChange={(e) => setFechaFiltro(e.value)} inline showIcon dateFormat="yy-mm-dd" />
        </OverlayPanel>
      </div>
    );
  };
  const FechaVencimientoHeader = ({ fechaFiltro, setFechaFiltro }) => {
    const op = useRef(null);

    return (
      <div className="fecha-column-header">
        F. Vencimiento
        <Button
          icon="pi pi-calendar"
          className="p-button-text overlay-panel-icon"
          onClick={(e) => op.current.toggle(e)}
        />
        <OverlayPanel ref={op} showCloseIcon id="overlay_panel_vencimiento" style={{ width: 'auto' }}>
          <Calendar value={fechaFiltro} onChange={(e) => setFechaFiltro(e.value)} inline showIcon dateFormat="yy-mm-dd" locale='es' />
        </OverlayPanel>
      </div>
    );
  };

  const FechaPagoHeader = ({ fechaFiltro, setFechaFiltro }) => {
    const op = useRef(null);

    return (
      <div className="fecha-column-header">
        F. Pago
        <Button
          icon="pi pi-calendar"
          className="p-button-text overlay-panel-icon"
          onClick={(e) => op.current.toggle(e)}
        />
        <OverlayPanel ref={op} showCloseIcon id="overlay_panel_pago" style={{ width: 'auto' }}>
          <Calendar value={fechaFiltro} onChange={(e) => setFechaFiltro(e.value)} inline showIcon dateFormat="yy-mm-dd" />
        </OverlayPanel>
      </div>
    );
  };


  return (
    <div className="ventas-list-container">
      <Toast ref={toast} onRemove={() => setToastActivo(false)} />
      <div className="card">
        <h2>Lista de Ventas</h2>
        <DataTable
          value={filtrarVentas()}
          selection={selectedVentas} // Usa el estado de las filas seleccionadas
          onSelectionChange={e => {
            // Filtrar las selecciones para excluir ventas anuladas
            const seleccionNoAnuladas = e.value.filter(venta => !venta.ANULADO);
            setSelectedVentas(seleccionNoAnuladas);
          }}
          rowClassName={data => (data.ANULADO ? 'fila-anulada' : '')}
          dataKey="IT" // Asegúrate de que "IT" es un identificador único para cada venta
          removableSort
          sortMode="multiple"
          paginator
          rows={50}
          rowsPerPageOptions={[50, 100, 150, 200]}
          header={renderHeader()}
          globalFilter={globalFilter}
          filters={filters}
        >
          <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column> {/* Columna de selección */}
          <Column field="IT" header="IT" filter filterPlaceholder="Buscar por IT"></Column>
          <Column field="tipo_documento" header="Tipo Documento" body={tipoDocumentoTemplate} filter filterElement={tipoDocumentoFilterTemplate} />
          <Column field="DCTO_N" header="N° Documento" filter filterPlaceholder="Buscar por Documento"></Column>
          <Column field="rucCliente" header="RUC Cliente" filter filterPlaceholder="Buscar por RUC"></Column>
          <Column field="razonSocial" header="Razón Social" filter filterPlaceholder="Buscar por razón social" />
          <Column field="tipoCliente" header="Tipo Cliente" body={tipoClienteTemplate} filter filterElement={tipoClienteFilterTemplate} />
          <Column field="grupoEconomico" header="Grupo Económico" filter filterPlaceholder="Buscar por grupo económico" />
          <Column field="nombreGrupo" header="Nombre Grupo" filter filterPlaceholder="Buscar por nombre grupo" />
          <Column field="nombreVendedor" header="Vendedor" filter filterPlaceholder="Buscar por vendedor" />
          <Column field="MONEDA" header="Moneda" body={(rowData) => rowData.MONEDA} filter filterElement={monedaFilterTemplate} />
          <Column field="IMPORTE" header="Importe" sortable />
          <Column field="PLAZO" header="Plazo" sortable />
          <Column field="FECHA_EMISION" header={<FechaEmisionHeader fechaFiltro={fechaEmisionFiltro} setFechaFiltro={setFechaEmisionFiltro} />} body={(rowData) => formatoFecha(rowData.FECHA_EMISION)} />
          <Column field="RECEP_FT" header={<FechaRecepcionHeader fechaFiltro={fechaRecepcionFiltro} setFechaFiltro={setFechaRecepcionFiltro} />} body={(rowData) => formatoFecha(rowData.RECEP_FT)} />
          <Column field="FECHA_VENCIMIENTO" header={<FechaVencimientoHeader fechaFiltro={fechaVencimientoFiltro} setFechaFiltro={setFechaVencimientoFiltro} />} body={(rowData) => formatoFecha(rowData.FECHA_VENCIMIENTO)} />
          <Column field="estadoVenta" header="Estado" body={estadoVentaTemplate} filter filterElement={estadoFilterTemplate} />
          <Column field="OBSERVACION" header="Observación" body={observacionTemplate} />
          <Column field="FECHA_PAGO" header={<FechaPagoHeader fechaFiltro={fechaPagoFiltro} setFechaFiltro={setFechaPagoFiltro} />} body={(rowData) => formatoFecha(rowData.FECHA_PAGO)} />
          <Column field="MODO_PAGO" header="Modo de Pago" body={modoPagoTemplate} filter filterElement={modoPagoFilterTemplate} />
          <Column field="COMISIONADO" header="Comisionado" body={comisionadoTemplate} filter filterElement={comisionadoFilterTemplate} />
          <Column field="NUMERO_OPERACION" header="Número de Operación" body={numeroOperacionTemplate} filter filterPlaceholder="Buscar por Operación" />
          <Column body={accionesTemplate} />
        </DataTable>
      </div>
    </div>
  );


}

export default VentasList;