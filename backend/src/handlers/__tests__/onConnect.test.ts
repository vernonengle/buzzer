import { handler } from "../onConnect";

describe("onConnect", () => {
  it("returns 200", async () => {
    const event = { requestContext: { connectionId: "conn-1" } } as any;
    const result = await handler(event, {} as any, () => {});
    expect(result).toEqual({ statusCode: 200, body: "" });
  });
});
