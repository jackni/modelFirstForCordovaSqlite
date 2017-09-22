
interface SqliteResult {
    affectedRows: number;
    insertId: number;
}

export default class DatabaseService {
    private dbInstanceName = 'yourinstance.db';
    private offlineInstance: any;
 
    constructor() {
        this.offlineInstance = this.storageInstance(this.dbInstanceName);
    }
 
    private storageInstance = (instanceName: string): any => {
        const windowObj = Window.prototype;
        if ((window as any).cordova) {
            console.info('cordova found.');
            const SQLite = (window as any).cordova.require('cordova-sqlite-plugin.SQLite');
            //init a new db intance
            const sqliteInstance = new SQLite(instanceName);
            return sqliteInstance;
 
        } else {
            console.info('no cordova found.');
            return undefined;
        }
    }
   
    OpenDB = (): Promise<any> => {
        return new Promise<any>(
            (resolve: any, reject: any) => {
                this.offlineInstance.open(
                    (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    }
                );
            }
        );
    }
 
    CloseDB = (): Promise<any> => {
        return new Promise(
            (resolve, reject) => {
                this.offlineInstance.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                })
            }
        );
    }
 
    QueryRunnerWithParamsAsync = (query: string, params: Array<string>): Promise<any> => {
        return new Promise(
            (resolve, reject) => {
                this.offlineInstance.query(query, params, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        // console.debug(results);
                        resolve(results);
                    }
                });
            }
        );
    }
 
    public ExecuteQueryNoResultAsync(query: string): Promise<void> {
        return this.OpenDB().then(
            () => {
                console.debug(`webQL: ${query}`);
                this.QueryRunnerWithParamsAsync(query, [])
                .then(
                    (results: SqliteResult) => {
                        console.debug(results);
                    }
                ).catch((err) => {
                    console.error(err);
                })
            }           
        )
        .then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch((err)=> console.error(err));
    }
 
    //function that can delele offline instance.
    public purageStoreAsync(): Promise<void> {
        return new Promise<any>(
            (resolve, reject) => {
                this.offlineInstance.deleteDatabase(this.dbInstanceName, (err, results) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results);
                    }
                })
            }
        );
    }
 
    public CreateTableAsync<T>(typeName: string, createObj: T): Promise<void> {
        return this.OpenDB().then(()=>{
            const tableProperties = Object.getOwnPropertyNames(createObj);
            let fields = '';
            tableProperties.map(
                p=> {
                    fields = fields + `,${p}`;
                }
            )
            fields = fields.substring(1);
            const webQL = `CREATE TABLE IF NOT EXISTS ${typeName} (${fields})`;
            console.debug(`webQL: ${webQL}`);
            this.QueryRunnerWithParamsAsync(webQL, []).then(
                (results: SqliteResult) => {
                    console.debug(results);
                }
            ).catch((err) => {
                console.error(err);
            })
        })
        .then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch((err) => {
            console.error(err);
        });
    }
 
    public InsertDataAsync<T>(typeName: string, insertObj: T): Promise<void> {
        return this.OpenDB().then(() => {
            const insertMap: Map<string,string> = new Map<string,string>();
            Object.getOwnPropertyNames(insertObj).map(
                p=> {
                    insertMap.set(p,insertObj[p]);
                }
            )
            const fields = Array.from(insertMap.keys()).join(',');
            const values = Array.from(insertMap.values());
            const length = values.length;
            let placeHolders = '';
 
            Array.from(insertMap.values()).forEach((item, index) => {
                placeHolders = placeHolders + `? ${index < length - 1 ? ',' : ''}`;
            });
 
            const webQL = `INSERT INTO ${typeName} (${fields}) VALUES (${placeHolders})`;
            console.debug(`webQL: ${webQL}`);
            this.QueryRunnerWithParamsAsync(webQL, values).then(
                (results: SqliteResult) => {
                    console.debug(results);
                }
            ).catch((err) => {
                console.error(err);
            });
        })
        .then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch(err=>console.error(err));
    }
 
    public DropTableAsync(typeName: string): Promise<void> {
        return this.OpenDB().then(
            ()=> {
                const webQL = `DROP TABLE IF EXISTS ${typeName}`;
                console.debug(`webQL: ${webQL}`);
                this.QueryRunnerWithParamsAsync(webQL, []).then(
                    (results: SqliteResult) => {
                        console.debug(results);
                    }
                ).catch((err) => {
                    console.error(err);
               });
            }
        ).then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch(err=>console.error(err));
    }
 
    public InsertDataByMapAsync(tableName: string, createObj: Map<string, string>): Promise<any> {
        return this.OpenDB().then(() => {
            const fields = Array.from(createObj.keys()).join(',');
            const values = Array.from(createObj.values());
            const length = values.length;
            let placeHolders = '';
 
            Array.from(createObj.values()).forEach((item, index) => {
                placeHolders = placeHolders + `? ${index < length - 1 ? ',' : ''}`;
            });
 
            const webQL = `INSERT INTO ${tableName} (${fields}) VALUES (${placeHolders})`;
 
            console.debug(`insert webQL: ${webQL}`);
            this.QueryRunnerWithParamsAsync(webQL, values).then(
                (results: SqliteResult) => {
                    console.debug(results);
                }
            ).catch((err) => {
                console.error(err);
            });
        }).then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch(err => console.error(err));
    }
 
    public updateDataByMapAsync(tableName: string, updateObj: Map<string,string>, conditionObj: Map<string,string>): Promise<void> {
        return this.OpenDB().then(
            ()=> {
                let updatableSet = ',';
                updateObj.forEach((val, key) => {
                    //constructing update set
                    updatableSet = updatableSet + `${key} = '${val}' `;
                });
                updatableSet = updatableSet.substring(1);
 
                let conditionalSet = '';
                conditionObj.forEach((val, key) => {
                    //constructing where condition
                    conditionalSet = conditionalSet + ` and ${key} = '${val}'`;
                });
                const webQL = `UPDATE ${tableName} set ${updatableSet} WHERE 1=1 ${conditionalSet}`;
                console.debug(`Update WebQL: ${webQL}`);
                this.QueryRunnerWithParamsAsync(webQL, []).then(
                    (results: SqliteResult) => {
                        console.debug(results);
                    }
                ).catch((err) => {
                    console.error(err);
                });
            }           
        ).then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        )
        .catch(err=>console.error(err));
    }
 
    public GetDataFromTableAsync<T>(tableName: string): Promise<Array<T>> {
        return new Promise<Array<T>>(
            (resolve, reject) => {
                const result: Array<T> = new Array<T>();
                this.offlineInstance.open(
                    (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            const webQL = `SELECT * FROM ${tableName}`;
                            this.offlineInstance.query(webQL, [], (err, results) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    result.push(results.rows);
                                    resolve(result);
                                    // return result;
                                }
                            });
                        }
                    }
                    //todo: close db                   
                );
            }
        );
    }       
 
    public DeleteDataFromTableAsync<T>(tableName: string, delObj: T): Promise<void> {
        return this.OpenDB().then(
            () => {               
                let conditionalSet = '';
                Object.getOwnPropertyNames(delObj).map(
                    (p)=> {
                        if(delObj[p]) {                           
                            //constructing where condition
                            conditionalSet = conditionalSet + ` and ${p} = '${delObj[p]}'`;       
                        }
                    }
                );
                const webQL = `DELETE FROM ${tableName} WHERE 1=1 ${conditionalSet}`;
                console.debug(`WebQL: ${webQL}`);
                this.QueryRunnerWithParamsAsync(webQL, []).then(
                    (results: SqliteResult) => {
                        console.debug(results);
                    }
                ).catch((err) => {
                    console.error(err);
                });
            }
        ).then(
            () => this.CloseDB().then(
                () => console.debug('db closed')
            )
        ).catch((err)=>console.error(err));
    }
}
