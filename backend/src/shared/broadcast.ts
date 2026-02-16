import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { deleteItem, connectionKey } from "./dynamo.js";

function getClient(): ApiGatewayManagementApiClient {
  return new ApiGatewayManagementApiClient({
    endpoint: process.env.WEBSOCKET_ENDPOINT!,
  });
}

export async function sendToPlayer(
  connectionId: string,
  data: unknown
): Promise<void> {
  const client = getClient();
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      })
    );
  } catch (err) {
    if (err instanceof GoneException) {
      await deleteItem(connectionKey(connectionId));
      return;
    }
    throw err;
  }
}

export async function broadcast(
  connectionIds: string[],
  data: unknown
): Promise<void> {
  await Promise.all(
    connectionIds.map((id) => sendToPlayer(id, data))
  );
}
