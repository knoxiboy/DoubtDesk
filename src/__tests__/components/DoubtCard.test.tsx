import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@clerk/nextjs', () => ({
    useUser: () => ({ isSignedIn: true, user: { id: '1' } }),
}));

jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: jest.fn(() => null),
    }),
}));

import DoubtCard from '@/components/classroom/DoubtCard';

global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
    } as any)
) as jest.Mock;

global.EventSource = jest.fn(() => ({
    onmessage: null,
    onerror: null,
    close: jest.fn(),
})) as unknown as typeof EventSource;

const mockDoubt = {
    id: 1,
    author: 'Student_7F3Q2',
    authorInitial: '7',
    isOwnPost: false,
    subject: 'Calculus',
    content: 'How do limits work in infinity?',
    createdAt: new Date().toISOString(),
    likes: 5,
    replyCount: 2,
    tags: [],
    hasBookmarked: false,
    hasLiked: false,
    imageUrl: null,
    classroomId: null,
    isPendingSync: false,
    meTooCount: 0,
    isSolved: 'unsolved' as const,
    type: 'community' as const,
    isPinned: false,
};

describe('DoubtCard Component', () => {
    it('renders doubt details correctly', () => {
        render(<DoubtCard doubt={mockDoubt} />);
        // The card shows the anonymized handle, never the author's email.
        expect(screen.getByText('Student_7F3Q2')).toBeInTheDocument();
        expect(screen.getByText('Calculus')).toBeInTheDocument();
        expect(screen.getByText('How do limits work in infinity?')).toBeInTheDocument();
    });

    it('handles like action when thumbs up is clicked', async () => {
        render(<DoubtCard doubt={mockDoubt} onUpdate={jest.fn()} />);
        const likeButton = screen.getByRole('button', { name: /like this doubt/i });
        fireEvent.click(likeButton);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    it('does not show "View Official Solution" when solved but no official solution reply exists', () => {
        render(<DoubtCard doubt={{ ...mockDoubt, isSolved: 'solved' as const, solvedReplyId: null }} />);
        expect(screen.getByText('Solved')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /view official solution/i })).not.toBeInTheDocument();
    });

    it('shows "View Official Solution" when solved and an official solution reply exists', () => {
        render(<DoubtCard doubt={{ ...mockDoubt, isSolved: 'solved' as const, solvedReplyId: 42 }} />);
        expect(screen.getByRole('button', { name: /view official solution/i })).toBeInTheDocument();
    });
});
