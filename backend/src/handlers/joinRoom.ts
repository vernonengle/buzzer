import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";
import { getItem, putItem, roomKey, playerKey, connectionKey, ttl } from "../shared/dynamo.js";
import { sendToPlayer, broadcast } from "../shared/broadcast.js";
import { RoomMeta } from "../shared/types.js";
import { randomUUID } from "crypto";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const body = JSON.parse(event.body ?? "{}");
    const roomCode: string = body.roomCode?.trim().toUpperCase();
    const name: string = body.name?.trim();

    if (!roomCode || !name) {
      await sendToPlayer(connectionId, { action: "error", message: "Room code and name are required" });
      return { statusCode: 400, body: "" };
    }

    const room = await getItem<RoomMeta & { PK: string; SK: string; ttl: number }>(
      roomKey(roomCode)
    );
    if (!room) {
      await sendToPlayer(connectionId, { action: "error", message: "Room not found" });
      return { statusCode: 404, body: "" };
    }

    const playerId = randomUUID();
    const player = { connectionId, playerId, name };

    room.players.push(player);

    await putItem({
      ...roomKey(roomCode),
      ...room,
    });

    await putItem({
      ...playerKey(roomCode, playerId),
      connectionId,
      playerId,
      name,
      roomCode,
      ttl: ttl(),
    });

    await putItem({
      ...connectionKey(connectionId),
      roomCode,
      playerId,
      GSI1PK: `ROOM#${roomCode}`,
      GSI1SK: `CONN#${connectionId}`,
      ttl: ttl(),
    });

    const playerList = room.players.map((p) => ({ playerId: p.playerId, name: p.name }));

    await sendToPlayer(connectionId, {
      action: "roomJoined",
      roomCode,
      playerId,
      players: playerList,
      hostPlayerId: room.hostPlayerId,
      buzzState: room.buzzState,
    });

    const otherConnectionIds = room.players
      .filter((p) => p.playerId !== playerId)
      .map((p) => p.connectionId);

    await broadcast(otherConnectionIds, {
      action: "playerJoined",
      player: { playerId, name },
      players: playerList,
    });

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("joinRoom error:", err);
    await sendToPlayer(connectionId, { action: "error", message: "Failed to join room" });
    return { statusCode: 500, body: "" };
  }
};
