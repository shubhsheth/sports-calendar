import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HomeFilters } from "./home-filters";
import { EMPTY_HOME_SELECTION } from "./utils/selectionState";

function renderFilters(
  selection = EMPTY_HOME_SELECTION,
  handlers: Partial<{
    onToggleTeam: (id: string) => void;
    onToggleLeague: (id: string) => void;
    onToggleFormat: (id: string) => void;
  }> = {}
) {
  return render(
    <HomeFilters
      selection={selection}
      onToggleTeam={handlers.onToggleTeam ?? vi.fn()}
      onToggleLeague={handlers.onToggleLeague ?? vi.fn()}
      onToggleFormat={handlers.onToggleFormat ?? vi.fn()}
    />
  );
}

describe("HomeFilters", () => {
  it("renders all 12 teams and 5 leagues, with no format pills when no team is selected", () => {
    renderFilters();
    for (const name of ["India", "Australia", "England", "Afghanistan"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("button", { name: /.+/ }).length
    ).toBeGreaterThanOrEqual(17);
    expect(screen.getByRole("button", { name: "NBA" })).toBeInTheDocument();
    expect(screen.queryByText("Cricket formats")).not.toBeInTheDocument();
  });

  it("reports team toggles and marks selected chips pressed", () => {
    const onToggleTeam = vi.fn();
    renderFilters(
      { ...EMPTY_HOME_SELECTION, teamIds: ["2"] },
      { onToggleTeam }
    );
    fireEvent.click(screen.getByRole("button", { name: "India" }));
    expect(onToggleTeam).toHaveBeenCalledWith("6");
    expect(screen.getByRole("button", { name: "Australia" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "India" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("reports league toggles", () => {
    const onToggleLeague = vi.fn();
    renderFilters(EMPTY_HOME_SELECTION, { onToggleLeague });
    fireEvent.click(screen.getByRole("button", { name: "FIFA World Cup" }));
    expect(onToggleLeague).toHaveBeenCalledWith("fifa");
  });

  it("shows format pills once a team is selected and reports toggles", () => {
    const onToggleFormat = vi.fn();
    renderFilters(
      { ...EMPTY_HOME_SELECTION, teamIds: ["6"], formats: ["test"] },
      { onToggleFormat }
    );
    expect(screen.getByRole("button", { name: "Test" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "ODI" }));
    expect(onToggleFormat).toHaveBeenCalledWith("odi");
  });
});
