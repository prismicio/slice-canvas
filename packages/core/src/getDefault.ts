import { SliceZone } from "@prismicio/types";

import { SliceSimulatorProps, ManagedState, StateManagerStatus } from "./types";

export const getDefaultProps = (): Required<{
	[K in keyof Omit<SliceSimulatorProps, "state">]: NonNullable<
		SliceSimulatorProps[K]
	>;
}> => ({
	zIndex: 100,
	background: "#ffffff",
});

export const getDefaultManagedState = (): ManagedState => ({
	data: null,
	status: StateManagerStatus.Pending,
	error: null,
});

export const getDefaultSlices = (): SliceZone => {
	return [];
};

export const getDefaultMessage = (): string => {
	return "";
};
