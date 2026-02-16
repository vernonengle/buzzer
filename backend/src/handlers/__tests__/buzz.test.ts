import { handler } from "../buzz";

const mockGetItem = jest.fn();
const mockPutItem = jest.fn();
const mockSendToPlayer = jest.fn();
const mockBroadcast = jest.fn();

jest.mock("../../shared/dynamo.js", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  connectionKey: (id: string) => ({ PK: `CONN#${id}`, SK: "CONN" }),
  roomKey: (code: string) => ({ PK: `ROOM#${code}`, SK: "META" }),
}));

jest.mock("../../shared/broadcast.js", () => ({
  sendToPlayer: (...args: unknown[]) => mockSendToPlayer(...args),
  broadcast: (...args: unknown[]) => mockBroadcast(...args),
}));

const makeEvent = (connectionId: string) =>
  ({ requestContext: { connectionId }, body: "{}" }) as any;

beforeEach(() => jest.clearAllMocks());

describe("buzz", () => {
  it("records buzz and broadcasts to all", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: { locked: false, buzzes: [] }, ttl: 123,
    });

    const result = await handler(makeEvent("conn-1"), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    expect(mockPutItem).toHaveBeenCalled();
    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.buzzState.locked).toBe(true);
    expect(savedRoom.buzzState.buzzes).toHaveLength(1);
    expect(savedRoom.buzzState.buzzes[0].playerId).toBe("p1");

    expect(mockBroadcast).toHaveBeenCalledWith(
      ["conn-1", "conn-2"],
      expect.objectContaining({ action: "buzzed", locked: true })
    );
  });

  it("allows second buzz after first (records position)", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p2" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
        { connectionId: "conn-2", playerId: "p2", name: "Bob" },
      ],
      buzzState: {
        locked: true,
        buzzes: [{ playerId: "p1", name: "Alice", timestamp: 1000 }],
      },
      ttl: 123,
    });

    const result = await handler(makeEvent("conn-2"), {} as any, () => {});

    expect(result).toEqual({ statusCode: 200, body: "" });
    const savedRoom = mockPutItem.mock.calls[0][0];
    expect(savedRoom.buzzState.buzzes).toHaveLength(2);
  });

  it("rejects duplicate buzz from same player", async () => {
    mockGetItem.mockResolvedValueOnce({ roomCode: "ABCD", playerId: "p1" });
    mockGetItem.mockResolvedValueOnce({
      PK: "ROOM#ABCD", SK: "META", roomCode: "ABCD", hostPlayerId: "p1",
      status: "active", players: [
        { connectionId: "conn-1", playerId: "p1", name: "Alice" },
      ],
      buzzState: {
        locked: true,
        buzzes: [{ playerId: "p1", name: "Alice", timestamp: 1000 }],
      },
      ttl: 123,
    });

    const result = await handler(makeEvent("conn-1"), {} as any, () => {});

    expect(result).toEqual({ statusCode: 400, body: "" });
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it("rejects if not in a room", async () => {
    mockGetItem.mockResolvedValueOnce(undefined);
    const result = await handler(makeEvent("conn-1"), {} as any, () => {});
    expect(result).toEqual({ statusCode: 400, body: "" });
  });
});
