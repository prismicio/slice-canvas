import { SliceZone } from "@prismicio/types";
import LibrariesState from "@slicemachine/core/build/src/models/LibrariesState";

import type { StateManager } from "./StateManager";

export enum StateManagerEventType {
	Loaded = "loaded",
	Slices = "slices",
	ActiveSlice = "activeSlice",
}

export type StateManagerEvents = {
	[StateManagerEventType.Loaded]: ManagedState;
	[StateManagerEventType.Slices]: SliceZone;
	[StateManagerEventType.ActiveSlice]: ActiveSlice | null;
};

export const enum StateManagerStatus {
	Pending = "pending",
	Loaded = "loaded",
	Error = "error",
}

export type ManagedState = {
	data: LibrariesState.Libraries | null;
	status: StateManagerStatus;
	error: Error | null;
};

export type ActiveSlice = {
	rect: DOMRect;
	sliceID: string;
	variationID: string;
	index: number;
};

export interface SliceCanvasProps {
	state:
		| (() => Promise<LibrariesState.Libraries>)
		| Promise<LibrariesState.Libraries>
		| LibrariesState.Libraries;
	zIndex?: number;
}

export interface SliceCanvasData {
	stateManager: StateManager;
	managedState: ManagedState;
	slices: SliceZone;
	activeSlice: ActiveSlice | null;
}

export type SliceCanvasOptions = SliceCanvasProps & SliceCanvasData;

export type VariationSummary = {
	name: string;
	id: string;
};

export type SliceSummary = {
	name: string;
	id: string;
	variations: VariationSummary[];
};

export type LibrarySummary = {
	path: string;
	slices: SliceSummary[];
};
