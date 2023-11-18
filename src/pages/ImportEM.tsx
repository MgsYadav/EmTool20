import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Split } from '@geoffcox/react-splitter';
import { ExpandLess, ExpandMore, CheckCircle, Dangerous, Shower, Error } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';
import {
    importEm, getDatabaseName, validateEntitySheet, getPgTables, getFieldList, getValidTableList, validateConnectionString,
    finalizeDatabase
} from './../services/em.service';
import { getMessageFromArray } from './../services/common';
import './../assets/css/em.css';
import * as XLSX from "xlsx";
import AgDataGrid from '../components/aggrid';
import Typography from '@mui/material/Typography';
import {
    Button, Dialog, Divider, Checkbox, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Box, Collapse, Grid, List, ListItem, ListItemText, ListSubheader, FormControlLabel, LinearProgress,
    FormGroup,
    TextField,
    ListItemButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from "@mui/material";

const ImportEM = (props: any) => {

    //#region const variables
    const lblChooseFile = "Choose file...";
    const [connectionSetting, setConnectionSetting] = useState<{ [key: string]: any }>({
        serverName: "",
        databaseName: "",
        loginUserName: "",
        password: "",
        authentication: ""
    });

    const [errorProps, setErrorProps] = useState({ show: false, title: 'Error', error: '', isError: false });
    const [categories, setCategories] = useState([]);
    const [selectAllWorksheetState, setSelectAllWorksheetState] = useState(false);
    const [workBook, setWorkBook] = useState<any>({});
    const [chooseFileName, setChooseFileName] = useState("Choose file...");
    const [selectedSheet, setSelectedSheet] = useState<any>({});
    const [validWorksheetList, setValidWorksheetList] = useState<any>([]);
    const [showImportLoader, setShowImportLoader] = useState(false);
    const [showImportPage, setShowImportPage] = useState(false);
    const [chkAgree, setChkAgree] = useState(false);
    const [title, setTitle] = useState("");
    const [showSpinner, setShowSpinner] = useState(false);
    const [disableWorksheetCheckboxs, setDisableWorksheetCheckboxs] = useState(false);

    // #endregion

    //#region useState and useEffect

    useEffect(() => {
        getDatabaseName().then((resp: any) => {
            if (resp.status == 200) {
                setConnectionSetting(resp.data)
                console.log(resp.data)
            }
            else {
                let message = getMessageFromArray(resp.errData);
                showError(message);
            }
        }).catch((error) => {
            console.error(error);
        });;
    }, []);


    useEffect(() => {
        makeValidWorksheetList();
    }, [workBook]);

    useEffect(() => {
        checkSelectAllWorksheetCheckbox();
    }, [validWorksheetList]);

    //#endregion

    //#region handlers

    const checkSelectAllWorksheetCheckbox = () => {
        let selected = validWorksheetList.filter(function (el: any) {
            return el.checkboxSelected === true;
        }).length;

        let allData = validWorksheetList.length;

        if (allData > 0 && selected == allData) {
            setSelectAllWorksheetState(true);
        }
        else {
            setSelectAllWorksheetState(false);
        }
    }

    const handleEntitySelect = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean, item: any) => {
        ClearAllState();
        if (item) {
            categories.forEach((cat: any) => {
                if (cat.entityName == item.entityName) {
                    cat.checkboxSelected = checked;
                }
                else {
                    cat.checkboxSelected = false;
                }
            });
            setCategories([...categories]);
        }
    }

    const handleEntityClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number, item: any) => {
        ClearAllState();
        setChooseFileName(lblChooseFile);
        setTitle(item.description);
        categories.forEach((cat: any) => {
            if (cat.entityName == item.entityName) {
                cat.checkboxSelected = !item.checkboxSelected;
                setDisableWorksheetCheckboxs(cat.disableAllCheckbox);
            }
            else {
                cat.checkboxSelected = false;
            }
        });
        setCategories([...categories]);
    };


    const handleOnFileChange = (e: any) => {

        ClearAllState();
        const [file] = e.target.files;
        if (!file) return false;// no file selected

        setChooseFileName(file.name);

        const _validFileExtensions = [".xlsx", ".xls"];
        let isValid = false;
        for (var j = 0; j < _validFileExtensions.length; j++) {
            let sCurExtension = _validFileExtensions[j];
            if (file.name.substr(file.name.length - sCurExtension.length, sCurExtension.length).toLowerCase() === sCurExtension.toLowerCase()) {
                isValid = true;
                break;
            }
        }
        if (isValid) { //selected file is valid excel file
            const reader = new FileReader();
            reader.onload = (evt: any) => {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                setWorkBook(wb);
            };
            reader.readAsBinaryString(file);
            e.target.value = null;
        } else {
            showError("Select valid excel file");
            setChooseFileName(lblChooseFile);
        }
    };

    const showError = (errorMessage: any, title: any = "") => {
        if (errorMessage) {
            errorProps.show = true;
            errorProps.error = errorMessage;
            errorProps.title = title ? title : "Error";
            errorProps.isError = true;
            setErrorProps({ ...errorProps });
        }
    }

    const showSuccess = (successMessage: any) => {
        errorProps.show = true;
        errorProps.error = successMessage;
        errorProps.title = 'Success';
        errorProps.isError = false;
        setErrorProps({ ...errorProps });
    }

    const handleErrorPopupClose = () => {
        setErrorProps({ ...errorProps, ['show']: false });
    }

    const handleImport = () => {
        let entityData: any = categories.filter(function (el: any) {
            return el.checkboxSelected === true;
        });

        if (entityData.length == 0) {
            showError("No table is selected to import");
            return false;
        }

        let entityName = entityData[0].entityName;

        let sheetJsonFormat: any = {};
        let selectedSheet: any = validWorksheetList
            .filter(function (el: any) {
                return el.checkboxSelected === true;
            });

        if (selectedSheet.length == 0) {
            showError("Select excel sheet to import.")
            return false;
        }

        let errorSelectedSheet: any = selectedSheet
            .filter(function (el: any) {
                return el.isError === 1;
            });
        if (errorSelectedSheet.length > 0) {
            showError("You must fix error in each worksheet first.")
            return false;
        }

        for (let i = 0; i < selectedSheet.length; i++) {
            sheetJsonFormat[selectedSheet[i].sheetName] = selectedSheet[i].rowData;
        }
        console.log("import", sheetJsonFormat)
        setShowImportLoader(true);
        if (showImportLoader == false) {
            debugger;
            importEm(connectionSetting, entityName, JSON.stringify(sheetJsonFormat)).then((resp: any) => {
                setShowImportLoader(false);
                if (resp.status == 200) {
                    setChooseFileName(lblChooseFile);
                    if (resp.data.jsonStringOutput == '' || resp.data.jsonStringOutput == null) {
                        ClearAllState();
                        //selectAllWorksheet(false);
                        categories.forEach((cat: any) => {
                            cat.checkboxSelected = false;
                        });
                        setCategories(categories);
                        let stepsCompleted = resp.data.stepsCompleted;
                        if (stepsCompleted == "" || stepsCompleted == null) {
                            showSuccess("Import success");
                        }
                        else {
                            showSuccess(stepsCompleted);
                        }
                    }
                    else {
                        let outputSheetData = JSON.parse(resp.data.jsonStringOutput);

                        for (let j = 0; j < validWorksheetList.length; j++) {
                            debugger;
                            let newData = outputSheetData[validWorksheetList[j].sheetName];
                            if (newData) {
                                let anyError = newData.filter(function (el: any) {
                                    return typeof el.ErrorString !== 'undefined' && el.ErrorString != "";
                                });
                                let isErrorOnAnySheet = 0;
                                if (anyError.length > 0) {
                                    isErrorOnAnySheet = 1;
                                }
                                validWorksheetList[j].rowData = newData;
                                validWorksheetList[j].isError = isErrorOnAnySheet;
                                let columnIndex = validWorksheetList[j].column.findIndex((x: any) => x.field == "ErrorString");
                                if (columnIndex === -1) {
                                    validWorksheetList[j].column.push({
                                        field: "ErrorString",
                                        resizable: true
                                    });
                                }
                                columnIndex = validWorksheetList[j].column.findIndex((x: any) => x.field == "RecID");
                                if (columnIndex === -1) {
                                    validWorksheetList[j].column.push({
                                        field: "RecID",
                                        resizable: true
                                    });
                                }

                                columnIndex = validWorksheetList[j].column.findIndex((x: any) => x.field == "EntID");
                                if (columnIndex === -1) {
                                    validWorksheetList[j].column.push({
                                        field: "EntID",
                                        resizable: true
                                    });
                                }
                            }
                        }
                        let isErrorOnAnySheet = validWorksheetList.filter(function (el: any) {
                            return el.isError == 1 && el.checkboxSelected == true;
                        });
                        if (isErrorOnAnySheet.length > 0) {
                            setValidWorksheetList([...validWorksheetList]);
                            let stepsCompleted = resp.data.stepsCompleted;
                            showError(stepsCompleted);
                        }
                        else {
                            ClearAllState();
                            //selectAllWorksheet(false);
                            categories.forEach((cat: any) => {
                                cat.checkboxSelected = false;
                            });
                            setCategories(categories);
                            let stepsCompleted = resp.data.stepsCompleted;
                            if (stepsCompleted == "" || stepsCompleted == null) {
                                showSuccess("Import success");
                            }
                            else {
                                showSuccess(stepsCompleted);
                            }
                        }
                    }
                }
                else {
                    let message = getMessageFromArray(resp.errData);
                    showError(message);
                }
            });
        }
    }


    //#endregion

    const makeValidWorksheetList = () => {
        if (workBook.SheetNames) {
            let sheetCount = workBook.SheetNames.length;
            setValidWorksheetList([]);

            if (sheetCount > 0) {

                let entityData: any = categories.filter(function (el: any) {
                    return el.checkboxSelected === true;
                });

                if (entityData.length == 0) {
                    showError("No table is selected to import");
                    setChooseFileName(lblChooseFile);
                    return false;
                }

                loadWorkSheet();
            }
        }
    }

    const loadWorkSheet = () => {

        let entityData: any = categories.filter(function (el: any) {
            return el.checkboxSelected === true;
        });

        let selectedEntity = entityData[0];
        let entityName: any = selectedEntity.entityName;

        if (entityName.toLowerCase() == "ap" || entityName.toLowerCase() == "feature") {
            getPgTables(connectionSetting, entityName).then((resp: any) => {
                if (resp.status == 200) {
                    let requiredTableList = resp.data;
                    let userSheetnames = workBook.SheetNames;
                    let missingSheetsErr = "";

                    let validUserShets: any = [];
                    for (let j = 0; j < userSheetnames.length; j++) {
                        let sheetName = userSheetnames[j];

                        let sheetExists = requiredTableList.filter(function (el: any) {
                            return el.tableName?.toLowerCase() == sheetName?.toLowerCase();
                        })

                        if (sheetExists && sheetExists.length > 0) {
                            validUserShets.push(sheetExists[0]);
                        }
                    }
                    if (validUserShets.length == 0) {
                        showError("Your excel file doesn't contain any valid worksheets.")
                        return false;
                    }
                    let requiredSheetNames = "";
                    //IMPORT MODE
                    let requiredToAddSheet = requiredTableList.filter(function (el: any) {
                        return el.requiredToAddRecord == true;
                    });

                    for (let k = 0; k < requiredToAddSheet.length; k++) {
                        let requiredSheetExists = validUserShets.filter(function (el: any) {
                            return el.tableName?.toLowerCase() == requiredToAddSheet[k].tableName?.toLowerCase();
                        });
                        if (requiredSheetExists.length == 0) {
                            if (requiredSheetNames == "")
                                requiredSheetNames = requiredToAddSheet[k].tableName;
                            else
                                requiredSheetNames += "," + requiredToAddSheet[k].tableName;
                        }
                    }

                    if (requiredSheetNames) {
                        showError(requiredSheetNames + " sheets required.");
                        return false;
                    }
                    let tableNamesCommaSeperated = '';
                    for (let i = 0; i < validUserShets.length; i++) {
                        tableNamesCommaSeperated += ';' + validUserShets[i].tableName;
                    }
                    setShowImportLoader(true);
                    getFieldList(connectionSetting, "IMPORT", entityName, tableNamesCommaSeperated).then((resp: any) => {
                        debugger;
                        if (resp.status == 200) {
                            if (resp.data) {
                                let fieldListAll = resp.data;
                                let rowDataTabArray: any = [];

                                for (let i = 0; i < validUserShets.length; i++) {
                                    const wsname: any = validUserShets[i].tableName;
                                    let fieldList = fieldListAll.filter(function (el: any) {
                                        return el.tableName?.toLowerCase() == wsname?.toLowerCase();
                                    });
                                    let requiredFieds = [];
                                    if (fieldList.length > 0) {
                                        requiredFieds = fieldList.filter(function (el: any) {
                                            return el.requiredToAddRecord == true;
                                        });
                                    }
                                    const excelSheetFind = workBook.SheetNames.filter(function (el: any) {
                                        return el?.toLowerCase() == wsname?.toLowerCase();
                                    });

                                    const ws = workBook.Sheets[excelSheetFind[0]];

                                    const data = XLSX.utils.sheet_to_json(ws, {
                                        header: 1,
                                        raw: false,
                                        blankrows: false
                                    })//.map(row => mapKeys(row, (value, key) => key.trim()));
                                    console.log(data)
                                    let header: any = data[0];
                                    debugger;
                                    if (header) {

                                        let headerArray: any = [];
                                        headerArray.push({
                                            field: "ErrorString",
                                            resizable: true,
                                            headerName: "ErrorString"
                                        });
                                        let ignoreColumns: any = [];
                                        header = header.map((data: any) => {
                                            let checkValidField = fieldList.filter(function (el: any) {
                                                return el.pName?.toLowerCase().trim() == data?.toLowerCase().trim();
                                            });
                                            if (checkValidField.length == 0) {
                                                data = data.trim();
                                                if (data?.toLowerCase().trim() != "recid" && data?.toLowerCase().trim() != "entid")
                                                    ignoreColumns.push(data);
                                                else {
                                                    headerArray.push({
                                                        field: data,
                                                        resizable: true,
                                                        headerName: data
                                                    });
                                                }
                                            }
                                            else {
                                                data = checkValidField[0].pName.trim();

                                                headerArray.push({
                                                    field: data,
                                                    resizable: true,
                                                    headerName: data
                                                });
                                            }

                                            return data
                                        });

                                        let excelData = [];
                                        for (let x = 1; x < data.length; x++) {
                                            let objetRow: any = data[x];
                                            let dataObject: any = {};
                                            // ignore row that has starting cell value = "!"
                                            let firstCharacter = typeof objetRow[0] === 'undefined' ? "" : Array.from(objetRow[0])[0];
                                            if (firstCharacter != "!") {
                                                header.map((data: any, index: number) => {
                                                    dataObject["" + data + ""] =
                                                        objetRow[index] !== undefined
                                                            ? String(objetRow[index])
                                                            : "";
                                                });
                                                excelData.push(dataObject);
                                            }
                                        }
                                        console.log(headerArray);
                                        for (let i = 0; i < excelData.length; i++) {
                                            for (let j = 0; j < ignoreColumns.length; j++) {
                                                delete excelData[i][ignoreColumns[j]];
                                            }
                                        }
                                        console.log(excelData);
                                        const uniq = headerArray
                                            .map((hd: any) => {
                                                return {
                                                    count: 1,
                                                    name: hd.field?.toLowerCase().trim()
                                                };
                                            }).reduce((result: any, b: any) => {
                                                result[b.name] = (result[b.name] || 0) + b.count;
                                                return result;
                                            }, {});

                                        let errorString = "";

                                        const duplicateHeader: any = Object.keys(uniq).filter((a: any) => uniq[a] > 1);
                                        if (duplicateHeader.length > 0) {
                                            errorString = "Duplicate columns found : " + duplicateHeader.toString()
                                        }
                                        debugger;
                                        if (!errorString) {
                                            let missingColumns = "";
                                            requiredFieds.map((data: any) => {
                                                let fieldName = data.pName;

                                                let isFieldExists = header.filter(function (el: any) {
                                                    return el?.toLowerCase() == fieldName?.toLowerCase();
                                                });
                                                if (isFieldExists.length == 0) {
                                                    if (missingColumns == "") {
                                                        missingColumns = fieldName;
                                                    }
                                                    else {
                                                        missingColumns += "," + fieldName;
                                                    }
                                                }

                                            });
                                            errorString = missingColumns == "" ? "" : missingColumns + " fields required in sheet."
                                        }

                                        headerArray = headerArray.filter(function (el: any) {
                                            return el.field?.toLowerCase() != "entid" && el.field?.toLowerCase() != "recid"
                                        });

                                        if (excelData.length > 0) {
                                            excelData[0].ErrorString = errorString;
                                            rowDataTabArray.push({
                                                sheetName: wsname,
                                                column: headerArray,
                                                rowData: excelData,
                                                checkboxSelected: true,
                                                isError: errorString ? 1 : 0
                                            });
                                        }
                                        else {
                                            rowDataTabArray.push({
                                                sheetName: wsname,
                                                column: headerArray,
                                                rowData: excelData,
                                                checkboxSelected: true,
                                                isError: 0
                                            });
                                        }
                                        // else {
                                        //     if (errorString)
                                        //         excelData.push({ ErrorString: errorString })
                                        // }
                                    }


                                }

                                let errorList = rowDataTabArray.filter(function (el: any) {
                                    return el.isError == 1
                                });
                                if (errorList.length > 0 || entityName.toLowerCase() == "staticdata") {
                                    setShowImportLoader(false);
                                    setValidWorksheetList((prevArray: any) => [
                                        ...prevArray,
                                        ...rowDataTabArray,
                                    ]);
                                }
                                else {

                                    databaseValidationOnSheet(rowDataTabArray);
                                }

                            }
                        }
                        else {
                            let message = getMessageFromArray(resp.errData);
                            showError(message);
                        }
                    });
                }
                else {
                    let message = getMessageFromArray(resp.errData);
                    showError(message);
                }
            });
        }
        else if (entityName.toLowerCase() == "em_data") {
            getValidTableList(connectionSetting, workBook.SheetNames).then((resp: any) => {
                if (resp.status == 200) {
                    let tableList = resp.data;
                    if (tableList.length > 0) {
                        let arrSheetList = [];
                        for (let i = 0; i < tableList.length; i++) {
                            arrSheetList.push(tableList[i].tableName)
                        }
                        loadValidWorksheetList(arrSheetList);
                    }
                    else {
                        showError("No valid worksheet found.");
                    }
                }
                else {
                    let message = getMessageFromArray(resp.errData);
                    showError(message);
                }
            })
        }
        else if (entityName.toLowerCase() == "em") {
            let arrSheetList = workBook.SheetNames.filter(function (el: any) {
                return el.toLowerCase().includes('em');
            });
            if (arrSheetList.length > 0) {
                loadValidWorksheetListForEM(arrSheetList);
            }
        }
        else {
            loadValidWorksheetList(workBook.SheetNames);
        }

    }

    const loadValidWorksheetList = (arrSheetList: any) => {
        let rowDataTabArray: any = [];
        for (let i = 0; i < arrSheetList.length; i++) {
            const wsname = arrSheetList[i];
            const ws = workBook.Sheets[wsname];
            if (ws) {
                let firstCell = ws["A1"]; // check first cell has value or not
                if (firstCell) {
                    let firstCellValue = firstCell.v;
                    if (firstCellValue) {
                        const data = XLSX.utils.sheet_to_json(ws, {
                            header: 1,
                            raw: false,
                            blankrows: false,
                            defval: ""
                        });
                        let header: any = data[0];

                        if (header) {
                            let headerArray: any = [];
                            // headerArray.push({
                            //     field: "ErrorString",
                            //     resizable: true,
                            //     headerName: "ErrorString"
                            // });
                            header = header.map((data: any) => {
                                data = data.trim();
                                headerArray.push({
                                    field: data,
                                    resizable: true,
                                    headerName: data
                                });
                                return data
                            });

                            let excelData = [];
                            for (let x = 1; x < data.length; x++) {
                                let objetRow: any = data[x];
                                let dataObject: any = {};
                                debugger;
                                let firstCharacter = typeof objetRow[0] === 'undefined' ? "" : Array.from(objetRow[0])[0];
                                if (firstCharacter != "!") {
                                    header.map((data: any, index: any) => {
                                        dataObject["" + data + ""] =
                                            objetRow[index] !== undefined
                                                ? String(objetRow[index]).trim()
                                                : "";
                                    });
                                    excelData.push(dataObject);
                                }
                            }
                            rowDataTabArray.push({
                                sheetName: wsname,
                                column: headerArray,
                                rowData: excelData,
                                checkboxSelected: true,
                                isError: 0
                            });
                        }
                    }
                }
            }
        }
        console.log(rowDataTabArray)

        setValidWorksheetList((prevArray: any) => [
            ...prevArray,
            ...rowDataTabArray,
        ]);
    }

    const loadValidWorksheetListForEM = (arrSheetList: any) => {
        let rowDataTabArray: any = [];
        let emSheetData = getSheetDataByName("EM");
        for (let i = 0; i < arrSheetList.length; i++) {
            const wsname = arrSheetList[i];
            const ws = workBook.Sheets[wsname];

            let filterEmDataBySheetName = emSheetData.filter(x => x.EMTable == wsname);

            let firstCell = ws["A1"]; // check first cell has value or not
            if (firstCell) {
                let firstCellValue = firstCell.v;
                if (firstCellValue) {
                    const data = XLSX.utils.sheet_to_json(ws, {
                        header: 1,
                        raw: false,
                        blankrows: false,
                        defval: ""
                    });
                    let header: any = data[0];

                    if (header) {
                        let headerArray: any = [];
                        // headerArray.push({
                        //     field: "ErrorString",
                        //     resizable: true,
                        //     headerName: "ErrorString"
                        // });
                        let ignoreColumns: any = [];
                        header = header.map((data: any) => {
                            data = data.trim();
                            let isValidColumn = filterEmDataBySheetName.filter(x => x.EMCol == data);
                            if (isValidColumn.length > 0 || wsname.toLowerCase() == "em") {
                                headerArray.push({
                                    field: data,
                                    resizable: true,
                                    headerName: data
                                });
                            }
                            else {
                                ignoreColumns.push(data);
                            }
                            return data
                        });

                        let excelData = [];
                        for (let x = 1; x < data.length; x++) {
                            let objetRow: any = data[x];
                            let dataObject: any = {};
                            debugger;
                            let firstCharacter = typeof objetRow[0] === 'undefined' ? "" : Array.from(objetRow[0])[0];
                            if (firstCharacter != "!") {
                                header.map((data: any, index: any) => {
                                    dataObject["" + data + ""] =
                                        objetRow[index] !== undefined
                                            ? String(objetRow[index]).trim()
                                            : "";
                                });
                                excelData.push(dataObject);
                            }
                        }

                        for (let i = 0; i < excelData.length; i++) {
                            for (let j = 0; j < ignoreColumns.length; j++) {
                                delete excelData[i][ignoreColumns[j]];
                            }
                        }
                        rowDataTabArray.push({
                            sheetName: wsname,
                            column: headerArray,
                            rowData: excelData,
                            checkboxSelected: true,
                            isError: 0
                        });
                    }
                }
            }
        }
        console.log(rowDataTabArray)

        setValidWorksheetList((prevArray: any) => [
            ...prevArray,
            ...rowDataTabArray,
        ]);
    }

    const getSheetDataByName = (sheetName: any) => {
        debugger;
        let excelData = [];
        const ws = workBook.Sheets[sheetName];
        if (ws) {
            let firstCell = ws["A1"]; // check first cell has value or not
            if (firstCell) {
                let firstCellValue = firstCell.v;
                if (firstCellValue) {
                    const data = XLSX.utils.sheet_to_json(ws, {
                        header: 1,
                        raw: false,
                        blankrows: false,
                        defval: ""
                    });
                    let header: any = data[0];

                    if (header) {
                        let headerArray: any = [];

                        header = header.map((data: any) => {
                            data = data.trim();
                            headerArray.push({
                                field: data,
                                resizable: true,
                                headerName: data
                            });
                            return data
                        });


                        for (let x = 1; x < data.length; x++) {
                            let objetRow: any = data[x];
                            let dataObject: any = {};
                            debugger;
                            let firstCharacter = typeof objetRow[0] === 'undefined' ? "" : Array.from(objetRow[0])[0];
                            if (firstCharacter != "!") {
                                header.map((data: any, index: any) => {
                                    dataObject["" + data + ""] =
                                        objetRow[index] !== undefined
                                            ? String(objetRow[index]).trim()
                                            : "";
                                });
                                excelData.push(dataObject);
                            }
                        }
                    }
                }
            }
        }
        return excelData;
    }
    const databaseValidationOnSheet = (sheetdata: any) => {

        let sheetJsonFormat: any = {};

        for (let i = 0; i < sheetdata.length; i++) {
            sheetJsonFormat[sheetdata[i].sheetName] = sheetdata[i].rowData;
        }

        let entityData: any = categories.filter(function (el: any) {
            return el.checkboxSelected === true;
        });

        let selectedEntity = entityData[0];

        setShowImportLoader(true);
        validateEntitySheet(connectionSetting, "IMPORT", selectedEntity.entityName, JSON.stringify(sheetJsonFormat)).then((resp: any) => {
            if (resp.status == 200) {
                let responseData = JSON.parse(resp.data);
                console.log(sheetdata)
                for (let j = 0; j < sheetdata.length; j++) {

                    let columnIndex = sheetdata[j].column.findIndex((x: any) => x.field == "ErrorString");
                    if (columnIndex === -1) {
                        sheetdata[j].column.unshift({
                            field: "ErrorString",
                            resizable: true
                        });
                    }

                    let newData = responseData[sheetdata[j].sheetName];
                    let errorList = newData.filter(function (el: any) {
                        return el.ErrorString != "";
                    });
                    if (errorList.length > 0) {
                        sheetdata[j].isError = 1;

                    }
                    else {
                        sheetdata[j].isError = 0;
                    }
                    sheetdata[j].rowData = newData;
                }
                setShowImportLoader(false);
                setValidWorksheetList((prevArray: any) => [
                    ...prevArray,
                    ...sheetdata,
                ]);
            }
            else {
                let message = getMessageFromArray(resp.errData);
                showError(message);
            }
        });
    }

    const ClearAllState = () => {
        setWorkBook({});
        setValidWorksheetList([]);
        setSelectedSheet({});
    }

    const LoadSelectedSheet = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, index: number, item: any) => {
        if (!disableWorksheetCheckboxs) {
            validWorksheetList.forEach((sheet: any) => {
                if (sheet.sheetName == item.sheetName) {
                    sheet.checkboxSelected = !item.checkboxSelected;
                }
            });
        }
        setSelectedSheet(validWorksheetList[index]);
        setValidWorksheetList([...validWorksheetList]);
    }

    const handleContinue = () => {
        debugger;
        if (!connectionSetting.serverName) {
            alert("Enter server name")
            return;
        }

        if (!connectionSetting.authentication) {
            alert("Select authentication")
            return;
        }
        else if (connectionSetting.authentication == "sql") {
            if (!connectionSetting.loginUserName) {
                alert("Enter login")
                return;
            }
            if (!connectionSetting.password) {
                alert("Enter password")
                return;
            }
        }
        if (!connectionSetting.databaseName) {
            alert("Enter database name")
            return;
        }

        if (databaseNamePatternValidation()) {
            alert("Database name should contain only characters and numbers")
            return;
        }
        if (!chkAgree) {
            alert("Please agree by selecting checkbox")
            return;
        }
        if (!showSpinner) {
            setShowSpinner(true);
            validateConnectionString(connectionSetting).then((resp: any) => {
                console.log(resp);
                debugger;
                setShowSpinner(false);
                if (resp.status == 200) {
                    setShowImportPage(true);
                }
                else {
                    let connectionString = resp.data.connectionString;
                    let message = getMessageFromArray(resp.errData);

                    showError("<b>Error:</b>" + message + "<br><b>ConnectionString:</b>" + connectionString, "Server connection or credential error");
                }
            })
        }

        let responseData: any = [{
            "entityCode": "EM",
            "checkboxSelected": false,
            "entityName": "EM",
            "description": "(Create Database: " + connectionSetting.databaseName + ")",
            "disableAllCheckbox": true
        },
        {
            "entityCode": "EM_Feature",
            "checkboxSelected": false,
            "entityName": "Feature",
            "description": "(Populate Feature Table)",
            "disableAllCheckbox": false
        },
        {
            "entityCode": "EM_Data",
            "checkboxSelected": false,
            "entityName": "EM_Data",
            "description": "(Populate Tables)",
            "disableAllCheckbox": false
        },
        {
            "entityCode": "EM_AP",
            "checkboxSelected": false,
            "entityName": "AP",
            "description": "(Populate Tables for Application Parameters)",
            "disableAllCheckbox": true
        }
        ];
        setCategories(responseData);

    }

    const handleAuthentication = (event: React.ChangeEvent<{ value: unknown }>) => {
        let selectedValue = event.target.value;
        setConnectionSetting(prevState => ({
            ...prevState,
            authentication: event.target.value,
        }))
    }

    const databaseNamePatternValidation = () => {
        const regex = new RegExp(/[^a-zA-Z0-9]/);
        return regex.test(connectionSetting.databaseName);
    };

    const selectAllWorksheet = (checked: any) => {
        setSelectAllWorksheetState(checked);
        validWorksheetList.forEach((obj: any) => {
            obj.checkboxSelected = checked;
        });
        setValidWorksheetList([...validWorksheetList]);
    }
    const handleFinalize = () => {
        if (window.confirm('Are you sure you want to continue?')) {
            setShowImportLoader(true);
            finalizeDatabase(connectionSetting).then((resp: any) => {
                setShowImportLoader(false);
                if (resp.status == 200) {
                    showSuccess("Finalize success")
                }
                else {
                    let message = getMessageFromArray(resp.errData);
                    showError(message);
                }
            })
        }
    }
    return (

        <Box style={{
        }}>
            
            <Grid container id="nz_header" className="nz-app-header" >
                <Grid id="nz_logo_bar">
                    <a
                        className="nz-logo-bar-link"
                        title="NetZoom for NetZoom Inc."
                        target="_blank"
                        href="https://www.netzoom.com/"
                    >
                        <img
                            className="nz-logo-image"
                            src="/Templates/iCons/Logo and Favicon/NetZoom_Logo.png"
                        />
                    </a>
                    <Typography className="nz-header-tagline" style={{ lineHeight: '40px' }}>Entity Management Tool</Typography>
                    {showImportPage &&
                        <Button variant="contained" onClick={handleFinalize} style={{ marginRight: "5px", position: "absolute", right: "0px" }}>
                            Finalize
                        </Button>
                    }
                </Grid>
            </Grid>
            {!showImportPage && <div>
                <Box sx={{ width: '100%', maxWidth: 500 }}>
                    <h3 className="top-title">IMPORTANT</h3>
                    <div style={{ marginLeft: "17px" }}>
                        <div className='in-title'>
                            Entity Management Tool
                        </div>
                        <div className='in-sub-title'>
                            Requirement to Use:
                        </div>
                        <div className='in-text'>
                            User must be familiar with NetZoom Entities and their profiles.
                        </div>
                        <div className='in-sub-title'>
                            What is it ?
                        </div>
                        <div className='in-text'>
                            Entity Management Tool is designed and developed to create all Entities implemented in NetZoom.
                        </div>
                        <div className='in-sub-title'>
                            What does it do?
                        </div>
                        <div className='in-text'>
                            Tool expects user to select an excel file (like EM.XLSX) having NetZoom Entity profiles.
                        </div>
                        <div className='in-sub-title'>
                            After validating that Excel file worksheets confirm to the NetZoom Entities requirement, Tool performs following functions:
                        </div>
                        <div className='in-text'>
                            Create a new database
                        </div>
                        <div className='in-text'>
                            Executes a SQL script that populates EM specific SQL programmability objects (procedures and functions) in newly created database.
                        </div>
                        <div className='in-text'>
                            Create all tables that are provided in worksheets of selected Excel file
                        </div>
                        <div className='in-text'>
                            Populates basic data in worksheets to respective tables
                        </div>
                        <hr className='mt8' />
                        <div style={{ marginTop: "15px" }}>
                            <div style={{ marginBottom: "15px", width: '30%' }}>
                                <TextField
                                    size="small"
                                    fullWidth={true}
                                    autoComplete='off'
                                    label='Server name'
                                    value={connectionSetting.serverName}
                                    onChange={e => setConnectionSetting(prevState => ({
                                        ...prevState,
                                        serverName: e.target.value,
                                    }))}
                                    inputProps={{ maxLength: 64 }}
                                    InputLabelProps={{ shrink: true }}
                                    style={{ marginRight: "15px" }}
                                />
                            </div>
                            <div style={{ marginBottom: "15px", width: '30%' }}>
                                <FormControl fullWidth={true} size="small">
                                    <InputLabel shrink={true} >Authentication</InputLabel>
                                    <Select
                                        notched={true}
                                        label="Authentication"
                                        value={connectionSetting.authentication}
                                        onChange={(e: any) => handleAuthentication(e)}
                                    >
                                        <MenuItem value={"windows"}>Windows Authentication</MenuItem>
                                        <MenuItem value={"sql"}>SQL Authentication</MenuItem>
                                    </Select>
                                </FormControl>
                            </div>
                            {
                                (connectionSetting.authentication == "sql" || connectionSetting.authentication == "") &&
                                <>
                                    <div style={{ marginBottom: "15px", width: '30%' }}>
                                        <TextField
                                            size="small"
                                            fullWidth={true}
                                            autoComplete='off'
                                            label='Login'
                                            value={connectionSetting.loginUserName}
                                            onChange={e => setConnectionSetting(prevState => ({
                                                ...prevState,
                                                loginUserName: e.target.value,
                                            }))}
                                            inputProps={{ maxLength: 64 }}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </div>
                                    <div style={{ marginBottom: "15px", width: '30%' }}>
                                        <TextField
                                            size="small"
                                            fullWidth={true}
                                            autoComplete='off'
                                            label='Password'
                                            value={connectionSetting.password}
                                            onChange={e => setConnectionSetting(prevState => ({
                                                ...prevState,
                                                password: e.target.value,
                                            }))}
                                            inputProps={{ maxLength: 64, type: "password" }}
                                            style={{ marginRight: "15px" }}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </div>
                                </>
                            }
                            <div style={{ marginBottom: "15px", width: '30%' }}>
                                <TextField
                                    size="small"
                                    fullWidth={true}
                                    autoComplete='off'
                                    label='Database name'
                                    value={connectionSetting.databaseName}
                                    onChange={e => setConnectionSetting(prevState => ({
                                        ...prevState,
                                        databaseName: e.target.value,
                                    }))}
                                    inputProps={{ maxLength: 64 }}
                                    style={{ height: "15px" }}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: "20px", width: '30%' }}>
                            <FormGroup>
                                <FormControlLabel control={
                                    <>
                                        <Checkbox style={{ padding: 0, marginRight: 5 }} checked={chkAgree}
                                            onChange={(event, checked) => setChkAgree(checked)}
                                        />
                                    </>
                                } label=" I agree" />
                            </FormGroup>

                        </div>
                        <div>
                            <Button variant="contained" disabled={!chkAgree} onClick={handleContinue} style={{ marginRight: "17px" }}>
                                Continue &nbsp;&nbsp;{showSpinner && <CircularProgress size={20} style={{ 'color': '#FFF' }} />}
                            </Button>
                        </div>

                    </div>
                </Box>
            </div>
            }
            {showImportPage && <Grid container spacing={1} style={{ marginTop: 0, height: 'calc(100vh - 45px)' }}>
                <Split minPrimarySize='15%' minSecondarySize='20%' initialPrimarySize='15%' splitterSize="5px">
                    <Grid key={120} item >
                        <List
                            component="nav"
                            aria-labelledby="nested-list-subheader"
                            subheader={
                                <>
                                    <ListSubheader component="div" id="nested-list-subheader" style={{ fontSize: '16px', paddingLeft: '17px' }}>
                                        EM Tool
                                        <Divider />
                                    </ListSubheader>
                                </>
                            }
                            style={{
                                width: '100%',
                                height: 'Calc(100vh - 10px)',
                                overflow: 'auto',
                                backgroundColor: 'background.paper',
                            }}
                        >
                            {
                                categories && (
                                    categories.map((item: any, index: number) => {
                                        return (
                                            <>
                                                <ListItemButton key={index}
                                                    selected={item.checkboxSelected}
                                                    onClick={(event) => handleEntityClick(event, index, item)}
                                                    style={{ paddingLeft: "17px !important" }}
                                                >
                                                    <Checkbox
                                                        checked={item.checkboxSelected}
                                                        onChange={(event, checked) => handleEntitySelect(event, checked, item)}
                                                        indeterminate={item.indeterminate}
                                                        style={{ padding: 0 }}
                                                    />
                                                    <ListItemText primary={item.entityCode} style={{ marginLeft: '8px' }} />
                                                </ListItemButton>
                                            </>
                                        )
                                    })
                                )}
                        </List>
                    </Grid>

                    <Grid className='rt-grid-div' key={125} item style={{ height: '100%', width: '100%' }}>
                        <div>
                            <h3 className="top-title">Imports {title}</h3>

                            <div className="top-brows">
                                <div className="brows-text">Excel File:</div>
                                <label className="file">
                                    <input
                                        type="file"
                                        id="file"
                                        onChange={handleOnFileChange}
                                        aria-label="File browser example"
                                    />
                                    <span className="file-custom">
                                        <span>{chooseFileName}</span>
                                    </span>
                                </label>
                                <div className="bootom-btn">
                                    <Button disabled={validWorksheetList.length == 0} title="Create database, populate programmability, validate data in worksheets and import"
                                        variant="contained" onClick={handleImport}>Import</Button>
                                </div>
                            </div>
                            {showImportLoader && <Box sx={{ width: '100%' }}>
                                <LinearProgress />
                            </Box>}
                            <div className="d-flex">

                                <div className="w20p">
                                    <h3 className="top-title1">
                                        {/* checkstyle */}
                                        <Checkbox style={{ padding: 0 }}
                                            disabled={disableWorksheetCheckboxs}
                                            checked={selectAllWorksheetState}
                                            onChange={(e) => selectAllWorksheet(e.target.checked)}
                                        />
                                        <label style={{ marginLeft: '8px' }}>Worksheet ({validWorksheetList.length})</label>
                                    </h3>

                                    <div className="chckpoint-box">
                                        {validWorksheetList.length == 0 && (
                                            <div className="no-sheet">No sheets</div>
                                        )}
                                        {
                                            validWorksheetList.map((data: any, index: number) => {
                                                return (
                                                    <ListItemButton key={index} style={{ paddingLeft: "10px !important" }}
                                                        selected={data.sheetName == selectedSheet.sheetName}
                                                        onClick={(event) => { LoadSelectedSheet(event, index, data) }}
                                                    >
                                                        <Checkbox
                                                            style={{ padding: 0 }}
                                                            checked={data.checkboxSelected}
                                                            disabled={disableWorksheetCheckboxs}
                                                        />
                                                        <ListItemText

                                                            primary={`${data.sheetName} (${data.rowData.length})`}
                                                            style={{ marginLeft: '8px' }}
                                                        />
                                                        {data.isError == 1 &&
                                                            <div> <Error fontSize="medium" color="error" /></div>
                                                        }
                                                    </ListItemButton>
                                                )
                                            })
                                        }
                                    </div>
                                </div>
                                <div className="ws-210">
                                    <h3 className="top-title">Preview records by sheets</h3>
                                    {!selectedSheet.rowData && (
                                        <div className="no-sheet">No records to show</div>
                                    )}
                                    {selectedSheet.rowData && (
                                        <AgDataGrid columns={selectedSheet.column} data={selectedSheet.rowData}></AgDataGrid>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Grid>
                </Split>

            </Grid>
            }

            <Dialog maxWidth={'sm'} fullWidth={true}
                open={errorProps.show}>
                <DialogTitle className='error-dialog-title'><span style={{
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    {errorProps.isError && <Dangerous fontSize="large" color="error" style={{ marginRight: '5px' }} />}
                    {!errorProps.isError && <CheckCircle fontSize="large" color="success" style={{ marginRight: '5px' }} />}
                    {errorProps.title}</span></DialogTitle>
                <DialogContent className='error-dialog-content'>
                    <DialogContentText dangerouslySetInnerHTML={{ __html: errorProps.error }}>
                        {/* {errorProps.error} */}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus variant="contained" style={{ backgroundColor: '#A30000' }} onClick={handleErrorPopupClose}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box >


    );
}
export default ImportEM;