import { APIGatewayProxyWebSocketHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyWebSocketHandlerV2 = async () => {
  return { statusCode: 200, body: "" };
};
