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

    if (room.hostPlayerId !== conn.playerId) {
      await sendToPlayer(connectionId, { action: "error", message: "Only the host can open the buzzer" });
      return { statusCode: 403, body: "" };
    }

    room.buzzState = { open: true, buzzes: [] };

    await putItem({
      ...roomKey(conn.roomCode),
      ...room,
    });

    const allConnectionIds = room.players.map((p) => p.connectionId);
    await broadcast(allConnectionIds, {
      action: "buzzerOpen",
    });

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("openBuzzer error:", err);
    await sendToPlayer(connectionId, { action: "error", message: "Failed to open buzzer" });
    return { statusCode: 500, body: "" };
  }
};
