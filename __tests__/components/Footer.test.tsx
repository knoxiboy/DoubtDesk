import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer Component', () => {
    it('renders platform name and tagline', () => {
        render(<Footer />);
        expect(screen.getByText('DoubtDesk')).toBeInTheDocument();
        expect(screen.getByText('Simplifying classroom doubt solving with AI.')).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        render(<Footer />);
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Virtual Campus')).toBeInTheDocument();
    });

    it('renders current year copyright', () => {
        render(<Footer />);
        const currentYear = new Date().getFullYear();
        expect(screen.getByText(new RegExp(`© ${currentYear} DoubtDesk`))).toBeInTheDocument();
    });
});
