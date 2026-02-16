import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";
import { getItem, putItem, connectionKey, roomKey } from "../shared/dynamo.js";
import { sendToPlayer, broadcast } from "../shared/broadcast.js";
import { RoomMeta } from "../shared/types.js";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const conn = await getItem<{ roomCode: string; playerId: string }>(
      connectionKey(connectionId)
    );
    if (!conn) {
      await sendToPlayer(connectionId, { action: "error", message: "Not in a room" });
      return { statusCode: 400, body: "" };
    }

    const room = await getItem<RoomMeta & { PK: string; SK: string; ttl: number }>(
      roomKey(conn.roomCode)
    );
    if (!room) {
      await sendToPlayer(connectionId, { action: "error", message: "Room not found" });
      return { statusCode: 404, body: "" };
    }

    const alreadyBuzzed = room.buzzState.buzzes.some((b) => b.playerId === conn.playerId);
    if (alreadyBuzzed) {
      await sendToPlayer(connectionId, { action: "error", message: "Already buzzed" });
      return { statusCode: 400, body: "" };
    }

    const player = room.players.find((p) => p.playerId === conn.playerId);
    if (!player) {
      await sendToPlayer(connectionId, { action: "error", message: "Player not found" });
      return { statusCode: 400, body: "" };
    }

    const buzz = {
      playerId: conn.playerId,
      name: player.name,
      timestamp: Date.now(),
    };

    room.buzzState.buzzes.push(buzz);
    room.buzzState.locked = true;

    await putItem({
      ...roomKey(conn.roomCode),
      ...room,
    });

    const allConnectionIds = room.players.map((p) => p.connectionId);
    await broadcast(allConnectionIds, {
      action: "buzzed",
      buzzes: room.buzzState.buzzes,
      locked: room.buzzState.locked,
    });

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("buzz error:", err);
    await sendToPlayer(connectionId, { action: "error", message: "Failed to buzz" });
    return { statusCode: 500, body: "" };
  }
};
