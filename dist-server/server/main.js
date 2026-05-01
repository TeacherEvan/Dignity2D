import { createAppServer } from "./index";
const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const app = createAppServer();
async function main() {
    const activePort = await app.listen(Number.isNaN(port) ? 8787 : port);
    process.stdout.write(`Dignity Arcade server listening on http://127.0.0.1:${activePort}\n`);
}
void main();
async function shutdown(signal) {
    process.stdout.write(`Shutting down on ${signal}\n`);
    await app.close();
    process.exit(0);
}
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
