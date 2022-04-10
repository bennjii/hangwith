import { Query } from "./query"

type Request = {
    query: {
        qtype: "get" | "set" | "set.room" | "init" | "update" | "subscribe" | "unsubscribe", 
        message: string,
        location: string,
        limiter?: {
            ltype: "newest" | "oldest" | "all",
            amount: number
        },
    },
    bearer: {
        auth_token: string,
        auth_id: string
    },
    nonce?: string
}

export type Message = { 
    author: string,
    content: string,
    created_at: string
}

export type Subscription = { 
    message: string,
    nonce: string,
    type: string,
    location: string,
    call: Function
}

export type Response = {
    type: "error" | "reply" | "update",
    message: "OK" | "200" | "406" | "404", // Error Object
    content?: {
        Chat?: {
            messages: Message[],
            title: string
        },
        Room?: {
            callee_candidates: string,
            caller_candidates: string,
            offer: string,
            answer: string,
            id: string
        }
    },
    location?: string,
    nonce: string
}

export type QueryResponse = {
    response: Response,
    ref: Query
}

export default Request;