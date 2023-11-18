let API_URL = "https://localhost:7115/";

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  // dev code
  API_URL = "https://localhost:7115/";
} else {
  // production code
  let hostUrl = window.location.protocol + '//' + window.location.host;
  API_URL = `${hostUrl}/API/`;
}

//const API_URL = "https://10.0.254.24:2525/MVAPI/";
const myHeaders = new Headers({
  Accept: "application/json",
  "Content-Type": "application/json;charset=UTF-8",
});

export function validateConnectionString(connectionSetting: object) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/set_connection_settings`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(connectionSetting),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export function getDatabaseName() {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/get_connection_settings`, {
        method: "GET"
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}


export function importEm(connectionSetting: object, entityName: string, jsonString: string) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/import_em`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connectionSetting: connectionSetting,
          jsonString: jsonString,
          entityName: entityName
        }),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export function validateEntitySheet(
  connectionSetting: object,
  mode: string,
  entityName: string,
  jsonString: string
) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/validate_entity_sheet`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connectionSetting: connectionSetting,
          mode: mode,
          entityName: entityName,
          jsonString: jsonString
        }),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}


export function getPgTables(
  connectionSetting: object,
  entityName: string
) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/get_pg_tables`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connectionSetting: connectionSetting,
          entityName: entityName
        }),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export function getFieldList(
  connectionSetting: object,
  mode: string,
  entityName: string,
  tableNames: string
) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/get_field_list`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connectionSetting: connectionSetting,
          mode: mode,
          entityName: entityName,
          tableNames: tableNames,
        }),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}

export function getValidTableList(
  connectionSetting: object,
  tableList: any
) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/get_valid_table_list`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify({
          connectionSetting: connectionSetting,
          tableList: tableList,
        }),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });

}

export function finalizeDatabase(connectionSetting: object) {
  return new Promise((resolve, reject) => {
    try {
      fetch(API_URL + `emtool/finalize`, {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(connectionSetting),
      })
        .then((resp: any) => {
          return resp.json();
        })
        .then((result: any) => {
          resolve(result);
        });
    } catch (error) {
      reject(error);
    }
  });
}