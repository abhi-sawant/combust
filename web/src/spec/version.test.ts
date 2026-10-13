import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import pkg from "../../package.json"

describe("version", () => {
  it("web/package.json matches the repo-root VERSION file", () => {
    const version = readFileSync(resolve(__dirname, "../../../VERSION"), "utf8").trim()
    expect(pkg.version).toBe(version)
  })
})
