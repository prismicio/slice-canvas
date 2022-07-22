import { it, expect, vi } from "vitest";

import { disableEventHandler } from "../src";

it("prevents default and stops propagation", () => {
	const event = {
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
	};

	disableEventHandler(event as unknown as Event);

	expect(event.preventDefault).toHaveBeenCalledOnce();
	expect(event.stopPropagation).toHaveBeenCalledOnce();
});
