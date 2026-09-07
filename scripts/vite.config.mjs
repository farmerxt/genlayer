import fs from "node:fs";
import path from "node:path";

const repositoryRoot = process.cwd();
const contractPath = path.resolve(repositoryRoot, "contracts/AgentzProofVerifier.py");

export default {
  root: path.resolve(repositoryRoot, "scripts"),
  plugins: [
    {
      name: "serve-agentzproof-contract-source",
      configureServer(server) {
        server.middlewares.use("/contracts/AgentzProofVerifier.py", (_request, response) => {
          try {
            const source = fs.readFileSync(contractPath);
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/plain; charset=utf-8");
            response.end(source);
          } catch (error) {
            response.statusCode = 500;
            response.end(`Unable to serve AgentzProofVerifier.py: ${String(error)}`);
          }
        });
      },
    },
  ],
  server: {
    fs: {
      allow: [repositoryRoot],
    },
  },
  resolve: {
    alias: [
      {
        find: "genlayer-js/chains",
        replacement: path.resolve(repositoryRoot, "frontend/node_modules/genlayer-js/dist/chains/index.js"),
      },
      {
        find: "genlayer-js/types",
        replacement: path.resolve(repositoryRoot, "frontend/node_modules/genlayer-js/dist/types/index.js"),
      },
      {
        find: "genlayer-js",
        replacement: path.resolve(repositoryRoot, "frontend/node_modules/genlayer-js/dist/index.js"),
      },
    ],
  },
};
