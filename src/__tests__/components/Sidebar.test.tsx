import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the provider chain that eventually imports react-hotkeys-hook
jest.mock('@/app/provider', () => {
    const mockAppUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'student',
        onboarded: true,
    };

    return {
        __esModule: true,
        Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
        useAppUser: () => ({
            appUser: mockAppUser,
            setAppUser: jest.fn(),
            loading: false,
            refresh: jest.fn(),
        }),
    };
});

jest.mock('next/navigation', () => ({
    usePathname: jest.fn(() => '/dashboard'),
    useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

jest.mock('@clerk/nextjs', () => ({
    ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useUser: () => ({ isSignedIn: true, user: { id: '1' } }),
    useAuth: () => ({ userId: '1', getToken: async () => 'token' }),
}));

jest.mock('@/components/KeyboardShortcutsProvider', () => ({
    useKeyboardShortcuts: () => ({
        toggleOpen: jest.fn(),
        isOpen: false,
        setIsOpen: jest.fn(),
    }),
}));

import Sidebar from '@/components/Sidebar';

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