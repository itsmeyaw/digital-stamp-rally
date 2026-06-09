import { expect, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
// Augment vitest's expect with jest-dom matchers for TypeScript
import "@testing-library/jest-dom/vitest";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
