import { env } from "process";

const config = {
    webSocketUrl: env.RT_URL ? env.RT_URL : "ws://localhost:8000",
};

export default config;