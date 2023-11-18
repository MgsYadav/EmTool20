import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { render } from 'react-dom';
import { AgGridReact } from 'ag-grid-react'; // the AG Grid React Component

import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Optional theme CSS

const AgDataGrid = (props: any) => {
    const containerStyle = useMemo(() => ({ width: '100%', height: '96%' }), []);
    const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
    const [rowData, setRowData] = useState([]);
    const [columnDefs, setColumnDefs] = useState([]);
    const defaultColDef = useMemo(() => {
        return {
            flex: 1,
            minWidth: 150,
            filter: true,
            floatingFilter: false,
            sortable: true,
            editable: false
        };
    }, []);

    useEffect(() => {
        setRowData(props.data);
    }, [props.data]);


    useEffect(() => {
        setColumnDefs(props.columns);
    }, [props.columns]);

    return (
        <div style={containerStyle}>
            <div style={gridStyle} className="ag-theme-alpine">
                <AgGridReact
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    pagination={true}
                    suppressPaginationPanel={false}
                    paginationPageSize={10}
                    suppressFieldDotNotation={true}
                    paginationAutoPageSize={true}

                ></AgGridReact>
            </div>
        </div>
    );
};

export default AgDataGrid;