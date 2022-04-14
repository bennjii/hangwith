import { env } from "process";

const config = {
    webSocketUrl: env.RT_URL ? env.RT_URL : "INVALID_URL",
};

export default config;