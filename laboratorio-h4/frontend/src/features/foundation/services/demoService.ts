import { mockDemoRepository } from "../adapters/mockDemoRepository";
import type { DemoRepository } from "./demoRepository";
// Single composition point; an HTTP adapter may be supplied once its provider contract exists.
export const demoService: DemoRepository = mockDemoRepository;
