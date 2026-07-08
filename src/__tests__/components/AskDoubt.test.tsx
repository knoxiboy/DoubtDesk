import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AskDoubt from '@/components/classroom/AskDoubt';

describe('AskDoubt Modal Component', () => {
    it('returns null when isOpen is false', () => {
        const { container } = render(
            <AskDoubt isOpen={false} onClose={jest.fn()} onSuccess={jest.fn()} />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders modal content when isOpen is true', () => {
        render(<AskDoubt isOpen={true} defaultSubject="Physics" onClose={jest.fn()} onSuccess={jest.fn()} />);
        expect(screen.getByText('Ask')).toBeInTheDocument();
        expect(screen.getByText('Doubt')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Quantum Mechanics/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Type your question here/i)).toBeInTheDocument();
    });

    it('calls onClose when Cancel button is clicked', () => {
        const onCloseMock = jest.fn();
        render(<AskDoubt isOpen={true} onClose={onCloseMock} onSuccess={jest.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(onCloseMock).toHaveBeenCalled();
    });
});
