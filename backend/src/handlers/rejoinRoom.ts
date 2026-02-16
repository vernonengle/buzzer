import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";
import { getItem, putItem, roomKey, playerKey, connectionKey, ttl } from "../shared/dynamo.js";
import { sendToPlayer } from "../shared/broadcast.js";
import { RoomMeta, Player } from "../shared/types.js";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const body = JSON.parse(event.body ?? "{}");
    const roomCode: string = body.roomCode;
    const playerId: string = body.playerId;

    if (!roomCode || !playerId) {
      await sendToPlayer(connectionId, { action: "error", message: "roomCode and playerId are required" });
      return { statusCode: 400, body: "" };
    }

    const room = await getItem<RoomMeta & { PK: string; SK: string; ttl: number }>(
      roomKey(roomCode)
    );
    if (!room) {
      await sendToPlayer(connectionId, { action: "error", message: "Room not found" });
      return { statusCode: 404, body: "" };
    }

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) {
      await sendToPlayer(connectionId, { action: "error", message: "Player not found in room" });
      return { statusCode: 404, body: "" };
    }

    const oldConnectionId = player.connectionId;
    player.connectionId = connectionId;

    await putItem({
      ...roomKey(roomCode),
      ...room,
    });

    await putItem({
      ...playerKey(roomCode, playerId),
      connectionId,
      playerId,
      name: player.name,
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

    const playerList = room.players.map((p: Player) => ({ playerId: p.playerId, name: p.name }));

    await sendToPlayer(connectionId, {
      action: "roomState",
      roomCode,
      playerId,
      players: playerList,
      hostPlayerId: room.hostPlayerId,
      buzzState: room.buzzState,
    });

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("rejoinRoom error:", err);
    await sendToPlayer(connectionId, { action: "error", message: "Failed to rejoin room" });
    return { statusCode: 500, body: "" };
  }
};
