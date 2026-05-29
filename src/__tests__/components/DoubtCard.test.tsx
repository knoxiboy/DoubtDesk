import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DoubtCard from '@/components/DoubtCard';

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
    } as any)
) as jest.Mock;

const mockDoubt = {
    id: 1,
    userName: 'Student_123',
    subject: 'Calculus',
    content: 'How do limits work in infinity?',
    createdAt: new Date().toISOString(),
    likes: 5,
    replyCount: 2,
    isSolved: 'unsolved',
};

describe('DoubtCard Component', () => {
    it('renders doubt details correctly', () => {
        render(<DoubtCard doubt={mockDoubt} />);
        expect(screen.getByText('Student_123')).toBeInTheDocument();
        expect(screen.getByText('Calculus')).toBeInTheDocument();
        expect(screen.getByText('How do limits work in infinity?')).toBeInTheDocument();
    });

    it('handles like action when thumbs up is clicked', async () => {
        render(<DoubtCard doubt={mockDoubt} onUpdate={jest.fn()} />);
        const likeButton = screen.getByRole('button', { name: /5/i });
        fireEvent.click(likeButton);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
