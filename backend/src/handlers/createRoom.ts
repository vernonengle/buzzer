import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";
import { getItem, putItem, roomKey, playerKey, connectionKey, ttl } from "../shared/dynamo.js";
import { sendToPlayer } from "../shared/broadcast.js";
import { generateRoomCode } from "../shared/roomCode.js";
import { RoomMeta } from "../shared/types.js";
import { randomUUID } from "crypto";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const body = JSON.parse(event.body ?? "{}");
    const name: string = body.name?.trim();
    if (!name) {
      await sendToPlayer(connectionId, { action: "error", message: "Name is required" });
      return { statusCode: 400, body: "" };
    }

    let roomCode: string;
    let existing: RoomMeta | undefined;
    do {
      roomCode = generateRoomCode();
      existing = await getItem<RoomMeta>(roomKey(roomCode));
    } while (existing);

    const playerId = randomUUID();
    const player = { connectionId, playerId, name };

    const room: RoomMeta = {
      roomCode,
      hostPlayerId: playerId,
      status: "waiting",
      players: [player],
      buzzState: { open: false, buzzes: [] },
    };

    await putItem({
      ...roomKey(roomCode),
      ...room,
      ttl: ttl(),
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

    await sendToPlayer(connectionId, {
      action: "roomCreated",
      roomCode,
      playerId,
      players: [{ playerId, name }],
    });

    return { statusCode: 200, body: "" };
  } catch (err) {
    console.error("createRoom error:", err);
    await sendToPlayer(connectionId, { action: "error", message: "Failed to create room" });
    return { statusCode: 500, body: "" };
  }
};
