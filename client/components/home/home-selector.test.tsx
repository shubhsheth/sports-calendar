import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeTabSelector, TeamTileGrid } from "./home-selector";
import { normalizeHomeTab } from "./utils/homeTab";

// TeamTileGrid links need no real router for a component test.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to
      )}
      {...rest}
    >
      {children}
    </a>
  ),
}));

describe("normalizeHomeTab", () => {
  it("defaults anything unknown to leagues", () => {
    expect(normalizeHomeTab("teams")).toBe("teams");
    expect(normalizeHomeTab("leagues")).toBe("leagues");
    expect(normalizeHomeTab("garbage")).toBe("leagues");
    expect(normalizeHomeTab(null)).toBe("leagues");
  });
});

describe("HomeTabSelector", () => {
  it("marks the active tab and reports switches", () => {
    const onTabChange = vi.fn();
    render(<HomeTabSelector tab="leagues" onTabChange={onTabChange} />);
    expect(screen.getByRole("button", { name: "Leagues" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Teams" }));
    expect(onTabChange).toHaveBeenCalledWith("teams");
  });
});

describe("TeamTileGrid", () => {
  it("renders all 12 team tiles linking to their team pages", () => {
    render(<TeamTileGrid />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(12);
    expect(screen.getByRole("link", { name: /India/ })).toHaveAttribute(
      "href",
      "/cricket-teams/6"
    );
    expect(screen.getByRole("link", { name: /Australia/ })).toHaveAttribute(
      "href",
      "/cricket-teams/2"
    );
  });
});
