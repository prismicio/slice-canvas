import {
	defineComponent,
	ref,
	onMounted,
	h,
	PropType,
	VNodeArrayChildren,
	AllowedComponentProps,
	ComponentCustomProps,
	VNodeProps,
	watch,
	onUnmounted,
} from "vue";

import {
	getDefaultManagedState,
	getDefaultProps,
	getDefaultSlices,
	getDefaultMessage,
	onClickHandler,
	disableEventHandler,
	simulatorClass,
	SliceSimulatorProps as _SliceSimulatorProps,
	StateManagerEventType,
	StateManagerStatus,
	CoreManager,
} from "@prismicio/slice-simulator-core";

export type SliceSimulatorProps = _SliceSimulatorProps;

const coreManager = new CoreManager();

export const SliceSimulatorImpl = /*#__PURE__*/ defineComponent({
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
	setup(props, { slots }) {
		const managedState = ref(getDefaultManagedState());
		const slices = ref(getDefaultSlices());
		const message = ref(getDefaultMessage());

		onMounted(() => {
			coreManager.stateManager.on(
				StateManagerEventType.ManagedState,
				(_managedState) => {
					managedState.value = _managedState;
				},
				"simulator-managed-state",
			);
			coreManager.stateManager.on(
				StateManagerEventType.Slices,
				(_slices) => {
					slices.value = _slices;
				},
				"simulator-slices",
			);
			coreManager.stateManager.on(
				StateManagerEventType.Message,
				(_message) => {
					message.value = _message;
				},
				"simulator-message",
			);

			coreManager.init(props.state);
		});

		// Update state on HMR
		watch(
			() => props.state,
			() => {
				coreManager.stateManager.reload(props.state);
			},
		);

		onUnmounted(() => {
			coreManager.stateManager.off(
				StateManagerEventType.ManagedState,
				"simulator-managed-state",
			);

			coreManager.stateManager.off(
				StateManagerEventType.Slices,
				"simulator-slices",
			);

			coreManager.stateManager.off(
				StateManagerEventType.Message,
				"simulator-message",
			);
		});

		return () => {
			const children: VNodeArrayChildren = [];

			if (message.value) {
				children.push(
					h("article", {
						innerHTML: message.value,
					}),
				);
			} else if (slices.value.length && slots.default) {
				children.push(
					h(
						"div",
						{
							id: "root",
							style:
								managedState.value.status !== StateManagerStatus.Loaded
									? { display: "none" }
									: undefined,
							onClickCapture: onClickHandler,
							onSubmitCapture: disableEventHandler,
						},
						[
							slots.default({
								slices: slices.value,
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
						zIndex: props.zIndex,
						position: "fixed",
						top: 0,
						left: 0,
						width: "100%",
						height: "100vh",
						overflow: "auto",
						background: props.background,
					},
				},
				children,
			);
		};
	},
});

// export the public type for h/tsx inference
// also to avoid inline import() in generated d.ts files
export const SliceSimulator = SliceSimulatorImpl as unknown as {
	new (): {
		$props: AllowedComponentProps &
			ComponentCustomProps &
			VNodeProps &
			SliceSimulatorProps;
	};
};
