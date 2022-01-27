import Vue, { PropType, VNodeChildren } from "vue";
import { CreateElement, ExtendedVue } from "vue/types/vue";

import {
	getDefaultProps,
	getDefaultManagedState,
	getDefaultSlices,
	getDefaultMessage,
	onClickHandler,
	disableEventHandler,
	simulatorClass,
	SliceSimulatorState,
	SliceSimulatorOptions,
	SliceSimulatorProps as _SliceSimulatorProps,
	StateManagerEventType,
	StateManagerStatus,
	CoreManager,
} from "@prismicio/slice-simulator-core";

export type SliceSimulatorProps = _SliceSimulatorProps;

const coreManager = new CoreManager();

export const SliceSimulator = {
	name: "SliceSimulator",
	props: {
		state: {
			type: [Function, Object] as PropType<SliceSimulatorProps["state"]>,
			required: true,
		},
		zIndex: {
			type: Number as PropType<Required<SliceSimulatorProps["zIndex"]>>,
			default: getDefaultProps().zIndex,
			required: false,
		},
		background: {
			type: String as PropType<Required<SliceSimulatorProps["background"]>>,
			default: getDefaultProps().background,
			required: false,
		},
	},
	data() {
		return {
			coreManager,
			managedState: getDefaultManagedState(),
			slices: getDefaultSlices(),
			message: getDefaultMessage(),
		};
	},
	mounted(this: SliceSimulatorOptions) {
		this.coreManager.stateManager.on(
			StateManagerEventType.ManagedState,
			(managedState) => {
				this.managedState = managedState;
			},
		);
		this.coreManager.stateManager.on(StateManagerEventType.Slices, (slices) => {
			this.slices = slices;
		});
		this.coreManager.stateManager.on(
			StateManagerEventType.Message,
			(message) => {
				this.message = message;
			},
		);

		this.coreManager.init(this.state);
	},
	watch: {
		// Update state on HMR
		state(this: SliceSimulatorOptions) {
			this.coreManager.stateManager.reload(this.state);
		},
	},
	render(this: SliceSimulatorOptions & Vue, h: CreateElement) {
		const children: VNodeChildren = [];

		if (this.message) {
			children.push(
				h("article", {
					domProps: {
						innerHTML: this.message,
					},
				}),
			);
		} else if (this.slices.length && this.$scopedSlots.default) {
			children.push(
				h(
					"div",
					{
						attrs: { id: "root" },
						style:
							this.managedState.status !== StateManagerStatus.Loaded
								? { display: "none" }
								: undefined,
						on: {
							"!click": onClickHandler,
							"!submit": disableEventHandler,
						},
					},
					[
						this.$scopedSlots.default({
							slices: this.slices,
						}),
					],
				),
			);
		}

		return h(
			"div",
			{
				class: simulatorClass,
				style: {
					zIndex: this.zIndex,
					position: "fixed",
					top: 0,
					left: 0,
					width: "100%",
					height: "100vh",
					overflow: "auto",
					background: this.background,
				},
			},
			children,
		);
	},
	// This is some weird ass trick to get around `Vue.extend` messing up `this` context, don't do this at home kids
} as unknown as ExtendedVue<
	Vue,
	SliceSimulatorState,
	Record<string, never>,
	Record<string, never>,
	SliceSimulatorProps
>;
