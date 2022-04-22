import Request, { Subscription, Response } from '../@types';
import config from '@root/config'
import { randomBytes } from "crypto";

const nonces = new Set();
function getNonce(): string {
	let nonce = '';
	while (nonce === '' || nonces.has(nonce)) {
		nonce = randomBytes(4).toString('hex');
	}
	nonces.add(nonce);
	return nonce;
}

const subscriptions: Subscription[] = new Array();
const request_cache: Query[] = new Array();
class RTQueryHandler {
    //@ts-expect-error
    ws: WebSocket;
    latency: number;

    constructor() { 
        this.latency = 0;
    };

    public init(onstart?: Function) {
        // if(!process.env.RT_URL) return;
        
        console.log(`Starting on ${config.webSocketUrl}`);
        this.ws = new WebSocket(config.webSocketUrl);

        this.ws.onmessage = this.handleMessage;
        
        this.ws.onclose = () => {
            // Restart Lost Connection
            this.init();

            subscriptions.map(e => {
                new Query(this).in(e.location).subscribe(e.message);
            })
        }
        
        return new Promise(r => {
            this.ws.onopen = () => {
                new Query(this).init();
    
                if(onstart) onstart();
                r(this);
            }
        });
    }

    private handleMessage(ev: MessageEvent<any>) {
        const data_ = JSON.parse(ev.data);
        console.log("Incoming", data_);

        console.log(subscriptions);

        if(data_.type.includes("update") && subscriptions) subscriptions.find((e) => e.location = data_.location)?.call({ response: data_ })
    }

    private wrapQuery(query: Request) {
        console.log("Outgoing", query);

        if(this.ws.readyState !== this.ws.OPEN) return false;
        else {
            this.ws.send(JSON.stringify(query));
            return true;
        }
    }

    public sendQuery(query: Query) {
        const d = new Date();

        return new Promise(r => {
            const nonce = getNonce();

            const send = this.wrapQuery({ 
                ...query.request,
                nonce
            });

            if(send) {
                const listener = (_res: MessageEvent<any>) => {
                    try {
                        let res = JSON.parse(_res.data);
                        if(res?.nonce == nonce) {
                            const dt = new Date();
                            this.latency = dt.getTime() - d.getTime(); 

                            r(res);
                        }
                    } catch(e) {}
                }
    
                this.ws.addEventListener("message", listener);
            }else {
                console.log("Request - Failed. Trying again when connection is restored.");
                request_cache.push(query);
                // setTimeout(() => {
                //     this.sendQuery(query)
                // }, 50);
            }
        });
    }
}

class Query {
    request: Request;
    ws: RTQueryHandler;
    callback: Function;

    constructor(websocket: RTQueryHandler) { 
        this.ws = websocket;
        this.request = {
            query: {
                qtype: "get", 
                message: "",
                location: "",
                limiter: {
                    ltype: "newest",
                    amount: 15
                },
            },  
            bearer: {
                auth_token: "",
                auth_id: "15c"
            }
        };
        this.callback = () => {};
    }
    
    type(type: Request["query"]["qtype"]) {
        this.request.query.qtype = type;
        return this;
    }

    in(guild_id: string) {
        this.request.query.location = guild_id;
        return this;
    }
    
    init() {
        this.request.query.qtype = "init";

        return this.sendOff();
    }

    get(message: string) {
        this.request.query.qtype = "get";
        this.request.query.message = message;

        return this.sendOff();
    }

    set(message: string) {
        if(message == "room") {
            this.request.query.qtype = "set.room";
            this.request.query.message = "init";
        }else {
            this.request.query.qtype = "set";
            this.request.query.message = message;
        }

        return this.sendOff();
    }

    delete() {
        this.request.query.qtype = "delete";
        this.request.query.message = "*";

        return this.sendOff();
    }

    /**
     * 
     * @param message Indicates the parameter being changed. format: [property].[new_value]
     */
    update(property: string, value: string) {
        this.request.query.qtype = "update";
        this.request.query.message = `${property}&&${value}`;

        return this.sendOff();
    }

    subscribe(message?: string, callback?: Function) {
        this.request.query.qtype = "subscribe";
        this.request.query.message = message ? message : "";
        this.callback = callback ? callback : this.callback;

        return this.sendOff();
    }

    unsubscribe(message?: string, callback?: Function) {
        this.request.query.qtype = "unsubscribe";
        this.request.query.message = message ? message : "";
        this.callback = callback ? callback : this.callback;

        return this.sendOff();
    }

    private sendOff(): Promise<{response: Response, ref: Query}> {
        return new Promise(r => {
            this.ws.sendQuery(this)
            .then((value: unknown) => {
                const e = value as Response;
                console.log("Returned", e);
                
                r({ response: e, ref: this });

                if(this.callback && e.message !== "404" && e.message !== "406" && this.request.query.qtype == "subscribe") subscriptions.push({ ...e, location: this.request.query.location, call: this.callback });
                // if(this.callback) this.callback({ response: e, ref: this });
            })
        })
    }
}

export { RTQueryHandler, Query, subscriptions };