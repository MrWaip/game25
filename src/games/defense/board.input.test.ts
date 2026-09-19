import { expect, test } from "vite-plus/test";
import { sitesFor } from "./board";
import { nearestSite } from "./boardInput";

test("a drop picks the closest site, not the first one it finds", () => {
	const sites = sitesFor(1);
	const between = {
		x: (sites[0].x + sites[1].x) / 2,
		y: (sites[0].y + sites[1].y) / 2,
	};
	expect(nearestSite(sites, sites[1])).toBe(1);
	expect(nearestSite(sites, { x: sites[3].x + 6, y: sites[3].y - 6 })).toBe(3);
	expect(nearestSite(sites, between)).toBe(-1);
	expect(nearestSite(sites, { x: -900, y: -900 })).toBe(-1);
});
