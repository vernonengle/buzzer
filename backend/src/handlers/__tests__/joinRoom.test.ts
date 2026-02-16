import { handler } from "../joinRoom";

const mockGetItem = jest.fn();
const mockPutItem = jest.fn();
const mockSendToPlayer = jest.fn();
const mockBroadcast = jest.fn();

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
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

jest.mock("crypto", () => ({
  randomUUID: () => "uuid-2",
}));

const makeEvent = (connectionId: string, body: Record<string, unknown>) =>
  ({
    requestContext: { connectionId },
    body: JSON.stringify(body),
  }) as any;

beforeEach(() => jest.clearAllMocks());

describe("joinRoom", () => {
  it("joins room and broadcasts to existing players", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "waiting", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { open: false, buzzes: [] }, ttl: 999999,
    });

    const result = await handler(makeEvent("conn-2", { roomCode: "abcd", name: "Bob" }), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    expect(mockPutItem).toHaveBeenCalledTimes(3); // room + player + connection
    expect(mockSendToPlayer).toHaveBeenCalledWith("conn-2", expect.objectContaining({
      action: "roomJoined",
      roomCode: "ABCD",
      playerId: "uuid-2",
    }));
    expect(mockBroadcast).toHaveBeenCalledWith(["conn-1"], expect.objectContaining({
      action: "playerJoined",
    }));
  });

  it("rejects missing room code", async () => {
    const result = await handler(makeEvent("conn-2", { name: "Bob" }), {} as any, () => {});
    expect(result).toEqual({ statusCode: 400, body: "" });
  });

  it("rejects nonexistent room", async () => {
    mockGetItem.mockResolvedValueOnce(undefined);
    const result = await handler(makeEvent("conn-2", { roomCode: "ZZZZ", name: "Bob" }), {} as any, () => {});
    expect(result).toEqual({ statusCode: 404, body: "" });
  });
});
