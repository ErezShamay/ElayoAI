// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Button from "@/components/ui/Button";

describe("Button", () => {
  it("renders its children and defaults to the primary variant/medium size", () => {
    render(<Button>שמור</Button>);

    const button = screen.getByRole("button", { name: "שמור" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-brand");
    expect(button).toHaveAttribute("type", "button");
  });

  it("applies the requested variant and size classes", () => {
    render(
      <Button variant="danger" size="lg">
        מחק
      </Button>
    );

    const button = screen.getByRole("button", { name: "מחק" });
    expect(button).toHaveClass("bg-red-600");
    expect(button).toHaveClass("px-6");
  });

  it("fires onClick when clicked and respects the disabled attribute", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick} disabled>
        שלח
      </Button>
    );

    const button = screen.getByRole("button", { name: "שלח" });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
