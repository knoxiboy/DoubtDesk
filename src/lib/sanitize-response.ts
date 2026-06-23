// lib/sanitize-response.ts

interface DoubtWithUser {
    id: number;
    authorId?: string | null;
    userEmail?: string | null;
    authorEmail?: string | null;
    authorName?: string | null;
    anonymousHandle?: string | null;
    isAnonymous?: boolean | null;
    [key: string]: any;
}

interface ReplyWithUser {
    id: number;
    authorId?: string | null;
    userEmail?: string | null;
    authorEmail?: string | null;
    authorName?: string | null;
    userName?: string | null;
    displayName?: string | null;
    isAnonymous?: boolean | null;
    [key: string]: any;
}

/**
 * Sanitize a single doubt by removing sensitive fields and adding computed fields
 */
export function sanitizeDoubt(
    doubt: DoubtWithUser | null | undefined,
    currentUserId: string | null
): any {
    if (!doubt) return null;

    // Determine if the current user is the author
    // Use the authorId field for comparison (stored in DB but not exposed)
    const isOwnPost = currentUserId ? doubt.authorId === currentUserId : false;

    // Create a safe copy - EXCLUDE sensitive fields
    const safeDoubt: any = {};

    // Define fields that should NEVER be exposed
    const sensitiveFields = [
        'userEmail',
        'authorEmail',
        'authorId',
        'author_email',
        'email',
        'user_id'
    ];
    
    // Fields that are safe to expose - include all possible public fields
    const safeFields = [
        'id',
        'subject',
        'subTopic',
        'content',
        'imageUrl',
        'classroomId',
        'type',
        'isSolved',
        'isPinned',
        'likes',
        'likeCount',
        'replyCount',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'tags',
        'hasLiked',
        'hasBookmarked',
        'isAnonymous',
        'isResolved',
        'displayName',
        'userName',
        'createdBy',
        'authorName'
    ];

    // Copy only safe fields, skip sensitive ones
    for (const field of safeFields) {
        if (field in doubt && doubt[field] !== undefined) {
            // Skip if this field is sensitive
            if (!sensitiveFields.includes(field)) {
                safeDoubt[field] = doubt[field];
            }
        }
    }

    // Add computed fields
    safeDoubt.isOwnPost = isOwnPost;
    
    // Handle display name - PRESERVE the original displayName if it exists
    if (doubt.displayName) {
        // Always use the provided displayName (could be "Student_A7X" for anonymous)
        safeDoubt.displayName = doubt.displayName;
    } else if (doubt.isAnonymous === true || doubt.userEmail === null) {
        // Only fallback to "Anonymous" if no displayName is provided
        safeDoubt.displayName = "Anonymous";
    } else {
        // For non-anonymous posts without a displayName
        if (doubt.userName) {
            safeDoubt.displayName = doubt.userName;
        } else {
            safeDoubt.displayName = "User";
        }
    }

    // For anonymous posts, remove authorName and userName
    if (doubt.isAnonymous === true) {
        delete safeDoubt.authorName;
        delete safeDoubt.userName;
    }

    // Ensure boolean fields are always present
    safeDoubt.hasLiked = safeDoubt.hasLiked ?? false;
    safeDoubt.hasBookmarked = safeDoubt.hasBookmarked ?? false;
    safeDoubt.isAnonymous = safeDoubt.isAnonymous ?? false;
    safeDoubt.isOwnPost = safeDoubt.isOwnPost ?? false;
    
    // Map likes to likeCount if likeCount doesn't exist but likes does
    if (safeDoubt.likeCount === undefined && safeDoubt.likes !== undefined) {
        safeDoubt.likeCount = safeDoubt.likes;
    }
    
    // Map isSolved to isResolved if isResolved doesn't exist but isSolved does
    if (safeDoubt.isResolved === undefined && safeDoubt.isSolved !== undefined) {
        safeDoubt.isResolved = safeDoubt.isSolved === 'solved';
    }

    // Ensure authorId is NEVER in the response
    delete safeDoubt.authorId;
    delete safeDoubt.userEmail;
    delete safeDoubt.authorEmail;
    delete safeDoubt.author_email;
    delete safeDoubt.email;
    delete safeDoubt.user_id;

    return safeDoubt;
}

/**
 * Sanitize multiple doubts
 */
export function sanitizeDoubts(
    doubts: DoubtWithUser[],
    currentUserId: string | null
): any[] {
    if (!Array.isArray(doubts)) return [];
    return doubts.map(doubt => sanitizeDoubt(doubt, currentUserId));
}

/**
 * Sanitize a single reply
 */
export function sanitizeReply(
    reply: ReplyWithUser | null | undefined,
    currentUserId: string | null
): any {
    if (!reply) return null;

    const isOwnPost = currentUserId ? reply.authorId === currentUserId : false;

    const safeReply: any = {};

    const sensitiveFields = [
        'userEmail',
        'authorEmail',
        'authorId',
        'author_email',
        'email',
        'user_id'
    ];
    
    const safeFields = [
        'id',
        'doubtId',
        'type',
        'content',
        'imageUrl',
        'hasUpvoted',
        'createdAt',
        'updatedAt',
        'isAnonymous',
        'displayName',
        'userName',
        'authorName'
    ];

    for (const field of safeFields) {
        if (field in reply && reply[field] !== undefined) {
            if (!sensitiveFields.includes(field)) {
                safeReply[field] = reply[field];
            }
        }
    }

    safeReply.isOwnPost = isOwnPost;
    
    // Handle display name - PRESERVE the original displayName
    if (reply.displayName) {
        safeReply.displayName = reply.displayName;
    } else if (reply.isAnonymous === true || reply.userEmail === null) {
        safeReply.displayName = "Anonymous";
    } else {
        if (reply.userName) {
            safeReply.displayName = reply.userName;
        } else {
            safeReply.displayName = "User";
        }
    }

    // For anonymous replies, remove authorName and userName
    if (reply.isAnonymous === true) {
        delete safeReply.authorName;
        delete safeReply.userName;
    }

    safeReply.isAnonymous = safeReply.isAnonymous ?? false;
    safeReply.isOwnPost = safeReply.isOwnPost ?? false;

    // Ensure authorId is NEVER in the response
    delete safeReply.authorId;
    delete safeReply.userEmail;
    delete safeReply.authorEmail;
    delete safeReply.author_email;
    delete safeReply.email;
    delete safeReply.user_id;

    return safeReply;
}

/**
 * Sanitize multiple replies
 */
export function sanitizeReplies(
    replies: ReplyWithUser[],
    currentUserId: string | null
): any[] {
    if (!Array.isArray(replies)) return [];
    return replies.map(reply => sanitizeReply(reply, currentUserId));
}