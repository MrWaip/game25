import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "./eventBus";

type TestEvents = {
	test: string;
	number: number;
	void: void;
	object: { value: number };
};

describe("EventBus", () => {
	let bus: EventBus<TestEvents>;

	beforeEach(() => {
		bus = new EventBus<TestEvents>();
	});

	describe("on и emit", () => {
		it("должен вызывать слушатель при эмите события", () => {
			let received: string | undefined;

			bus.on("test", (payload) => {
				received = payload;
			});

			bus.emit("test", "hello");

			expect(received).toBe("hello");
		});

		it("должен вызывать несколько слушателей для одного события", () => {
			const received: string[] = [];

			bus.on("test", (payload) => {
				received.push(payload + "1");
			});

			bus.on("test", (payload) => {
				received.push(payload + "2");
			});

			bus.emit("test", "hello");

			expect(received).toEqual(["hello1", "hello2"]);
		});

		it("должен обрабатывать разные типы событий", () => {
			let stringValue: string | undefined;
			let numberValue: number | undefined;

			bus.on("test", (payload) => {
				stringValue = payload;
			});

			bus.on("number", (payload) => {
				numberValue = payload;
			});

			bus.emit("test", "hello");
			bus.emit("number", 42);

			expect(stringValue).toBe("hello");
			expect(numberValue).toBe(42);
		});

		it("должен обрабатывать объектные payload", () => {
			let received: { value: number } | undefined;

			bus.on("object", (payload) => {
				received = payload;
			});

			bus.emit("object", { value: 100 });

			expect(received).toEqual({ value: 100 });
		});

		it("не должен падать при эмите события без слушателей", () => {
			expect(() => {
				bus.emit("test", "hello");
			}).not.toThrow();
		});

		it("должен вызывать один слушатель несколько раз", () => {
			const received: string[] = [];

			bus.on("test", (payload) => {
				received.push(payload);
			});

			bus.emit("test", "first");
			bus.emit("test", "second");

			expect(received).toEqual(["first", "second"]);
		});
	});

	describe("onAll", () => {
		it("должен вызывать слушатель для всех событий", () => {
			const received: Array<{ event: keyof TestEvents; payload: unknown }> = [];

			bus.onAll((event, payload) => {
				received.push({ event, payload });
			});

			bus.emit("test", "hello");
			bus.emit("number", 42);
			bus.emit("object", { value: 100 });

			expect(received).toHaveLength(3);
			expect(received[0]).toEqual({ event: "test", payload: "hello" });
			expect(received[1]).toEqual({ event: "number", payload: 42 });
			expect(received[2]).toEqual({ event: "object", payload: { value: 100 } });
		});

		it("должен вызывать onAll слушатель вместе с конкретными слушателями", () => {
			const specificReceived: string[] = [];
			const allReceived: Array<{ event: keyof TestEvents; payload: unknown }> =
				[];

			bus.on("test", (payload) => {
				specificReceived.push(payload);
			});

			bus.onAll((event, payload) => {
				allReceived.push({ event, payload });
			});

			bus.emit("test", "hello");

			expect(specificReceived).toEqual(["hello"]);
			expect(allReceived).toHaveLength(1);
			expect(allReceived[0]).toEqual({ event: "test", payload: "hello" });
		});

		it("должен вызывать несколько onAll слушателей", () => {
			const received1: Array<{ event: keyof TestEvents; payload: unknown }> =
				[];
			const received2: Array<{ event: keyof TestEvents; payload: unknown }> =
				[];

			bus.onAll((event, payload) => {
				received1.push({ event, payload });
			});

			bus.onAll((event, payload) => {
				received2.push({ event, payload });
			});

			bus.emit("test", "hello");

			expect(received1).toHaveLength(1);
			expect(received2).toHaveLength(1);
			expect(received1[0]).toEqual({ event: "test", payload: "hello" });
			expect(received2[0]).toEqual({ event: "test", payload: "hello" });
		});

		it("не должен вызывать onAll слушатель после offAll", () => {
			const received: Array<{ event: keyof TestEvents; payload: unknown }> = [];

			const listener = (event: keyof TestEvents, payload: unknown) => {
				received.push({ event, payload });
			};

			bus.onAll(listener);
			bus.emit("test", "before");

			bus.offAll(listener);
			bus.emit("test", "after");

			expect(received).toHaveLength(1);
			expect(received[0].payload).toBe("before");
		});
	});

	describe("offAll", () => {
		it("должен удалять слушатель из onAll", () => {
			const received: Array<{ event: keyof TestEvents; payload: unknown }> = [];

			const listener = (event: keyof TestEvents, payload: unknown) => {
				received.push({ event, payload });
			};

			bus.onAll(listener);
			bus.offAll(listener);

			bus.emit("test", "hello");

			expect(received).toHaveLength(0);
		});

		it("не должен влиять на другие onAll слушатели", () => {
			const received1: Array<{ event: keyof TestEvents; payload: unknown }> =
				[];
			const received2: Array<{ event: keyof TestEvents; payload: unknown }> =
				[];

			const listener1 = (event: keyof TestEvents, payload: unknown) => {
				received1.push({ event, payload });
			};

			const listener2 = (event: keyof TestEvents, payload: unknown) => {
				received2.push({ event, payload });
			};

			bus.onAll(listener1);
			bus.onAll(listener2);
			bus.offAll(listener1);

			bus.emit("test", "hello");

			expect(received1).toHaveLength(0);
			expect(received2).toHaveLength(1);
		});
	});
});
