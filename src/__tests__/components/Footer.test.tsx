import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer Component', () => {
    it('renders platform name and tagline', () => {
        render(<Footer />);
        expect(screen.getByText('DoubtDesk')).toBeInTheDocument();
        expect(screen.getByText(/Simplifying classroom doubt solving with AI-powered collaboration/)).toBeInTheDocument();
    });

    it('renders navigation links to existing pages', () => {
        render(<Footer />);
        expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
        expect(screen.getByRole('link', { name: 'Virtual Campus' })).toHaveAttribute('href', '/rooms');
        expect(screen.getByRole('link', { name: 'AI Solver' })).toHaveAttribute('href', '/ask-ai');
        expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/dashboard/analytics');
        expect(screen.getByRole('link', { name: 'Public Doubts' })).toHaveAttribute('href', '/public-rooms');
        expect(screen.getByRole('link', { name: 'Bookmarks' })).toHaveAttribute('href', '/bookmarks');
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
        expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms-of-service');
        expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
        expect(screen.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '/faq');
        expect(screen.getByRole('link', { name: 'Contributors' })).toHaveAttribute('href', '/contributors');
        expect(screen.getByRole('link', { name: 'Discussions' })).toHaveAttribute('href', '/discussions');
    });

    it('does not render links for unimplemented standalone pages', () => {
        render(<Footer />);
        expect(screen.queryByRole('link', { name: 'Help Center' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Leaderboard' })).not.toBeInTheDocument();
    });

    it('uses a working contact destination instead of a missing contact page', () => {
        render(<Footer />);
        expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', 'mailto:karankmt.tripathi@gmail.com');
    });

    it('renders current year copyright', () => {
        render(<Footer />);
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`\\u00A9 ${currentYear} DoubtDesk`))).toBeInTheDocument();
    });
});
