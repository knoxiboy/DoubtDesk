import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WhiteboardModal from "@/components/common/WhiteboardModal";

// Mock sonner toast
jest.mock("sonner", () => ({
    toast: {
        success: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe("WhiteboardModal Component", () => {
    const mockOnClose = jest.fn();
    const mockOnSave = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock HTMLCanvasElement.prototype.getContext for jsdom
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
            scale: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            fill: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            ellipse: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            closePath: jest.fn(),
            getImageData: jest.fn().mockReturnValue({
                data: new Uint8ClampedArray(400),
                width: 10,
                height: 10,
            }),
            putImageData: jest.fn(),
            fillText: jest.fn(),
        } as any);

        HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue("data:image/png;base64,mockdrawingdata");
    });

    it("does not render when isOpen is false", () => {
        render(
            <WhiteboardModal
                isOpen={false}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );
        expect(screen.queryByText("Visual Whiteboard")).not.toBeInTheDocument();
    });

    it("renders whiteboard title, toolbar tools, and buttons when isOpen is true", () => {
        render(
            <WhiteboardModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText("Visual Whiteboard")).toBeInTheDocument();
        expect(screen.getByTitle("Pencil / Freehand")).toBeInTheDocument();
        expect(screen.getByTitle("Eraser")).toBeInTheDocument();
        expect(screen.getByTitle("Line")).toBeInTheDocument();
        expect(screen.getByTitle("Arrow")).toBeInTheDocument();
        expect(screen.getByTitle("Rectangle")).toBeInTheDocument();
        expect(screen.getByTitle("Circle")).toBeInTheDocument();
        expect(screen.getByTitle("Text")).toBeInTheDocument();
    });

    it("allows switching tools and grid style", () => {
        render(
            <WhiteboardModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const boxTool = screen.getByTitle("Rectangle");
        fireEvent.click(boxTool);
        expect(boxTool).toHaveClass("bg-blue-600");

        const gridButton = screen.getByTitle("Toggle Canvas Grid");
        expect(gridButton).toHaveTextContent("dots");
        fireEvent.click(gridButton);
        expect(gridButton).toHaveTextContent("grid");
    });

    it("calls onSave with dataUrl when Attach Drawing button is clicked", () => {
        render(
            <WhiteboardModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const saveBtn = screen.getByText("Attach Drawing");
        fireEvent.click(saveBtn);

        expect(mockOnSave).toHaveBeenCalledWith("data:image/png;base64,mockdrawingdata");
        expect(mockOnClose).toHaveBeenCalled();
    });
});
