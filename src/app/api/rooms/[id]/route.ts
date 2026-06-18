import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, doubtsTable, bookmarksTable, likesTable, doubtTagsTable, tagsTable, repliesTable, membershipsTable } from '@/configs/schema';
import { eq, and, isNull, desc, SQL, sql, count, getTableColumns, inArray, or, ilike, not } from 'drizzle-orm'; // Added 'not' here
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse, errorResponse } from '@/lib/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
    requireTeacher,
    canTeach,
} from '@/lib/auth/membership-guard';
import { currentUser } from '@clerk/nextjs/server';
import { sanitizeDoubts } from '@/lib/sanitize-response';
import { parsePositiveInt } from '@/lib/utils';
import { buildRankOrder } from '@/lib/search';

// ... rest of the file remains the same