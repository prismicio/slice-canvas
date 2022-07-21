import { it, expect } from "vitest";
import * as sinon from "sinon";

import {
	ChannelNetwork,
	createErrorResponseMessage,
	createRequestMessage,
	createSuccessResponseMessage,
	UnknownTransaction,
} from "../src/channel";

class StandaloneChannelNetwork<
	TOptions extends Record<string, unknown> = Record<string, unknown>,
	TPartnerTransactions extends Record<string, UnknownTransaction> = Record<
		string,
		never
	>,
> extends ChannelNetwork<TOptions, TPartnerTransactions> {}

const dummyData = { foo: "bar" };

test.serial("debug logs messages when on debug mode", async (t) => {
	const consoleDebugStub = sinon.stub(console, "debug");
	const consoleErrorStub = sinon.stub(console, "error");

	const channelNetwork = new StandaloneChannelNetwork({}, { debug: true });

	const response = createSuccessResponseMessage(t.title, dummyData);

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.onMessage({ data: response });

	t.is(consoleDebugStub.callCount, 1);
	t.deepEqual(consoleDebugStub.getCall(0).args[0], response);

	consoleDebugStub.restore();
	consoleErrorStub.restore();
});

test.serial("doesn't debug log messages when not on debug mode", async (t) => {
	const consoleDebugStub = sinon.stub(console, "debug");
	const consoleErrorStub = sinon.stub(console, "error");

	const channelNetwork = new StandaloneChannelNetwork({}, { debug: false });

	const response = createSuccessResponseMessage(t.title, dummyData);

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.onMessage({ data: response });

	t.is(consoleDebugStub.callCount, 0);

	consoleDebugStub.restore();
	consoleErrorStub.restore();
});

test.serial("warns on invalid message received", async (t) => {
	const consoleWarnStub = sinon.stub(console, "warn");

	const channelNetwork = new StandaloneChannelNetwork({}, {});

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.onMessage({ data: {} });

	t.is(consoleWarnStub.callCount, 1);

	consoleWarnStub.restore();
});

test.serial("throws on other errors", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const pendingRequestStub = sinon
		// @ts-expect-error - taking a shortcut by accessing private property
		.stub(channelNetwork._pendingRequests, "has")
		.throws(new Error(t.title));

	const response = createSuccessResponseMessage(t.title, dummyData);

	await t.throwsAsync(
		// @ts-expect-error - taking a shortcut by accessing protected property
		channelNetwork.onMessage({ data: response }),
		{ message: t.title },
	);

	pendingRequestStub.restore();
});

it("returns request handler success response", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork<
		Record<string, unknown>,
		{ foo: UnknownTransaction }
	>(
		{
			foo: (_req, res) => res.success(t.title),
		},
		{},
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("response not received");
			reject();
		}, 1000);

		const request = createRequestMessage("foo", dummyData);
		const response = createSuccessResponseMessage(request.requestID, t.title);

		channel.port1.onmessage = (event) => {
			t.deepEqual(event.data, response);
			clearTimeout(timeout);
			resolve();
		};
		channel.port1.postMessage(request);
	});
});

it("returns request handler error response", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork<
		Record<string, unknown>,
		{ foo: UnknownTransaction }
	>(
		{
			foo: (_req, res) => res.error(t.title),
		},
		{},
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("response not received");
			reject();
		}, 1000);

		const request = createRequestMessage("foo", dummyData);
		const response = createErrorResponseMessage(request.requestID, t.title);

		channel.port1.onmessage = (event) => {
			t.deepEqual(event.data, response);
			clearTimeout(timeout);
			resolve();
		};
		channel.port1.postMessage(request);
	});
});

it("returns not implemented when request handler is not found", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("response not received");
			reject();
		}, 1000);

		const request = createRequestMessage(t.title, dummyData);
		const response = createErrorResponseMessage(
			request.requestID,
			undefined,
			501,
		);

		channel.port1.onmessage = (event) => {
			t.deepEqual(event.data, response);
			clearTimeout(timeout);
			resolve();
		};
		channel.port1.postMessage(request);
	});
});

it("returns internal server error when handler throws", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork<
		Record<string, unknown>,
		{ foo: UnknownTransaction }
	>(
		{
			foo: (_req, _res) => {
				throw new Error(t.title);
			},
		},
		{},
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("response not received");
			reject();
		}, 1000);

		const request = createRequestMessage("foo", dummyData);
		const response = createErrorResponseMessage(
			request.requestID,
			new Error(t.title),
			500,
		);

		channel.port1.onmessage = (event) => {
			t.deepEqual(event.data, response);
			clearTimeout(timeout);
			resolve();
		};
		channel.port1.postMessage(request);
	});
});

test.serial("logs error when unknown request ID is received", async (t) => {
	const consoleErrorStub = sinon.stub(console, "error");

	const channelNetwork = new StandaloneChannelNetwork({}, { debug: false });

	const response = createSuccessResponseMessage(t.title, dummyData);

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.onMessage({ data: response });

	t.is(consoleErrorStub.callCount, 1);
	t.true(consoleErrorStub.getCall(0).args[0].includes(response.requestID));

	consoleErrorStub.restore();
});
