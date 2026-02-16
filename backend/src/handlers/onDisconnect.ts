import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";
import { getItem, deleteItem, connectionKey, roomKey, putItem } from "../shared/dynamo.js";
import { broadcast } from "../shared/broadcast.js";
import { RoomMeta } from "../shared/types.js";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const conn = await getItem<{ PK: string; SK: string; roomCode: string; playerId: string }>(
      connectionKey(connectionId)
    );

    if (conn) {
      await deleteItem(connectionKey(connectionId));

      const room = await getItem<RoomMeta & { PK: string; SK: string; ttl: number }>(
        roomKey(conn.roomCode)
      );
      if (!room) return { statusCode: 200, body: "" };

      const updatedPlayers = room.players.filter((p) => p.playerId !== conn.playerId);

      if (updatedPlayers.length === 0) {
        await deleteItem(roomKey(conn.roomCode));
      } else {
        room.players = updatedPlayers;
        if (room.hostPlayerId === conn.playerId) {
          room.hostPlayerId = updatedPlayers[0].playerId;
        }
        await putItem({
          ...roomKey(conn.roomCode),
          ...room,
        });

        const allConnectionIds = updatedPlayers.map((p) => p.connectionId);
        await broadcast(allConnectionIds, {
          action: "playerLeft",
          playerId: conn.playerId,
          players: updatedPlayers.map((p) => ({ playerId: p.playerId, name: p.name })),
          hostPlayerId: room.hostPlayerId,
        });
      }
    }
  } catch (err) {
    console.error("onDisconnect error:", err);
  }

  return { statusCode: 200, body: "" };
};
