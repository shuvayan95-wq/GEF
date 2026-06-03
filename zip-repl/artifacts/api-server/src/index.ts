import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { recalculateAllMarketValues } from "./lib/marketValue.js";
import { recalculateAllTeamIncomes } from "./lib/incomeCalculator.js";
import { setIO } from "./routes/ceremony";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/api/socket.io",
});

setIO(io);

let viewerCount = 0;

io.on("connection", (socket) => {
  viewerCount++;
  logger.info({ id: socket.id, viewers: viewerCount }, "Socket.io client connected");
  io.emit("ceremony:viewers", viewerCount);

  socket.on("disconnect", () => {
    viewerCount = Math.max(0, viewerCount - 1);
    logger.info({ id: socket.id, viewers: viewerCount }, "Socket.io client disconnected");
    io.emit("ceremony:viewers", viewerCount);
  });
});

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  recalculateAllMarketValues("Season initial valuation").catch((e) =>
    logger.error({ err: e }, "Market value recalculation failed on startup")
  );

  recalculateAllTeamIncomes("Server startup").catch((e) =>
    logger.error({ err: e }, "Team income recalculation failed on startup")
  );
});
