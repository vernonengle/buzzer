import { handler } from "../createRoom";

const mockGetItem = jest.fn();
const mockPutItem = jest.fn();
const mockSendToPlayer = jest.fn();

jest.mock("../../shared/dynamo.js", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  roomKey: (code: string) => ({ PK: `ROOM#${code}`, SK: "META" }),
  playerKey: (code: string, pid: string) => ({ PK: `ROOM#${code}`, SK: `PLAYER#${pid}` }),
  connectionKey: (id: string) => ({ PK: `CONN#${id}`, SK: "CONN" }),
  ttl: () => 999999,
}));

jest.mock("../../shared/broadcast.js", () => ({
  sendToPlayer: (...args: unknown[]) => mockSendToPlayer(...args),
}));

jest.mock("../../shared/roomCode.js", () => ({
  generateRoomCode: () => "ABCD",
}));

jest.mock("crypto", () => ({
  randomUUID: () => "uuid-1",
}));

const makeEvent = (connectionId: string, body: Record<string, unknown>) =>
  ({
    requestContext: { connectionId },
    body: JSON.stringify(body),
  }) as any;

beforeEach(() => jest.clearAllMocks());

describe("createRoom", () => {
  it("creates room and sends roomCreated", async () => {
    mockGetItem.mockResolvedValue(undefined);

    const result = await handler(makeEvent("conn-1", { name: "Alice" }), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    expect(mockPutItem).toHaveBeenCalledTimes(3); // room + player + connection
    expect(mockSendToPlayer).toHaveBeenCalledWith("conn-1", expect.objectContaining({
      action: "roomCreated",
      roomCode: "ABCD",
      playerId: "uuid-1",
    }));
  });

  it("rejects empty name", async () => {
    const result = await handler(makeEvent("conn-1", { name: "" }), {} as any, () => {});
    expect(result).toEqual({ statusCode: 400, body: "" });
    expect(mockSendToPlayer).toHaveBeenCalledWith("conn-1", expect.objectContaining({
      action: "error",
    }));
  });

  it("retries if room code collision", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD" }); // first call: collision
    mockGetItem.mockResolvedValueOnce(undefined); // second call: no collision

    await handler(makeEvent("conn-1", { name: "Alice" }), {} as any, () => {});

    expect(mockGetItem).toHaveBeenCalledTimes(2);
    expect(mockPutItem).toHaveBeenCalledTimes(3);
  });
});
