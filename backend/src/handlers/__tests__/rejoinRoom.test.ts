import { handler } from "../rejoinRoom";

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

const makeEvent = (connectionId: string, body: Record<string, unknown>) =>
  ({
    requestContext: { connectionId },
    body: JSON.stringify(body),
  }) as any;

beforeEach(() => jest.clearAllMocks());

describe("rejoinRoom", () => {
  it("updates connection and sends full state", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-old", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { open: true, buzzes: [{ playerId: "p2", name: "Bob", reactionTime: 300 }] },
      ttl: 123,
    });

    const result = await handler(
      makeEvent("conn-new", { roomCode: "ABCD", playerId: "p1" }),
      {} as any, () => {}
    );

    expect(result).toEqual({ statusCode: 200, body: "" });
    expect(mockPutItem).toHaveBeenCalledTimes(3); // room + player + connection

    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.players[0].connectionId).toBe("conn-new");

    expect(mockSendToPlayer).toHaveBeenCalledWith("conn-new", expect.objectContaining({
      action: "roomState",
      roomCode: "ABCD",
      playerId: "p1",
      buzzState: expect.objectContaining({ open: true }),
    }));
  });

  it("rejects if room not found", async () => {
    mockGetItem.mockResolvedValueOnce(undefined);
    const result = await handler(
      makeEvent("conn-new", { roomCode: "ZZZZ", playerId: "p1" }),
      {} as any, () => {}
    );
    expect(result).toEqual({ statusCode: 404, body: "" });
  });

  it("rejects if player not in room", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: { open: false, buzzes: [] }, ttl: 123,
    });

    const result = await handler(
      makeEvent("conn-new", { roomCode: "ABCD", playerId: "p999" }),
      {} as any, () => {}
    );
    expect(result).toEqual({ statusCode: 404, body: "" });
  });
});
