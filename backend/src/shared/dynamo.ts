import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommandInput,
  PutCommandInput,
  QueryCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

function tableName(): string {
  return process.env.TABLE_NAME!;
}

export function roomKey(roomCode: string) {
  return { PK: `ROOM#${roomCode}`, SK: "META" };
}

export function playerKey(roomCode: string, playerId: string) {
  return { PK: `ROOM#${roomCode}`, SK: `PLAYER#${playerId}` };
}

export function connectionKey(connectionId: string) {
  return { PK: `CONN#${connectionId}`, SK: "CONN" };
}

export async function getItem<T>(key: Record<string, string>): Promise<T | undefined> {
  const params: GetCommandInput = {
    TableName: tableName(),
    Key: key,
  };
  const result = await docClient.send(new GetCommand(params));
  return result.Item as T | undefined;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  const params: PutCommandInput = {
    TableName: tableName(),
    Item: item,
  };
  await docClient.send(new PutCommand(params));
}

export async function queryItems<T>(
  pk: string,
  skPrefix?: string
): Promise<T[]> {
  const params: QueryCommandInput = {
    TableName: tableName(),
    KeyConditionExpression: skPrefix
      ? "PK = :pk AND begins_with(SK, :sk)"
      : "PK = :pk",
    ExpressionAttributeValues: skPrefix
      ? { ":pk": pk, ":sk": skPrefix }
      : { ":pk": pk },
  };
  const result = await docClient.send(new QueryCommand(params));
  return (result.Items ?? []) as T[];
}

export async function updateItem(
  key: Record<string, string>,
  updateExpression: string,
  expressionValues: Record<string, unknown>,
  expressionNames?: Record<string, string>
): Promise<void> {
  const params: UpdateCommandInput = {
    TableName: tableName(),
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionValues,
    ...(expressionNames && { ExpressionAttributeNames: expressionNames }),
  };
  await docClient.send(new UpdateCommand(params));
}

export async function deleteItem(key: Record<string, string>): Promise<void> {
  const params: DeleteCommandInput = {
    TableName: tableName(),
    Key: key,
  };
  await docClient.send(new DeleteCommand(params));
}

export function ttl(): number {
  return Math.floor(Date.now() / 1000) + 24 * 60 * 60;
}
