import { it, expect } from "vitest";
import * as sinon from "sinon";

import {
	ChannelNetwork,
	createErrorResponseMessage,
	createSuccessResponseMessage,
	RequestTimeoutError,
	ResponseError,
	TooManyConcurrentRequestsError,
	UnknownErrorResponseMessage,
} from "../src/channel";

class StandaloneChannelNetwork extends ChannelNetwork {}

const dummyData = { foo: "bar" };
const dummyError = dummyData;

it("posts valid requests to its partner and returns success response", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createSuccessResponseMessage(request.requestID, dummyData);

	channel.port1.onmessage = (event) => {
		t.deepEqual(event.data, request);

		channel.port1.postMessage(response);
	};

	// @ts-expect-error - taking a shortcut by accessing protected property
	const receivedResponse = await channelNetwork.postRequest(request);

	t.deepEqual(receivedResponse, response);
});

it("posts valid requests to its partner and throws error response", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createErrorResponseMessage(request.requestID, dummyError);

	channel.port1.onmessage = (event) => {
		t.deepEqual(event.data, request);

		channel.port1.postMessage(response);
	};

	const error = await t.throwsAsync<ResponseError<UnknownErrorResponseMessage>>(
		// @ts-expect-error - taking a shortcut by accessing protected property
		channelNetwork.postRequest(request),
		{
			instanceOf: ResponseError,
			message: response.msg,
		},
	);

	t.deepEqual(error.response, response);
});

it("posts valid requests to its partner and timeout after set default timeout", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork(
		{},
		{ defaultTimeout: 100 },
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);

	channel.port1.onmessage = (event) => {
		t.deepEqual(event.data, request);
	};

	await new Promise<void>(async (resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("default timeout is not honored");
			reject();
		}, 1000);

		// @ts-expect-error - taking a shortcut by accessing protected property
		await t.throwsAsync(channelNetwork.postRequest(request), {
			instanceOf: RequestTimeoutError,
		});

		clearTimeout(timeout);

		resolve();
	});
});

it("posts valid requests to its partner and timeout after set specific timeout", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, undefined);

	channel.port1.onmessage = (event) => {
		t.deepEqual(event.data, request);
	};

	await new Promise<void>(async (resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("specific timeout is not honored");
			reject();
		}, 1000);

		await t.throwsAsync(
			// @ts-expect-error - taking a shortcut by accessing protected property
			channelNetwork.postRequest(request, undefined, { timeout: 100 }),
			{
				instanceOf: RequestTimeoutError,
			},
		);

		clearTimeout(timeout);

		resolve();
	});
});

// TODO: Not sure about how that behavior is possible, reads absurd
it("posts valid requests to its partner and doesn't timeout if pending request has been fulfilled", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork(
		{},
		{ defaultTimeout: 100 },
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);

	channel.port1.onmessage = (event) => {
		t.deepEqual(event.data, request);
		// @ts-expect-error - taking a shortcut by accessing private property
		channelNetwork._pendingRequests.delete(request.requestID);
	};

	await new Promise<void>(async (resolve, reject) => {
		const timeout = setTimeout(() => {
			t.fail("default timeout is not honored");
			reject();
		}, 1000);

		// @ts-expect-error - taking a shortcut by accessing protected property
		await t.throwsAsync(channelNetwork.postRequest(request), {
			instanceOf: RequestTimeoutError,
		});

		clearTimeout(timeout);

		resolve();
	});
});

it("throws when maximum request concurrency has been hit", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork(
		{},
		{
			maximumRequestConcurrency: 5,
		},
	);

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createSuccessResponseMessage(request.requestID, dummyData);

	channel.port1.onmessage = (event) => {
		setTimeout(() => {
			channel.port1.postMessage({
				...response,
				requestID: event.data.requestID,
			});
		}, 100);
	};

	await t.throwsAsync(
		async () => {
			const promises = [];
			for (let i = 0; i < 6; i++) {
				promises.push(
					// @ts-expect-error - taking a shortcut by accessing protected property
					channelNetwork.postRequest({ ...request, requestID: `channel-${i}` }),
				);
			}

			await Promise.all(promises);
		},
		{
			instanceOf: TooManyConcurrentRequestsError,
		},
	);
});

it("uses provided post message method", async (t) => {
	const channelNetwork = new StandaloneChannelNetwork({}, {});

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createSuccessResponseMessage(request.requestID, dummyData);

	const onmessage = (event: MessageEvent<unknown>) => {
		t.deepEqual(event.data, request);

		channel.port1.postMessage(response);
	};

	// @ts-expect-error - taking a shortcut by accessing protected property
	const receivedResponse = await channelNetwork.postRequest(
		request,
		(request) => {
			onmessage({ data: request } as MessageEvent<unknown>);
		},
	);

	t.deepEqual(receivedResponse, response);
});

test.serial("debug logs messages when on debug mode", async (t) => {
	const consoleDebugStub = sinon.stub(console, "debug");

	const channelNetwork = new StandaloneChannelNetwork({}, { debug: true });

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createSuccessResponseMessage(request.requestID, dummyData);

	channel.port1.onmessage = () => {
		channel.port1.postMessage(response);
	};

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.postRequest(request);

	// Request and response are actually logged...
	t.is(consoleDebugStub.callCount, 2);

	consoleDebugStub.restore();
});

test.serial("doesn't debug log messages when not on debug mode", async (t) => {
	const consoleDebugStub = sinon.stub(console, "debug");

	const channelNetwork = new StandaloneChannelNetwork({}, { debug: false });

	const channel = new MessageChannel();

	// @ts-expect-error - taking a shortcut by setting protected property
	channelNetwork.port = channel.port2;

	const request = channelNetwork.createRequestMessage(t.title, dummyData);
	const response = createSuccessResponseMessage(request.requestID, dummyData);

	channel.port1.onmessage = () => {
		channel.port1.postMessage(response);
	};

	// @ts-expect-error - taking a shortcut by accessing protected property
	await channelNetwork.postRequest(request);

	t.is(consoleDebugStub.callCount, 0);

	consoleDebugStub.restore();
});
