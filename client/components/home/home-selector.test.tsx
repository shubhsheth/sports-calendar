import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeSectionToggle, TeamTileGrid } from "./home-selector";
import {
  DEFAULT_HOME_SECTIONS,
  normalizeHomeSections,
} from "./utils/homeSections";

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

describe("normalizeHomeSections", () => {
  it("defaults to Leagues on, Teams off", () => {
    expect(normalizeHomeSections(null)).toEqual(DEFAULT_HOME_SECTIONS);
    expect(normalizeHomeSections("garbage")).toEqual(DEFAULT_HOME_SECTIONS);
    expect(normalizeHomeSections({})).toEqual({ leagues: true, teams: false });
  });

  it("preserves a valid selection, including both on", () => {
    expect(normalizeHomeSections({ leagues: true, teams: true })).toEqual({
      leagues: true,
      teams: true,
    });
    expect(normalizeHomeSections({ leagues: false, teams: true })).toEqual({
      leagues: false,
      teams: true,
    });
  });
});

describe("HomeSectionToggle", () => {
  it("marks each segment by its own state and toggles independently", () => {
    const onToggle = vi.fn();
    render(
      <HomeSectionToggle
        sections={{ leagues: true, teams: false }}
        onToggle={onToggle}
      />
    );
    expect(screen.getByRole("button", { name: "Leagues" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Teams" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "Teams" }));
    expect(onToggle).toHaveBeenCalledWith("teams");
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
  });
});
