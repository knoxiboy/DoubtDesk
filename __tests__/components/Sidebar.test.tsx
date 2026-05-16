import React from 'react';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/components/Sidebar';

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(() => '/dashboard'),
}));

describe('Sidebar Component', () => {
    it('renders platform title', () => {
        render(<Sidebar isOpen={true} onClose={jest.fn()} />);
        expect(screen.getByText('DoubtDesk')).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        render(<Sidebar isOpen={true} onClose={jest.fn()} />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Virtual Campus')).toBeInTheDocument();
        expect(screen.getByText('Bookmarks')).toBeInTheDocument();
        expect(screen.getByText('Public Doubts')).toBeInTheDocument();
        expect(screen.getByText('Ask AI Solver')).toBeInTheDocument();
    });
});
