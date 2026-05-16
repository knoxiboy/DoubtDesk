import { sendWarningEmail, sendBlockEmail } from '@/lib/email';
import { jest } from '@jest/globals';

describe('Email Helper Functions', () => {
    let consoleSpy: jest.SpiedFunction<typeof console.log>;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('should log warning email simulation correctly', async () => {
        await sendWarningEmail('test@example.com', 'Inappropriate language', 2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('To: test@example.com')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Inappropriate language')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('2/3 strikes')
        );
    });

    it('should log block email simulation correctly', async () => {
        await sendBlockEmail('student@college.edu', 7, 2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('To: student@college.edu')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('suspended for 7 days')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('block #2')
        );
    });
});
