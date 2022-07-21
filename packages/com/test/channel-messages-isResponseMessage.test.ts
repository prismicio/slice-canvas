import { it, expect } from "vitest";
import {
	createErrorResponseMessage,
	createRequestMessage,
	createSuccessResponseMessage,
	isResponseMessage,
} from "../src/channel";

const dummyData = { foo: "bar" };
const dummyError = dummyData;

it("returns false on request message", (ctx) => {
	const request = createRequestMessage(ctx.meta.name, dummyData);

	expect(isResponseMessage(request)).toBe(false);
});

it("returns true on success response message", (ctx) => {
	const response = createSuccessResponseMessage(ctx.meta.name, dummyData);

	expect(isResponseMessage(response)).toBe(true);
});

it("returns true on error response message", (ctx) => {
	const response = createErrorResponseMessage(ctx.meta.name, dummyError);

	expect(isResponseMessage(response)).toBe(true);
});
