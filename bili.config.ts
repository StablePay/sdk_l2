import { Config } from "bili";

const config: Config = {
    plugins: {
        typescript2: {
            tsconfigOverride: {
                include: ["src"]
            }
        }
    },
    input: "src/index.ts",
    output: {
        format: ["cjs", "esm"]
    }
};

export default config;
