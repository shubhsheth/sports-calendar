import { renderHook, act } from "@testing-library/react";
import { useLocalStorageState } from "./useLocalStorageState";

const KEY = "test-key";

beforeEach(() => {
  localStorage.clear();
});

describe("useLocalStorageState", () => {
  it("returns the default value when localStorage has no entry", () => {
    const { result } = renderHook(() => useLocalStorageState(KEY, 42));
    expect(result.current[0]).toBe(42);
  });

  it("returns the stored value when localStorage has a valid entry", () => {
    localStorage.setItem(KEY, JSON.stringify(99));
    const { result } = renderHook(() => useLocalStorageState(KEY, 0));
    expect(result.current[0]).toBe(99);
  });

  it("falls back to the default value when localStorage contains invalid JSON", () => {
    localStorage.setItem(KEY, "not-valid-json{{{");
    const { result } = renderHook(() => useLocalStorageState(KEY, "default"));
    expect(result.current[0]).toBe("default");
  });

  it("updates state when the setter is called with a value", () => {
    const { result } = renderHook(() => useLocalStorageState(KEY, 0));
    act(() => {
      result.current[1](7);
    });
    expect(result.current[0]).toBe(7);
  });

  it("persists the new value to localStorage when the setter is called", () => {
    const { result } = renderHook(() => useLocalStorageState(KEY, 0));
    act(() => {
      result.current[1](42);
    });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toBe(42);
  });

  it("updates state when the setter is called with a function updater", () => {
    const { result } = renderHook(() => useLocalStorageState(KEY, 10));
    act(() => {
      result.current[1](prev => prev + 5);
    });
    expect(result.current[0]).toBe(15);
  });

  it("persists the function-updater result to localStorage", () => {
    localStorage.setItem(KEY, JSON.stringify(10));
    const { result } = renderHook(() => useLocalStorageState(KEY, 0));
    act(() => {
      result.current[1](prev => prev * 2);
    });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toBe(20);
  });

  it("works with object values", () => {
    const defaultVal = { a: 1, b: "hello" };
    const { result } = renderHook(() => useLocalStorageState(KEY, defaultVal));
    act(() => {
      result.current[1]({ a: 99, b: "world" });
    });
    expect(result.current[0]).toEqual({ a: 99, b: "world" });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      a: 99,
      b: "world",
    });
  });

  it("does not throw when localStorage.setItem throws (e.g. quota exceeded)", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    const { result } = renderHook(() => useLocalStorageState(KEY, 0));
    expect(() => {
      act(() => {
        result.current[1](5);
      });
    }).not.toThrow();
    // In-memory state should still update even if persistence failed
    expect(result.current[0]).toBe(5);

    spy.mockRestore();
  });
});
