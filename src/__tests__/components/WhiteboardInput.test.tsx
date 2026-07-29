import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WhiteboardInput, { convertOcrToLatex } from '@/components/classroom/WhiteboardInput';
import { createWorker } from 'tesseract.js';

// Mock tesseract.js worker
jest.mock('tesseract.js', () => ({
    createWorker: jest.fn(),
}));

describe('convertOcrToLatex helper function', () => {
    it('returns empty string for empty input', () => {
        expect(convertOcrToLatex('')).toBe('');
        expect(convertOcrToLatex('   ')).toBe('');
    });

    it('converts sqrt, integrals, sums, and fractions correctly', () => {
        expect(convertOcrToLatex('sqrt(x)')).toBe('\\sqrt{x}');
        expect(convertOcrToLatex('int x')).toBe('\\int x');
        expect(convertOcrToLatex('sum n')).toBe('\\sum n');
        expect(convertOcrToLatex('a/b')).toBe('\\frac{a}{b}');
    });

    it('converts Greek letters and operators', () => {
        expect(convertOcrToLatex('alpha + beta = pi')).toBe('\\alpha + \\beta = \\pi');
        expect(convertOcrToLatex('a <= b')).toBe('a \\le b');
        expect(convertOcrToLatex('x^2')).toBe('x^{2}');
    });
});

describe('WhiteboardInput Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock HTMLCanvasElement context
        HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
            fillRect: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            closePath: jest.fn(),
            getImageData: jest.fn().mockReturnValue({
                data: new Uint8ClampedArray(4),
                width: 1,
                height: 1
            }),
            putImageData: jest.fn(),
        } as any);
        HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/png;base64,fake');
    });

    it('renders whiteboard canvas and control buttons', () => {
        render(<WhiteboardInput onInsertLatex={jest.fn()} />);

        expect(screen.getByText('Interactive Math Whiteboard')).toBeInTheDocument();
        expect(screen.getByLabelText('Math drawing canvas')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Undo stroke/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Clear canvas/i })).toBeInTheDocument();
        expect(screen.getByText('Convert Drawing to LaTeX')).toBeInTheDocument();
    });

    it('handles mouse and touch drawing actions without crashing', () => {
        render(<WhiteboardInput onInsertLatex={jest.fn()} />);
        const canvas = screen.getByLabelText('Math drawing canvas');

        // Mouse drawing
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 });
        fireEvent.mouseUp(canvas);

        // Touch drawing
        fireEvent.touchStart(canvas, { touches: [{ clientX: 15, clientY: 15 }] });
        fireEvent.touchMove(canvas, { touches: [{ clientX: 25, clientY: 25 }] });
        fireEvent.touchEnd(canvas);

        expect(canvas).toBeInTheDocument();
    });

    it('handles undo and clear operations', () => {
        render(<WhiteboardInput onInsertLatex={jest.fn()} />);
        const canvas = screen.getByLabelText('Math drawing canvas');

        // Start drawing to push history state
        fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
        fireEvent.mouseUp(canvas);

        const undoBtn = screen.getByRole('button', { name: /Undo stroke/i });
        const clearBtn = screen.getByRole('button', { name: /Clear canvas/i });

        expect(undoBtn).not.toBeDisabled();
        fireEvent.click(undoBtn);

        fireEvent.click(clearBtn);
        expect(undoBtn).toBeDisabled();
    });

    it('executes OCR worker and populates LaTeX result without crashing', async () => {
        const mockRecognize = jest.fn().mockResolvedValue({
            data: { text: 'sqrt(x) + int y' }
        });
        const mockTerminate = jest.fn().mockResolvedValue(undefined);
        (createWorker as jest.Mock).mockResolvedValue({
            recognize: mockRecognize,
            terminate: mockTerminate,
        });

        const onInsertMock = jest.fn();
        render(<WhiteboardInput onInsertLatex={onInsertMock} />);

        const convertBtn = screen.getByText('Convert Drawing to LaTeX');
        fireEvent.click(convertBtn);

        await waitFor(() => {
            expect(createWorker).toHaveBeenCalledWith('eng');
            expect(mockRecognize).toHaveBeenCalled();
            expect(screen.getByDisplayValue(/\\sqrt{x} \+ \\int y/i)).toBeInTheDocument();
        });

        const insertBtn = screen.getByText('Insert into Question');
        fireEvent.click(insertBtn);

        expect(onInsertMock).toHaveBeenCalledWith('$$ \\sqrt{x} + \\int y $$');
    });
});
