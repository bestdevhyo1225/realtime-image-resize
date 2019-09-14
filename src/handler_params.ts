export interface Event {
    body    : string;
    Records : [{ 
        cf : {
            request  : any;
            response : any;
        } 
    }];
}

export interface CallbackFunc {
    (error: Error, response?: any): void;
}

export interface Response {
    status            : number;
    statusDescription : string;
    contentHeader     : [{ [key: string] : string }];
    cacheControl?     : [{ [key: string] : string }]; 
    body              : string;
    bodyEncoding?     : string;       
}