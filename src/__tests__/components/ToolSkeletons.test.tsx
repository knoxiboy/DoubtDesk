import React from 'react';
import { render } from '@testing-library/react';
import { RoadmapSkeleton, ResumeAnalysisSkeleton, CoverLetterSkeleton } from '@/components/ToolSkeletons';

describe('ToolSkeletons Components', () => {
    it('renders RoadmapSkeleton correctly', () => {
        const { container } = render(<RoadmapSkeleton />);
        expect(container.firstChild).toHaveClass('space-y-12');
    });

    it('renders ResumeAnalysisSkeleton correctly', () => {
        const { container } = render(<ResumeAnalysisSkeleton />);
        expect(container.firstChild).toHaveClass('grid');
    });

    it('renders CoverLetterSkeleton correctly', () => {
        const { container } = render(<CoverLetterSkeleton />);
        expect(container.firstChild).toHaveClass('bg-zinc-50');
    });
});
