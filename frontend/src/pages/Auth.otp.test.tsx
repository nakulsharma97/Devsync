import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./Auth";

function renderOtp(value = "") {
  const onChange = vi.fn();
  render(<OtpInput value={value} onChange={onChange} />);
  return { onChange, inputs: screen.getAllByRole("textbox") };
}

describe("OtpInput", () => {
  it("focuses the next box after entering a digit", () => {
    const { inputs, onChange } = renderOtp();
    inputs[0].focus();

    fireEvent.change(inputs[0], { target: { value: "4" } });

    expect(onChange).toHaveBeenCalledWith("4");
    expect(document.activeElement).toBe(inputs[1]);
  });

  it("distributes a pasted OTP across all boxes", () => {
    const { inputs, onChange } = renderOtp();
    inputs[0].focus();

    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "12a3456" },
    });

    expect(onChange).toHaveBeenCalledWith("123456");
    expect(document.activeElement).toBe(inputs[5]);
  });

  it("moves back on backspace when the current box is empty", () => {
    const { inputs } = renderOtp("12");
    inputs[2].focus();

    fireEvent.keyDown(inputs[2], { key: "Backspace" });

    expect(document.activeElement).toBe(inputs[1]);
  });

  it("supports arrow navigation and deleting the current digit", () => {
    const { inputs, onChange } = renderOtp("123");
    inputs[1].focus();

    fireEvent.keyDown(inputs[1], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(inputs[0]);

    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: "ArrowRight" });
    expect(document.activeElement).toBe(inputs[2]);

    fireEvent.keyDown(inputs[1], { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith("13");
  });
});
