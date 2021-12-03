import {
	ChannelNetwork,
	ChannelNetworkOptions,
	PostRequestOptions,
} from "./ChannelNetwork";
import {
	createSuccessResponseMessage,
	createErrorResponseMessage,
	isRequestMessage,
	validateMessage,
} from "./messages";
import { ConnectionTimeoutError, NotReadyError } from "./errors";
import {
	RequestMessage,
	ResponseMessage,
	SuccessResponseMessage,
	ExtractSuccessResponseMessage,
	UnknownRequestMessage,
	UnknownResponseMessage,
	TransactionsHandlers,
	UnknownTransaction,
	InternalEmitterRequestType,
	InternalReceiverRequestType,
} from "./types";

export type ChannelEmitterOptions = {
	connectTimeout: number;
};

export const channelEmitterDefaultOptions: ChannelEmitterOptions &
	Partial<ChannelNetworkOptions> = {
	connectTimeout: 20000,
	requestIDPrefix: "emitter-",
};

export type AllChannelEmitterOptions = ChannelEmitterOptions &
	ChannelNetworkOptions;

export abstract class ChannelEmitter<
	TReceiverTransactions extends Record<string, UnknownTransaction> = Record<
		string,
		never
	>,
> extends ChannelNetwork<ChannelEmitterOptions, TReceiverTransactions> {
	private _target: HTMLIFrameElement;
	private _channel: MessageChannel | null = null;
	protected get channel(): MessageChannel {
		if (!this._channel) {
			throw new Error("Channel is not set");
		}

		return this._channel;
	}
	protected set channel(channel: MessageChannel | null) {
		this._channel = channel;

		// Update port automatically
		if (this._channel) {
			this.port = this._channel.port1;
		} else {
			this.port = null;
		}
	}
	private _receiverReady = "";
	private _receiverReadyCallback: (() => Promise<void>) | null = null;
	private _connected = false;
	public get connected(): boolean {
		return this._connected;
	}

	constructor(
		target: HTMLIFrameElement,
		requestHandlers: TransactionsHandlers<TReceiverTransactions>,
		options?: Partial<AllChannelEmitterOptions>,
	) {
		super(requestHandlers, { ...channelEmitterDefaultOptions, ...options });

		this._target = target;

		window.addEventListener("message", this._onPublicMessage.bind(this));
	}

	/**
	 * Initiates connection to receiver
	 *
	 * @param newOrigin - Indicates to the emitter that we're connecting to a new origin
	 *
	 * @returns Success connect message
	 */
	connect(newOrigin = false): Promise<SuccessResponseMessage> {
		// Disconnect first
		this.disconnect();
		// If changing origin we'll need to wait for receiver to be ready again
		if (newOrigin) {
			this._receiverReady = "";
		}

		// Handshake promise
		return new Promise<SuccessResponseMessage>((resolve, reject) => {
			// Wait for target to be loaded
			this._target.addEventListener(
				"load",
				() => {
					// Throw if target doesn't allow access to content window
					if (!this._target.contentWindow) {
						throw new Error("Target window is not available");
					}

					const receiverReadyTimeout = setTimeout(() => {
						reject(new ConnectionTimeoutError());
					}, this.options.connectTimeout);

					// Connect to target once ready
					const receiverReadyCallback = async (): Promise<void> => {
						// Clear receiver ready timeout
						clearTimeout(receiverReadyTimeout);

						// Create new message channel (set up port automatically)
						// This is done here to prevent transferable objects neutering
						// when calling `connect()` multiple times
						this.channel = new MessageChannel();

						// Conclude handshake by sending message channel port to target
						const request = this.createRequestMessage(
							InternalEmitterRequestType.Connect,
							undefined,
						);
						const response = await this.postRequest<
							RequestMessage<InternalEmitterRequestType.Connect>,
							ResponseMessage
						>(request, (request) => {
							// Target content window is checked in previous statement
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							this._target.contentWindow!.postMessage(request, "*", [
								this.channel.port2,
							]);
						});

						// Finish by aknowledging ready
						this.postResponse(
							createSuccessResponseMessage(this._receiverReady, undefined),
							(response) => {
								// Target content window is checked in previous statement
								// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
								this._target.contentWindow!.postMessage(response, "*");
							},
						);

						// If post request succeed, we're connected
						this._connected = true;

						resolve(response);
					};

					if (this._receiverReady) {
						// If receiver is already ready, send port immediately
						receiverReadyCallback();
					} else {
						// Else wait for receiver to be ready
						this._receiverReadyCallback = receiverReadyCallback;
					}
				},
				{ once: true },
			);
		});
	}

	/**
	 * Destroys current connection to receiver if any
	 */
	disconnect() {
		this._connected = false;
		this.channel = null;
	}

	/**
	 * Handles public messages
	 */
	private async _onPublicMessage(event: MessageEvent<unknown>): Promise<void> {
		// Return is event is not from target
		if (event.source !== this._target.contentWindow) {
			return;
		}

		try {
			const message = validateMessage(event.data);

			if (isRequestMessage(message)) {
				if (this.options.debug) {
					// eslint-disable-next-line no-console
					console.debug(event.data);
				}

				switch (message.type) {
					case InternalReceiverRequestType.Ready:
						this._receiverReady = message.requestID;

						// If emitter is waiting for receiver to be ready
						if (this._receiverReadyCallback) {
							await this._receiverReadyCallback();
							this._receiverReadyCallback = null;
						}
						break;

					default:
						this.postResponse(
							createErrorResponseMessage(message.requestID, undefined),
							(response) => {
								(event.source as WindowProxy).postMessage(
									response,
									event.origin,
								);
							},
						);
						break;
				}
			} else {
				// No response messages are expected on public channel
			}
		} catch (error) {
			if (error instanceof TypeError) {
				// Ignore unknown messages
			} else {
				throw error;
			}
		}
	}

	protected postFormattedRequest<
		TRequest extends UnknownRequestMessage,
		TResponse extends UnknownResponseMessage,
	>(
		type: TRequest["type"],
		data?: TRequest["data"],
		options: PostRequestOptions = {},
	): Promise<ExtractSuccessResponseMessage<TResponse>> {
		if (!this._connected) {
			throw new NotReadyError(
				"Sender is not connected, use `ChannelSender.connect()` first",
			);
		}

		return this.postRequest(
			this.createRequestMessage(type, data),
			undefined,
			options,
		);
	}
}
