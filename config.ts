import { env } from "process";

const config = {
    webSocketUrl: env.RT_URL ? env.RT_URL : "ws://localhost:8080",
};

export default config;