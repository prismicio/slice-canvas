import { expectType, TypeOf } from "ts-expect";

import { Libraries } from "@slicemachine/core/build/models/LibrariesState";

import { LibrariesStateLike } from "../src/types";

// Native TypeScript type (easier to read than io-ts's)
export type LibrariesStateLikeNative = Record<
	string,
	{
		name?: string;
		components: Record<
			string,
			{
				id: string;
				name?: string;
				model: {
					id: string;
					name?: string;
					variations: {
						id: string;
						name?: string;
					}[];
				};
				mocks: Record<
					string,
					{
						variation: string;
					}
				>;
			}
		>;
	}
>;

/**
 * io-ts type is compatible native type
 */
expectType<TypeOf<LibrariesStateLike, LibrariesStateLikeNative>>(true);

/**
 * io-ts type is compatible core type
 */
expectType<TypeOf<LibrariesStateLike, Libraries>>(true);

/**
 * Native type is compatible io-ts type
 */
expectType<TypeOf<LibrariesStateLikeNative, LibrariesStateLike>>(true);

/**
 * Native type is compatible core type
 */
expectType<TypeOf<LibrariesStateLikeNative, Libraries>>(true);
